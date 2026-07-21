import { Horizon, TransactionBuilder, Operation, Asset, Networks, BASE_FEE, StrKey } from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

export interface StellarPaymentResult {
  success: boolean;
  hash: string;
  ledger?: number;
  timestamp: string;
  error?: string;
}

const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

/**
 * Real On-Chain Stellar Payment Engine
 * Builds XLM payment operations, requests Freighter user signature,
 * and submits signed transactions directly to Stellar Horizon Testnet.
 */
export async function executeStellarPayment(
  senderPublicKey: string,
  destinationPublicKey: string,
  amountXLM: number
): Promise<StellarPaymentResult> {
  if (!senderPublicKey || !destinationPublicKey) {
    throw new Error("Missing sender or destination Stellar public key.");
  }

  if (amountXLM <= 0) {
    throw new Error("Payment amount must be greater than 0 XLM.");
  }

  // Ensure keys are clean uppercase base32 Ed25519 public keys required by Stellar SDK
  const cleanSenderKey = senderPublicKey.trim().toUpperCase();
  const cleanDestinationKey = destinationPublicKey.trim().toUpperCase();

  if (!StrKey.isValidEd25519PublicKey(cleanSenderKey)) {
    throw new Error(`Invalid sender Stellar wallet address (${senderPublicKey}). Must be a valid public key starting with 'G'.`);
  }

  if (!StrKey.isValidEd25519PublicKey(cleanDestinationKey)) {
    throw new Error(`Invalid creditor Stellar wallet address (${destinationPublicKey}). Must be a valid public key starting with 'G'.`);
  }

  try {
    const server = new Horizon.Server(HORIZON_TESTNET_URL);

    // 1. Ensure sender account exists on Horizon Testnet (auto-fund via Friendbot if missing)
    let account;
    try {
      account = await server.loadAccount(cleanSenderKey);
    } catch (err: unknown) {
      console.log(`Sender account ${cleanSenderKey.slice(0, 6)}... not found on Testnet. Funding via Friendbot...`, err);
      try {
        const fbRes = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(cleanSenderKey)}`);
        if (fbRes.ok) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          account = await server.loadAccount(cleanSenderKey);
        } else {
          throw new Error(`Friendbot returned status ${fbRes.status}`);
        }
      } catch (fbErr: unknown) {
        throw new Error(
          `Sender account (${cleanSenderKey.slice(0, 6)}...) is not funded on Stellar Testnet. Please fund it using Friendbot.`
        );
      }
    }

    // 1b. Check if sender native XLM balance is sufficient to cover payment + reserve. Top up via Friendbot if underfunded!
    const nativeBalObj = account.balances.find((b: { asset_type?: string }) => b.asset_type === "native");
    const currentXlm = nativeBalObj ? parseFloat(nativeBalObj.balance) : 0;
    if (currentXlm < amountXLM + 2.0) {
      console.log(`Sender XLM balance (${currentXlm} XLM) is underfunded for ${amountXLM} XLM payment. Topping up via Friendbot...`);
      try {
        const fbRes = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(cleanSenderKey)}`);
        if (fbRes.ok) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          account = await server.loadAccount(cleanSenderKey);
        }
      } catch (fbErr) {
        console.warn("Friendbot refill warning:", fbErr);
      }
    }

    // 1b. Check if destination account exists on Horizon Testnet
    let isDestinationExisting = false;
    try {
      await server.loadAccount(cleanDestinationKey);
      isDestinationExisting = true;
    } catch {
      isDestinationExisting = false;
      console.log(`Destination account ${cleanDestinationKey.slice(0, 6)}... not found. Attempting Friendbot pre-funding...`);
      try {
        const fbRes = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(cleanDestinationKey)}`);
        if (fbRes.ok) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          isDestinationExisting = true;
        }
      } catch (fbErr) {
        console.warn("Destination friendbot pre-funding notice:", fbErr);
      }
    }

    // 2. Build Stellar payment transaction (Use Operation.payment if destination exists, else Operation.createAccount)
    const op = isDestinationExisting
      ? Operation.payment({
          destination: cleanDestinationKey,
          asset: Asset.native(),
          amount: amountXLM.toFixed(7),
        })
      : Operation.createAccount({
          destination: cleanDestinationKey,
          startingBalance: amountXLM.toFixed(7),
        });

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(180) // 180 seconds transaction deadline
      .build();

    const unsignedXdr = transaction.toXDR();

    // 3. Request Freighter user signature
    const signResponse = await signTransaction(unsignedXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    if (!signResponse) {
      throw new Error("User rejected transaction signature in Freighter.");
    }

    let signedXdrStr: string | null = null;
    if (typeof signResponse === "string") {
      signedXdrStr = signResponse;
    } else if (typeof signResponse === "object") {
      const respObj = signResponse as Record<string, unknown>;
      if (respObj.error) {
        throw new Error(String(respObj.error));
      }
      signedXdrStr = (respObj.signedTxXdr || respObj.signedTransaction || respObj.xdr) as string;
    }

    if (!signedXdrStr) {
      throw new Error("No signed transaction XDR returned from Freighter.");
    }

    // 4. Reconstruct transaction & submit to Stellar Horizon Testnet
    const signedTx = TransactionBuilder.fromXDR(signedXdrStr, NETWORK_PASSPHRASE);
    const horizonResult = await server.submitTransaction(signedTx);

    if (!horizonResult.successful && !horizonResult.hash) {
      throw new Error("Horizon failed to process transaction.");
    }

    return {
      success: true,
      hash: horizonResult.hash,
      ledger: horizonResult.ledger,
      timestamp: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const errorObj = err as {
      response?: {
        status?: number;
        data?: {
          title?: string;
          detail?: string;
          extras?: { result_codes?: { transaction?: string; operations?: string[] } };
        };
      };
      message?: string;
    };

    // Extract detailed Horizon error codes if available
    const resultCode = errorObj?.response?.data?.extras?.result_codes?.transaction;
    const opCodes = errorObj?.response?.data?.extras?.result_codes?.operations?.join(", ");
    const detailMsg = errorObj?.response?.data?.detail;

    let userMsg = errorObj?.message || "Failed to execute Stellar Testnet payment.";
    if (resultCode) {
      userMsg = `Stellar Transaction Failed: ${resultCode}${opCodes ? ` (${opCodes})` : ""}`;
    } else if (detailMsg) {
      userMsg = `Horizon Error: ${detailMsg}`;
    }

    console.warn("Stellar Payment Execution Result:", userMsg);

    return {
      success: false,
      hash: "",
      timestamp: new Date().toISOString(),
      error: userMsg,
    };
  }
}

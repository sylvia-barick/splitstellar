import {
  rpc,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  xdr,
  scValToNative,
  nativeToScVal,
  StrKey,
} from "@stellar/stellar-sdk";
import { signTransaction, getAddress } from "@stellar/freighter-api";

export const SOROBAN_RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;

// Contract Addresses deployed on Stellar Testnet (configurable via env)
export const CONTRACT_IDS = {
  GROUP: process.env.NEXT_PUBLIC_GROUP_CONTRACT_ID || "CDCTCARPCGDJURGQGXAS3MWQMEOYDSW2NFACWXPB2RQA6473NO6MXYPD",
  EXPENSE: process.env.NEXT_PUBLIC_EXPENSE_CONTRACT_ID || "CCFKZY7P5Q6SQ453WFVNDR5IPWYTYVQIPYW64XMVQ6FLILLNWAHYAGIR",
  SETTLEMENT: process.env.NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID || "CC75FXYJOTQXXOZ6Z647ARSO2AJZZULHWFJX7VB2BEFF4GRHUIHISMEJ",
  MONEY_REQUEST: process.env.NEXT_PUBLIC_MONEY_REQUEST_CONTRACT_ID || "CDQZVM7QMWCCS6AAXPT5PIWQB7BM73LCEGLK6SP377ZSMCQNAQFETX7C",
  ACTIVITY: process.env.NEXT_PUBLIC_ACTIVITY_CONTRACT_ID || "CDOPXKRGOP2WN4M7BD7YDSM2K2YZ4ZDNP7L6PIALFEAMJOOE3KYXE6VS",
};

export const sorobanServer = new rpc.Server(SOROBAN_RPC_URL);

/**
 * Validates if a string is a valid Stellar Ed25519 public key.
 */
export function isValidAddress(addr?: string): boolean {
  if (!addr || typeof addr !== "string") return false;
  return StrKey.isValidEd25519PublicKey(addr.trim().toUpperCase());
}

/**
 * Safely resolves an address, auto-retrieving from Freighter if missing/invalid.
 */
export async function resolveAddress(addr?: string): Promise<string | null> {
  if (isValidAddress(addr)) return addr!.trim().toUpperCase();
  try {
    const freighterRes = await getAddress();
    if (freighterRes && freighterRes.address && isValidAddress(freighterRes.address)) {
      return freighterRes.address.trim().toUpperCase();
    }
  } catch {
    // Ignore error
  }
  return null;
}

/**
 * Converts a wallet address string into a Soroban ScVal Address safely.
 */
export function toScAddress(addr: string): xdr.ScVal {
  if (!isValidAddress(addr)) {
    throw new Error(`Invalid Stellar wallet address provided: "${addr}"`);
  }
  return new Address(addr.trim().toUpperCase()).toScVal();
}

/**
 * Invokes a Soroban smart contract state modification via Freighter signature.
 */
export async function invokeContractTransaction(
  contractId: string,
  methodName: string,
  params: xdr.ScVal[],
  signerPublicKey: string
): Promise<{ success: boolean; hash: string; result?: unknown; ledger?: number }> {
  const activeSigner = await resolveAddress(signerPublicKey);
  if (!activeSigner) {
    console.warn(`Wallet connection required to invoke ${methodName} on Soroban contract.`);
    return { success: false, hash: "" };
  }

  const account = await sorobanServer.getAccount(activeSigner);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(methodName, ...params))
    .setTimeout(180)
    .build();

  // Prepare / simulate transaction on Soroban RPC to resolve fees & footprints
  const preparedTx = await sorobanServer.prepareTransaction(tx);
  const unsignedXdr = preparedTx.toXDR();

  // Request Freighter wallet signature
  const signResponse = await signTransaction(unsignedXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (!signResponse) {
    throw new Error("Transaction signature rejected by user in Freighter.");
  }

  let signedXdrStr: string | null = null;
  if (typeof signResponse === "string") {
    signedXdrStr = signResponse;
  } else if (typeof signResponse === "object") {
    const respObj = signResponse as Record<string, unknown>;
    if (respObj.error) throw new Error(String(respObj.error));
    signedXdrStr = (respObj.signedTxXdr || respObj.signedTransaction || respObj.xdr) as string;
  }

  if (!signedXdrStr) {
    throw new Error("No signed transaction XDR returned from Freighter.");
  }

  // Submit signed transaction to Stellar Soroban RPC
  const sendRes = await sorobanServer.sendTransaction(
    TransactionBuilder.fromXDR(signedXdrStr, NETWORK_PASSPHRASE)
  );

  if (sendRes.status === "ERROR") {
    const errorMsg = "errorResult" in sendRes ? String(sendRes.errorResult) : "Unknown error";
    throw new Error(`Soroban transaction submission failed: ${errorMsg}`);
  }

  // Poll status until SUCCESS
  let getRes = await sorobanServer.getTransaction(sendRes.hash);
  let attempts = 0;
  while (getRes.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 25) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getRes = await sorobanServer.getTransaction(sendRes.hash);
    attempts++;
  }

  if (getRes.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    const nativeVal = getRes.returnValue ? scValToNative(getRes.returnValue) : null;
    return {
      success: true,
      hash: sendRes.hash,
      ledger: getRes.ledger,
      result: nativeVal,
    };
  }

  return {
    success: false,
    hash: sendRes.hash,
  };
}

export { Address, scValToNative, nativeToScVal, xdr, StrKey };

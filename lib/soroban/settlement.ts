import { Payment } from "@/types/payment";
import {
  invokeContractTransaction,
  CONTRACT_IDS,
  toScAddress,
  resolveAddress,
  isValidAddress,
  xdr,
  sorobanServer,
  scValToNative,
  nativeToScVal,
} from "./contract";
import { Contract, rpc } from "@stellar/stellar-sdk";

export async function recordPaymentOnChain(
  paymentData: {
    groupId: string;
    from: string;
    to: string;
    amount: number;
    currency: string;
    note?: string;
    transactionHash?: string;
    ledgerNumber?: number;
    settlementId?: string;
    requestId?: string;
  },
  callerWallet?: string
): Promise<Payment> {
  const activeCaller = await resolveAddress(callerWallet || paymentData.from);
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  if (activeCaller && isValidAddress(paymentData.from) && isValidAddress(paymentData.to)) {
    const params = [
      toScAddress(activeCaller),
      xdr.ScVal.scvString(paymentId),
      xdr.ScVal.scvString(paymentData.groupId),
      toScAddress(paymentData.from),
      toScAddress(paymentData.to),
      nativeToScVal(BigInt(Math.round(paymentData.amount * 100)), { type: "i128" }),
      xdr.ScVal.scvString(paymentData.currency),
      xdr.ScVal.scvString(paymentData.transactionHash || ""),
      xdr.ScVal.scvU32(paymentData.ledgerNumber || 0),
    ];

    try {
      await invokeContractTransaction(
        CONTRACT_IDS.SETTLEMENT,
        "record_payment",
        params,
        activeCaller
      );
    } catch (err) {
      console.warn("Soroban record_payment notice:", err);
    }
  }

  return {
    id: paymentId,
    groupId: paymentData.groupId,
    from: paymentData.from,
    to: paymentData.to,
    amount: paymentData.amount,
    currency: paymentData.currency,
    status: "Completed",
    createdAt: now,
    updatedAt: now,
    note: paymentData.note,
    transactionHash: paymentData.transactionHash,
    ledgerNumber: paymentData.ledgerNumber,
    settlementId: paymentData.settlementId,
    requestId: paymentData.requestId,
  };
}

export async function fetchGroupSettlementsOnChain(groupId: string): Promise<Payment[]> {
  try {
    const contract = new Contract(CONTRACT_IDS.SETTLEMENT);
    const simRes = await sorobanServer.simulateTransaction({
      operations: [
        contract.call("get_group_settlements", xdr.ScVal.scvString(groupId)),
      ],
    } as unknown as Parameters<typeof sorobanServer.simulateTransaction>[0]);

    if (rpc.Api.isSimulationSuccess(simRes) && simRes.result) {
      const rawNative = scValToNative(simRes.result.retval);
      if (Array.isArray(rawNative)) {
        return rawNative.map((p: Record<string, unknown>) => ({
          id: String(p.id || ""),
          groupId: String(p.group_id || groupId),
          from: String(p.from || ""),
          to: String(p.to || ""),
          amount: typeof p.amount === "number" ? p.amount / 100 : Number(p.amount || 0) / 100,
          currency: String(p.currency || "XLM"),
          status: p.status === "Completed" ? "Completed" : "Paid",
          createdAt: typeof p.timestamp === "number" ? new Date(p.timestamp * 1000).toISOString() : new Date().toISOString(),
          updatedAt: typeof p.timestamp === "number" ? new Date(p.timestamp * 1000).toISOString() : new Date().toISOString(),
          note: String(p.note || ""),
          transactionHash: String(p.transaction_hash || ""),
          ledgerNumber: Number(p.ledger_number || 0),
          settlementId: String(p.settlement_id || ""),
          requestId: String(p.request_id || ""),
        }));
      }
    }
  } catch (err) {
    console.warn("Soroban get_group_settlements simulate fallback:", err);
  }

  return [];
}

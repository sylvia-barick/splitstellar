import { MoneyRequest, RequestType } from "@/types/payment";
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

export async function createMoneyRequestOnChain(
  groupId: string,
  from: string,
  to: string,
  amount: number,
  currency: string,
  note: string | undefined,
  type: RequestType,
  callerWallet?: string
): Promise<MoneyRequest> {
  const activeCaller = await resolveAddress(callerWallet || from);
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  if (activeCaller && isValidAddress(from) && isValidAddress(to)) {
    const params = [
      toScAddress(activeCaller),
      xdr.ScVal.scvString(requestId),
      xdr.ScVal.scvString(groupId),
      toScAddress(from),
      toScAddress(to),
      nativeToScVal(BigInt(Math.round(amount * 100)), { type: "i128" }),
      xdr.ScVal.scvString(currency),
      xdr.ScVal.scvString(note || ""),
      xdr.ScVal.scvSymbol(type === "DirectLoan" ? "DirectLoan" : "Request"),
    ];

    try {
      await invokeContractTransaction(
        CONTRACT_IDS.MONEY_REQUEST,
        "create_request",
        params,
        activeCaller
      );
    } catch (err) {
      console.warn("Soroban create_request notice:", err);
    }
  }

  return {
    id: requestId,
    groupId,
    from,
    to,
    amount,
    currency,
    note,
    type,
    status: "Pending",
    createdAt: now,
    updatedAt: now,
  };
}

export async function acceptMoneyRequestOnChain(
  requestId: string,
  callerWallet?: string
): Promise<void> {
  const activeCaller = await resolveAddress(callerWallet);
  if (!activeCaller) return;

  const params = [
    toScAddress(activeCaller),
    xdr.ScVal.scvString(requestId),
  ];

  try {
    await invokeContractTransaction(
      CONTRACT_IDS.MONEY_REQUEST,
      "accept_request",
      params,
      activeCaller
    );
  } catch (err) {
    console.warn("Soroban accept_request notice:", err);
  }
}

export async function rejectMoneyRequestOnChain(
  requestId: string,
  callerWallet?: string
): Promise<void> {
  const activeCaller = await resolveAddress(callerWallet);
  if (!activeCaller) return;

  const params = [
    toScAddress(activeCaller),
    xdr.ScVal.scvString(requestId),
  ];

  try {
    await invokeContractTransaction(
      CONTRACT_IDS.MONEY_REQUEST,
      "reject_request",
      params,
      activeCaller
    );
  } catch (err) {
    console.warn("Soroban reject_request notice:", err);
  }
}

export async function markMoneyRequestPaidOnChain(
  requestId: string,
  transactionHash: string,
  ledgerNumber: number | undefined,
  callerWallet?: string
): Promise<void> {
  const activeCaller = await resolveAddress(callerWallet);
  if (!activeCaller) return;

  const params = [
    toScAddress(activeCaller),
    xdr.ScVal.scvString(requestId),
    xdr.ScVal.scvString(transactionHash),
    xdr.ScVal.scvU32(ledgerNumber || 0),
  ];

  try {
    await invokeContractTransaction(
      CONTRACT_IDS.MONEY_REQUEST,
      "mark_request_paid",
      params,
      activeCaller
    );
  } catch (err) {
    console.warn("Soroban mark_request_paid notice:", err);
  }
}

export async function fetchGroupMoneyRequestsOnChain(groupId: string): Promise<MoneyRequest[]> {
  try {
    const contract = new Contract(CONTRACT_IDS.MONEY_REQUEST);
    const simRes = await sorobanServer.simulateTransaction({
      operations: [
        contract.call("get_group_requests", xdr.ScVal.scvString(groupId)),
      ],
    } as unknown as Parameters<typeof sorobanServer.simulateTransaction>[0]);

    if (rpc.Api.isSimulationSuccess(simRes) && simRes.result) {
      const rawNative = scValToNative(simRes.result.retval);
      if (Array.isArray(rawNative)) {
        return rawNative.map((r: Record<string, unknown>) => ({
          id: String(r.id || ""),
          groupId: String(r.group_id || groupId),
          from: String(r.from || ""),
          to: String(r.to || ""),
          amount: typeof r.amount === "number" ? r.amount / 100 : Number(r.amount || 0) / 100,
          currency: String(r.currency || "XLM"),
          note: String(r.note || ""),
          type: (r.request_type || "Request") as RequestType,
          status: (r.status || "Pending") as MoneyRequest["status"],
          createdAt: typeof r.created_at === "number" ? new Date(r.created_at * 1000).toISOString() : new Date().toISOString(),
          updatedAt: typeof r.updated_at === "number" ? new Date(r.updated_at * 1000).toISOString() : new Date().toISOString(),
          transactionHash: String(r.transaction_hash || ""),
          ledgerNumber: Number(r.ledger_number || 0),
          returnTxHash: String(r.return_tx_hash || ""),
        }));
      }
    }
  } catch (err) {
    console.warn("Soroban get_group_requests simulate fallback:", err);
  }

  return [];
}

import { Expense, SplitType } from "@/types/expense";
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

export async function addExpenseOnChain(
  expenseData: Omit<Expense, "id" | "createdAt" | "updatedAt">,
  callerWallet?: string
): Promise<Expense> {
  const activeCaller = await resolveAddress(callerWallet || expenseData.paidBy);
  const expenseId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  if (activeCaller && isValidAddress(expenseData.paidBy)) {
    const scParticipants = expenseData.participants
      .filter((p) => isValidAddress(p.walletAddress))
      .map((p) => {
        return xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("wallet_address"),
            val: toScAddress(p.walletAddress),
          }),
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("name"),
            val: xdr.ScVal.scvString(p.memberName || "Member"),
          }),
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("share_amount"),
            val: nativeToScVal(BigInt(Math.round(p.shareAmount * 100)), { type: "i128" }),
          }),
        ]);
      });

    const params = [
      toScAddress(activeCaller),
      xdr.ScVal.scvString(expenseId),
      xdr.ScVal.scvString(expenseData.groupId),
      xdr.ScVal.scvString(expenseData.title),
      nativeToScVal(BigInt(Math.round(expenseData.amount * 100)), { type: "i128" }),
      xdr.ScVal.scvString(expenseData.currency),
      toScAddress(expenseData.paidBy),
      xdr.ScVal.scvString(expenseData.category),
      xdr.ScVal.scvSymbol(expenseData.splitType || "Equal"),
      xdr.ScVal.scvVec(scParticipants),
    ];

    try {
      await invokeContractTransaction(
        CONTRACT_IDS.EXPENSE,
        "add_expense",
        params,
        activeCaller
      );
    } catch (err) {
      console.warn("Soroban add_expense on-chain notice:", err);
    }
  }

  return {
    ...expenseData,
    id: expenseId,
    createdAt: now,
    updatedAt: now,
  };
}

export async function editExpenseOnChain(
  expenseId: string,
  expenseData: Partial<Omit<Expense, "id" | "groupId" | "createdAt">>,
  callerWallet?: string
): Promise<void> {
  const activeCaller = await resolveAddress(callerWallet || expenseData.paidBy);
  if (!activeCaller) return;

  const scParticipants = (expenseData.participants || [])
    .filter((p) => isValidAddress(p.walletAddress))
    .map((p) => {
      return xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("wallet_address"),
          val: toScAddress(p.walletAddress),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("name"),
          val: xdr.ScVal.scvString(p.memberName || "Member"),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("share_amount"),
          val: nativeToScVal(BigInt(Math.round(p.shareAmount * 100)), { type: "i128" }),
        }),
      ]);
    });

  const params = [
    toScAddress(activeCaller),
    xdr.ScVal.scvString(expenseId),
    xdr.ScVal.scvString(expenseData.title || ""),
    nativeToScVal(BigInt(Math.round((expenseData.amount || 0) * 100)), { type: "i128" }),
    xdr.ScVal.scvString(expenseData.category || "Others"),
    xdr.ScVal.scvSymbol(expenseData.splitType || "Equal"),
    xdr.ScVal.scvVec(scParticipants),
  ];

  try {
    await invokeContractTransaction(
      CONTRACT_IDS.EXPENSE,
      "edit_expense",
      params,
      activeCaller
    );
  } catch (err) {
    console.warn("Soroban edit_expense notice:", err);
  }
}

export async function deleteExpenseOnChain(
  expenseId: string,
  callerWallet?: string
): Promise<void> {
  const activeCaller = await resolveAddress(callerWallet);
  if (!activeCaller) return;

  const params = [
    toScAddress(activeCaller),
    xdr.ScVal.scvString(expenseId),
  ];

  try {
    await invokeContractTransaction(
      CONTRACT_IDS.EXPENSE,
      "delete_expense",
      params,
      activeCaller
    );
  } catch (err) {
    console.warn("Soroban delete_expense notice:", err);
  }
}

export async function fetchGroupExpensesOnChain(groupId: string): Promise<Expense[]> {
  try {
    const contract = new Contract(CONTRACT_IDS.EXPENSE);
    const simRes = await sorobanServer.simulateTransaction({
      operations: [
        contract.call("get_group_expenses", xdr.ScVal.scvString(groupId)),
      ],
    } as unknown as Parameters<typeof sorobanServer.simulateTransaction>[0]);

    if (rpc.Api.isSimulationSuccess(simRes) && simRes.result) {
      const rawNative = scValToNative(simRes.result.retval);
      if (Array.isArray(rawNative)) {
        return rawNative.map((exp: Record<string, unknown>) => ({
          id: String(exp.id || ""),
          groupId: String(exp.group_id || groupId),
          title: String(exp.title || ""),
          description: String(exp.description || ""),
          amount: typeof exp.amount === "number" ? exp.amount / 100 : Number(exp.amount || 0) / 100,
          currency: String(exp.currency || "XLM"),
          paidBy: String(exp.paid_by || ""),
          category: String(exp.category || "Others") as Expense["category"],
          splitType: (exp.split_type || "Equal") as SplitType,
          createdAt: typeof exp.created_at === "number" ? new Date(exp.created_at * 1000).toISOString() : new Date().toISOString(),
          updatedAt: typeof exp.updated_at === "number" ? new Date(exp.updated_at * 1000).toISOString() : new Date().toISOString(),
          participants: Array.isArray(exp.participants)
            ? exp.participants.map((p: Record<string, unknown>) => ({
                walletAddress: String(p.wallet_address || ""),
                memberName: String(p.name || "Member"),
                shareAmount: typeof p.share_amount === "number" ? p.share_amount / 100 : Number(p.share_amount || 0) / 100,
                sharePercentage: 0,
                isPaid: false,
              }))
            : [],
        }));
      }
    }
  } catch (err) {
    console.warn("Soroban get_group_expenses simulate fallback:", err);
  }

  return [];
}

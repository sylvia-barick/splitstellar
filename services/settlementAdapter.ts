import { executeStellarPayment, StellarPaymentResult } from "./stellarSettlementService";

export interface SettlementParams {
  senderWallet: string;
  receiverWallet: string;
  amount: number;
  currency: string;
  groupId: string;
  note?: string;
}

export interface SettlementExecutionResult {
  success: boolean;
  hash: string;
  ledger?: number;
  timestamp: string;
  error?: string;
}

/**
 * Abstract Settlement Adapter Interface
 * Decouples the UI layer from underlying Stellar payment / Soroban contract execution.
 * Soroban Smart Contract integration in Phase 5 replaces internal dispatch logic here without modifying frontend UI.
 */
export const settlementAdapter = {
  async executeSettlement(params: SettlementParams): Promise<SettlementExecutionResult> {
    // Current Implementation: Real Stellar Testnet XLM Payment
    const paymentResult: StellarPaymentResult = await executeStellarPayment(
      params.senderWallet,
      params.receiverWallet,
      params.amount
    );

    return {
      success: paymentResult.success,
      hash: paymentResult.hash,
      ledger: paymentResult.ledger,
      timestamp: paymentResult.timestamp,
      error: paymentResult.error,
    };
  },
};

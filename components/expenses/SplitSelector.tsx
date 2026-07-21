"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Member } from "@/types/member";
import { SplitType } from "@/types/expense";
import { Input } from "@/components/ui/input";

export interface ParticipantShare {
  walletAddress: string;
  memberName: string;
  shareAmount: number;
  sharePercentage: number;
}

interface SplitSelectorProps {
  splitType: SplitType;
  totalAmount: number;
  currency: string;
  selectedMembers: Member[];
  onChange: (shares: ParticipantShare[], isValid: boolean) => void;
}

export default function SplitSelector({
  splitType,
  totalAmount,
  currency,
  selectedMembers,
  onChange,
}: SplitSelectorProps) {
  // Local inputs state: keys are wallet addresses, values are string inputs
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Declare validation handler first using useCallback so it doesn't trigger effect re-runs
  const validateAndNotify = useCallback(
    (currentInputs: Record<string, string>) => {
      if (selectedMembers.length === 0) {
        onChange([], false);
        setErrorMsg(null);
        return;
      }

      if (splitType === "Equal") {
        const count = selectedMembers.length;
        const share = totalAmount / count;
        const pct = 100 / count;
        const shares = selectedMembers.map((m) => ({
          walletAddress: m.walletAddress,
          memberName: m.name,
          shareAmount: parseFloat(share.toFixed(2)),
          sharePercentage: pct,
        }));
        onChange(shares, true);
        setErrorMsg(null);
        return;
      }

      let isValid = true;
      let sum = 0;
      const shares: ParticipantShare[] = [];

      if (splitType === "Percentage") {
        // Sum percentages
        selectedMembers.forEach((m) => {
          const inputStr = currentInputs[m.walletAddress] || "0";
          const pctVal = parseFloat(inputStr) || 0;
          sum += pctVal;

          const shareAmt = (pctVal / 100) * totalAmount;
          shares.push({
            walletAddress: m.walletAddress,
            memberName: m.name,
            shareAmount: parseFloat(shareAmt.toFixed(2)),
            sharePercentage: pctVal,
          });
        });

        // Sum check (must equal 100%)
        if (Math.abs(sum - 100) > 0.01) {
          isValid = false;
          setErrorMsg(`Total percentage must equal 100%. Currently: ${sum.toFixed(1)}%`);
        } else {
          setErrorMsg(null);
        }
      } else if (splitType === "Shares") {
        // Sum share ratios
        let totalRatio = 0;
        selectedMembers.forEach((m) => {
          const inputStr = currentInputs[m.walletAddress] || "1";
          const ratioVal = parseFloat(inputStr) || 0;
          totalRatio += ratioVal;
        });

        if (totalRatio <= 0) {
          isValid = false;
          setErrorMsg("Total shares ratio must be greater than 0.");
        } else {
          setErrorMsg(null);
        }

        selectedMembers.forEach((m) => {
          const inputStr = currentInputs[m.walletAddress] || "1";
          const ratioVal = parseFloat(inputStr) || 0;
          const sharePct = totalRatio > 0 ? (ratioVal / totalRatio) * 100 : 0;
          const shareAmt = totalRatio > 0 ? (ratioVal / totalRatio) * totalAmount : 0;

          shares.push({
            walletAddress: m.walletAddress,
            memberName: m.name,
            shareAmount: parseFloat(shareAmt.toFixed(2)),
            sharePercentage: parseFloat(sharePct.toFixed(2)),
          });
        });
      } else if (splitType === "Custom") {
        // Sum absolute amounts
        selectedMembers.forEach((m) => {
          const inputStr = currentInputs[m.walletAddress] || "0";
          const amtVal = parseFloat(inputStr) || 0;
          sum += amtVal;

          const sharePct = totalAmount > 0 ? (amtVal / totalAmount) * 100 : 0;
          shares.push({
            walletAddress: m.walletAddress,
            memberName: m.name,
            shareAmount: amtVal,
            sharePercentage: parseFloat(sharePct.toFixed(2)),
          });
        });

        // Sum check (must equal total amount)
        if (Math.abs(sum - totalAmount) > 0.01) {
          isValid = false;
          setErrorMsg(
            `Total splits must equal expense amount (${totalAmount} ${currency}). Currently: ${sum.toFixed(
              2
            )} ${currency}`
          );
        } else {
          setErrorMsg(null);
        }
      }

      // Pass results to parent component
      onChange(shares, isValid);
    },
    [selectedMembers, splitType, totalAmount, currency, onChange]
  );

  // Initialize/reset local inputs when members, split type, or amount changes
  useEffect(() => {
    const newInputs: Record<string, string> = {};
    if (splitType === "Equal") {
      const count = selectedMembers.length;
      if (count > 0) {
        const share = totalAmount / count;
        const pct = 100 / count;
        selectedMembers.forEach((m) => {
          newInputs[m.walletAddress] = share.toFixed(2);
        });
        const shares = selectedMembers.map((m) => ({
          walletAddress: m.walletAddress,
          memberName: m.name,
          shareAmount: parseFloat(share.toFixed(2)),
          sharePercentage: pct,
        }));
        const timer = setTimeout(() => {
          onChange(shares, true);
          setErrorMsg(null);
        }, 0);
        return () => clearTimeout(timer);
      }
    } else {
      // Clear inputs for manual entries
      selectedMembers.forEach((m) => {
        newInputs[m.walletAddress] = inputs[m.walletAddress] || "";
      });
      const timer = setTimeout(() => {
        setInputs(newInputs);
        validateAndNotify(newInputs);
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitType, totalAmount, selectedMembers.length]);

  const handleInputChange = (walletAddress: string, val: string) => {
    const updatedInputs = { ...inputs, [walletAddress]: val };
    setInputs(updatedInputs);
    validateAndNotify(updatedInputs);
  };

  if (selectedMembers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground bg-card/10">
        Please select participants above to split the expense.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
        Configure Split Allocation
      </label>

      {splitType === "Equal" ? (
        <div className="rounded-xl border border-border/20 bg-secondary/5 p-3 text-xs space-y-2">
          <p className="text-muted-foreground leading-normal">
            Divides the total <strong>{totalAmount} {currency}</strong> equally among all <strong>{selectedMembers.length}</strong> participants:
          </p>
          <div className="font-semibold text-foreground text-sm">
            {(totalAmount / selectedMembers.length).toFixed(2)} {currency} each
          </div>
        </div>
      ) : (
        <div className="space-y-2 border border-border/20 rounded-xl p-3 bg-secondary/5">
          <div className="max-h-[160px] overflow-y-auto space-y-2.5 pr-1 py-1">
            {selectedMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{m.name}</p>
                  <p className="text-[9px] text-muted-foreground font-mono truncate">
                    {m.walletAddress.slice(0, 6)}...{m.walletAddress.slice(-4)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={inputs[m.walletAddress] || ""}
                    onChange={(e) => handleInputChange(m.walletAddress, e.target.value)}
                    className="h-8 w-24 text-right rounded-lg bg-background/30 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider w-12 text-left">
                    {splitType === "Percentage"
                      ? "%"
                      : splitType === "Shares"
                      ? "share(s)"
                      : currency}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="text-[10px] text-amber-400 font-semibold mt-2.5 border-t border-border/10 pt-2 leading-relaxed">
              {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

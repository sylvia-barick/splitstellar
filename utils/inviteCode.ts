/**
 * Utility for generating and validating group invite codes.
 * Format: SPLIT-XXXXXX (e.g. SPLIT-7KQ9X2)
 */

export function generateInviteCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Exclude easily confused chars (0, O, 1, I)
  let result = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return `SPLIT-${result}`;
}

export function formatInviteCode(input: string): string {
  const cleaned = input.toUpperCase().trim().replace(/[^A-Z0-9-]/g, "");
  if (!cleaned.startsWith("SPLIT-") && cleaned.length > 0) {
    return `SPLIT-${cleaned.replace(/^SPLIT-?/, "")}`;
  }
  return cleaned;
}

export function isValidInviteCodeFormat(code: string): boolean {
  return /^SPLIT-[A-Z0-9]{6}$/.test(code.toUpperCase().trim());
}

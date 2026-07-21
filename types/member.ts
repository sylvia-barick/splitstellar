export interface Member {
  id: string;
  name: string;
  walletAddress: string;
  email?: string;
  joinedAt: string;
  role: "Owner" | "Member";
}

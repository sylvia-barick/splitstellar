"use client";

import React, { useState } from "react";
import { Wallet, LogOut, ExternalLink, Check, Copy } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function WalletStatusBadge() {
  const { isConnected, address, network, connect, disconnect, isInstalled } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Wallet address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected || !address) {
    return (
      <Button
        onClick={() => connect()}
        className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 text-primary-foreground font-semibold rounded-xl text-xs h-9 px-3.5 shadow-md flex items-center space-x-2"
      >
        <Wallet className="h-4 w-4" />
        <span>{isInstalled ? "Connect Freighter" : "Install Freighter"}</span>
      </Button>
    );
  }

  const truncated = `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button
          variant="outline"
          className="border-primary/30 bg-primary/10 hover:bg-primary/20 text-foreground font-mono text-xs rounded-xl h-9 px-3 flex items-center space-x-2 shrink-0"
        >
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">{truncated}</span>
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1.5 py-0 font-sans">
            {network || "TESTNET"}
          </Badge>
        </Button>
      } />

      <DropdownMenuContent align="end" className="w-64 bg-card border-border/80 text-foreground rounded-2xl p-2">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Freighter Identity
        </DropdownMenuLabel>
        
        <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/30 my-1 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Stellar Address</p>
          <p className="text-xs font-mono font-bold text-foreground break-all">{address}</p>
        </div>

        <DropdownMenuSeparator className="bg-border/20" />

        <DropdownMenuItem onClick={handleCopy} className="text-xs font-medium cursor-pointer rounded-xl focus:bg-secondary/40">
          {copied ? <Check className="h-3.5 w-3.5 mr-2 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-2 text-primary" />}
          <span>Copy Wallet Address</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => window.open(`https://stellar.expert/explorer/testnet/account/${address}`, "_blank")}
          className="text-xs font-medium cursor-pointer rounded-xl focus:bg-secondary/40"
        >
          <ExternalLink className="h-3.5 w-3.5 mr-2 text-indigo-400" />
          <span>View on Stellar Expert</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/20" />

        <DropdownMenuItem
          onClick={disconnect}
          className="text-xs font-medium text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer rounded-xl"
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          <span>Disconnect Wallet</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

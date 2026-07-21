"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import WalletStatusBadge from "@/components/wallet/WalletStatusBadge";
import NotificationCenter from "@/components/layout/NotificationCenter";
import SearchModal from "@/components/layout/SearchModal";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-card/70 backdrop-blur-xl shadow-lg transition-all">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo and Branding */}
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500/20 via-primary/20 to-cyan-400/20 p-1 border border-primary/30 shadow-[0_0_15px_rgba(0,210,255,0.2)] group-hover:scale-105 transition-transform duration-200">
            <img
              src="/logo.png"
              alt="SplitStellar Logo"
              className="h-full w-full object-contain rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-primary bg-clip-text text-transparent drop-shadow-sm">
              SplitStellar
            </span>
          </div>
        </div>

        {/* Search, Notifications & Wallet Badge */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="h-9 w-9 text-muted-foreground hover:text-primary rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 transition-all duration-200"
            title="Global Search (Cmd+K)"
          >
            <Search className="h-4 w-4" />
          </Button>

          <NotificationCenter />

          <WalletStatusBadge />
        </div>

        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </div>
    </header>
  );
}

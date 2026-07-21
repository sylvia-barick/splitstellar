import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/50 py-6 px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <img
            src="/logo.png"
            alt="SplitStellar Logo"
            className="h-4 w-4 object-contain rounded-sm"
          />
          <span className="text-sm font-semibold tracking-wide text-muted-foreground">
            SplitStellar
          </span>
          <span className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()}
          </span>
        </div>
        
        <div className="flex items-center space-x-1 text-xs text-muted-foreground/80">
          <span>Built for the</span>
          <span className="text-primary font-bold">Stellar Blockchain</span>
          <span>&</span>
          <span className="text-indigo-400 font-bold">Soroban Smart Contracts</span>
        </div>

        <div className="flex items-center space-x-4 text-xs text-muted-foreground/60">
          <a href="#" className="hover:text-primary transition-colors">
            Terms of Service
          </a>
          <span className="h-1 w-1 rounded-full bg-border"></span>
          <a href="#" className="hover:text-primary transition-colors">
            Privacy Policy
          </a>
          <span className="h-1 w-1 rounded-full bg-border"></span>
          <a href="#" className="hover:text-primary transition-colors">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

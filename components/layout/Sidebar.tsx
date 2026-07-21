"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Network,
  ArrowLeftRight,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarItem =
  | "Dashboard"
  | "Groups"
  | "Expenses"
  | "Debt Graph"
  | "Transactions"
  | "Analytics"
  | "Admin"
  | "Settings";

interface SidebarProps {
  activeItem: SidebarItem;
  onSelectItem: (item: SidebarItem) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ activeItem, onSelectItem, isOpen, setIsOpen }: SidebarProps) {
  const menuItems = [
    { name: "Dashboard" as SidebarItem, icon: LayoutDashboard, label: "Dashboard" },
    { name: "Groups" as SidebarItem, icon: Users, label: "Groups" },
    { name: "Expenses" as SidebarItem, icon: Receipt, label: "Expenses" },
    { name: "Debt Graph" as SidebarItem, icon: Network, label: "Debt Graph" },
    { name: "Transactions" as SidebarItem, icon: ArrowLeftRight, label: "Transactions" },
    { name: "Analytics" as SidebarItem, icon: BarChart3, label: "Analytics" },
    { name: "Admin" as SidebarItem, icon: Settings, label: "Admin Dashboard" },
    { name: "Settings" as SidebarItem, icon: Settings, label: "Settings" },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border/40 bg-card pt-16 transition-all duration-300 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:pt-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    onSelectItem(item.name);
                    setIsOpen(false); // Close sidebar on mobile after clicking
                  }}
                  className={cn(
                    "flex w-full items-center space-x-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-gradient-to-r from-primary/10 to-indigo-500/5 text-primary border-l-2 border-primary shadow-[inset_4px_0_12px_rgba(0,210,255,0.05)]"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span>{item.label}</span>

                  {/* Sleek indicator bubble */}
                  {isActive && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_#00d2ff]"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile / stellar details footer */}
        <div className="border-t border-border/40 p-4 bg-secondary/10">
          <div className="flex items-center space-x-3 rounded-lg p-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              SS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">SplitStellar User</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate">ID: 0x8a92...e1c4</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

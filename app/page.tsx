"use client";

import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar, { SidebarItem } from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import DashboardView from "@/components/dashboard/DashboardView";
import GroupsView from "@/components/groups/GroupsView";
import ExpensesView from "@/components/expenses/ExpensesView";
import GraphView from "@/components/graph/GraphView";
import TransactionsView from "@/components/wallet/TransactionsView";
import AnalyticsView from "@/components/dashboard/AnalyticsView";
import SettingsView from "@/components/dashboard/SettingsView";
import AdminDashboardView from "@/components/admin/AdminDashboardView";
import OfflineBar from "@/components/collaboration/OfflineBar";
import PresenceBar from "@/components/collaboration/PresenceBar";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useContractEvents } from "@/hooks/useContractEvents";
import { useWalletContext } from "@/contexts/WalletContext";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  useRealtimeSync();
  const { address } = useWalletContext();
  useContractEvents(address || undefined);

  const [activeItem, setActiveItem] = useState<SidebarItem>("Dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Helper to render the active view
  const renderActiveView = () => {
    switch (activeItem) {
      case "Dashboard":
        return <DashboardView />;
      case "Groups":
        return <GroupsView />;
      case "Expenses":
        return <ExpensesView />;
      case "Debt Graph":
        return <GraphView />;
      case "Transactions":
        return <TransactionsView />;
      case "Analytics":
        return <AnalyticsView />;
      case "Admin":
        return <AdminDashboardView />;
      case "Settings":
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navbar */}
      <Navbar />
      <OfflineBar />

      {/* Main Workspace Area */}
      <div className="flex flex-1 relative">
        {/* Left Sidebar */}
        <Sidebar
          activeItem={activeItem}
          onSelectItem={(item) => setActiveItem(item)}
          isOpen={isMobileSidebarOpen}
          setIsOpen={setIsMobileSidebarOpen}
        />

        {/* Content Wrapper */}
        <div className="flex flex-col flex-1 min-w-0">
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {/* Mobile View Title bar with Sidebar Toggle */}
            <div className="flex items-center gap-3 mb-4 md:hidden">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="h-10 w-10 border-border/40 bg-card hover:bg-secondary/40 shrink-0"
              >
                <Menu className="h-5 w-5 text-foreground" />
              </Button>
              <h2 className="text-lg font-bold tracking-tight text-foreground">{activeItem}</h2>
            </div>

            {/* Active view component */}
            <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
              {renderActiveView()}
            </div>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}

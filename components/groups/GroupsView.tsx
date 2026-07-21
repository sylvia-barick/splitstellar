"use client";

import React, { useState } from "react";
import { Plus, Grid, List, UserPlus } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { useWallet } from "@/hooks/useWallet";
import { Group } from "@/types/group";
import { Button } from "@/components/ui/button";
import SearchBar from "./SearchBar";
import FilterBar, { FilterStatus } from "./FilterBar";
import SortDropdown, { SortOption } from "./SortDropdown";
import GroupGrid from "./GroupGrid";
import GroupList from "./GroupList";
import EmptyState from "./EmptyState";
import CreateGroupDialog from "./CreateGroupDialog";
import JoinGroupDialog from "./JoinGroupDialog";
import EditGroupDialog from "./EditGroupDialog";
import ArchiveDialog from "./ArchiveDialog";
import DeleteGroupDialog from "./DeleteGroupDialog";
import GroupDetailsView from "./GroupDetailsView";

export default function GroupsView() {
  const { groups, isHydrated } = useGroups();

  // Navigation States
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Search, Filter, Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("Active");
  const [sortOption, setSortOption] = useState<SortOption>("Newest");
  const [isGridView, setIsGridView] = useState(true);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Core dialog helpers
  const handleOpenEdit = (group: Group) => {
    setSelectedGroup(group);
    setIsEditOpen(true);
  };

  const handleOpenArchive = (group: Group) => {
    setSelectedGroup(group);
    setIsArchiveOpen(true);
  };

  const handleOpenDelete = (group: Group) => {
    setSelectedGroup(group);
    setIsDeleteOpen(true);
  };

  const { address: userWallet } = useWallet();

  // Perform client-side Filtering, Searching, and Sorting
  const getProcessedGroups = () => {
    if (!isHydrated) return [];

    let result = [...groups];

    // 0. Filter by active wallet membership (shared group visibility)
    if (userWallet) {
      const activeAddr = userWallet.toLowerCase();
      result = result.filter(
        (g) =>
          g.ownerWallet.toLowerCase() === activeAddr ||
          g.members.some((m) => m.walletAddress.toLowerCase() === activeAddr)
      );
    }

    // 1. Filter Status
    if (filterStatus === "Active") {
      result = result.filter((g) => g.status === "Active");
    } else if (filterStatus === "Archived") {
      result = result.filter((g) => g.status === "Archived");
    }

    // 2. Search Query (name, currency, or member name)
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          g.currency.toLowerCase().includes(query) ||
          g.members.some((m) => m.name.toLowerCase().includes(query))
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case "Newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "Oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "Most Members":
          return b.members.length - a.members.length;
        case "Alphabetical":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  };

  const processedGroups = getProcessedGroups();

  // If a group details page is active, show the details view
  if (activeGroupId) {
    const activeGroup = groups.find((g) => g.id === activeGroupId);
    if (activeGroup) {
      return (
        <GroupDetailsView
          group={activeGroup}
          onBack={() => setActiveGroupId(null)}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Expense Groups</h1>
          <p className="text-sm text-muted-foreground">
            Manage your shared expense ledgers and settle splits via smart contracts.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            onClick={() => setIsJoinOpen(true)}
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 font-semibold rounded-xl px-4 py-2 flex items-center space-x-2 text-xs h-10"
          >
            <UserPlus className="h-4 w-4" />
            <span>Join Group</span>
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/95 text-primary-foreground font-semibold rounded-xl px-4 py-2 shadow-[0_0_15px_rgba(0,210,255,0.15)] flex items-center space-x-2 text-xs h-10"
          >
            <Plus className="h-4 w-4" />
            <span>Create Group</span>
          </Button>
        </div>
      </div>

      {/* Control Toolbar: Search, Filter, Sort, Layout Switcher */}
      {isHydrated && groups.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border-y border-border/25 py-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <FilterBar activeFilter={filterStatus} onChange={setFilterStatus} />
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <SortDropdown activeSort={sortOption} onChange={setSortOption} />
            
            <div className="flex border border-border/40 rounded-xl bg-secondary/10 p-1 shrink-0 h-9 items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsGridView(true)}
                className={`h-7 w-7 rounded-lg p-0 ${isGridView ? "bg-secondary text-primary" : "text-muted-foreground"}`}
                title="Grid View"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsGridView(false)}
                className={`h-7 w-7 rounded-lg p-0 ${!isGridView ? "bg-secondary text-primary" : "text-muted-foreground"}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!isHydrated ? (
        <div className="flex items-center justify-center p-12">
          <span className="text-sm text-muted-foreground font-mono">Loading local storage state...</span>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState onCreateClick={() => setIsCreateOpen(true)} />
      ) : processedGroups.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/30 rounded-2xl bg-card/15">
          <p className="text-sm font-semibold text-muted-foreground">No groups match your query.</p>
          <Button variant="link" onClick={() => { setSearchQuery(""); setFilterStatus("All"); }} className="text-primary text-xs mt-2">
            Clear filters
          </Button>
        </div>
      ) : isGridView ? (
        <GroupGrid
          groups={processedGroups}
          onViewGroup={setActiveGroupId}
          onEditGroup={handleOpenEdit}
          onArchiveGroup={handleOpenArchive}
          onDeleteGroup={handleOpenDelete}
        />
      ) : (
        <GroupList
          groups={processedGroups}
          onViewGroup={setActiveGroupId}
          onEditGroup={handleOpenEdit}
          onArchiveGroup={handleOpenArchive}
          onDeleteGroup={handleOpenDelete}
        />
      )}

      {/* Dialog Modals */}
      <CreateGroupDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <JoinGroupDialog
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onSuccess={(groupId) => setActiveGroupId(groupId)}
      />

      <EditGroupDialog
        group={selectedGroup}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedGroup(null);
        }}
      />

      <ArchiveDialog
        group={selectedGroup}
        isOpen={isArchiveOpen}
        onClose={() => {
          setIsArchiveOpen(false);
          setSelectedGroup(null);
        }}
      />

      <DeleteGroupDialog
        group={selectedGroup}
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedGroup(null);
        }}
      />
    </div>
  );
}

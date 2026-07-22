-- SplitStellar Supabase Database Schema
-- Enables Realtime PostgreSQL Replication on all tables

-- 1. Users Table (Wallet-based Identity)
CREATE TABLE IF NOT EXISTS public.users (
  wallet_address TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Groups Table (Group Ledgers with Invite Codes)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'XLM',
  invite_code TEXT NOT NULL UNIQUE,
  owner_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Active'
);

-- 3. Group Members Table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT NOT NULL DEFAULT 'Member',
  UNIQUE(group_id, wallet_address)
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XLM',
  paid_by TEXT NOT NULL REFERENCES public.users(wallet_address),
  category TEXT NOT NULL DEFAULT 'Others',
  split_type TEXT NOT NULL DEFAULT 'Equal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Expense Participants Table
CREATE TABLE IF NOT EXISTS public.expense_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address),
  member_name TEXT NOT NULL,
  share_amount NUMERIC NOT NULL DEFAULT 0,
  share_percentage NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE
);

-- 6. Payments Table (Settlement Tracking)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_wallet TEXT NOT NULL REFERENCES public.users(wallet_address),
  to_wallet TEXT NOT NULL REFERENCES public.users(wallet_address),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XLM',
  status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Paid, Completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- 7. Settlements Table (Abstract Soroban Settlement Records)
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_wallet TEXT NOT NULL REFERENCES public.users(wallet_address),
  to_wallet TEXT NOT NULL REFERENCES public.users(wallet_address),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XLM',
  status TEXT NOT NULL DEFAULT 'Pending',
  transaction_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Invites Table
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes for Speed
CREATE INDEX IF NOT EXISTS idx_group_members_wallet ON public.group_members(wallet_address);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_payments_group_id ON public.payments(group_id);

-- Enable Supabase Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;

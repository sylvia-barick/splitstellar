# Technical Architecture Documentation

## Overview
SplitStellar is a decentralized expense sharing and debt settlement platform built on the Stellar network using Soroban smart contracts.

## System Architecture

```
React / Next.js Client
        │
        ├── Freighter Wallet Extension (Transaction Signing)
        │
        ├── Soroban RPC Node (Stellar Testnet)
        │
        ├── Backend REST API Layer (/api/*)
        │
        └── Blockchain Indexer & Persistent Storage (.data / Supabase DB)
```

## Core Modules
1. **Wallet Layer**: Interface with Freighter SDK (`@stellar/freighter-api`).
2. **Soroban Smart Contracts**: Rust contracts managing Groups, Expenses, Settlements, Money Requests, and Activity Logs on-chain.
3. **Indexing & Caching**: RPC event polling listener synchronizing on-chain state to fast indexed queries.
4. **Debt Simplification**: Minimum cash flow algorithm consolidating multi-party group debts into minimum transactions.
5. **Real-time Sync**: BroadcastChannel and interval polling ensuring instant state updates across browser windows.

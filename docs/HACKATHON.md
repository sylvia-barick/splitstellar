# Hackathon Submission Package & Presentation Kit

## 1. Project Overview & Problem Statement
- **Project Name**: SplitStellar
- **Tagline**: Decentralized group expense splitting & debt simplification built on Stellar & Soroban.
- **Problem**: Traditional expense-sharing platforms rely on centralized databases, charge hefty cross-border fees, and lack transparent on-chain auditability.
- **Solution**: SplitStellar leverages Soroban smart contracts, Freighter Wallet, and a graph debt simplification algorithm to consolidate debts on Stellar Testnet with near-zero transaction fees and instant settlements.

---

## 2. Soroban & Freighter Integration Architecture

```
User (Browser) ──> Freighter Wallet (Sign Tx) ──> Soroban Smart Contracts (Testnet)
                         │                                     │
                         ▼                                     ▼
                Direct XLM Payments                  RPC Event Indexer & DB Store
```

---

## 3. Pitch Deck Outline (12 Slides)
- **Slide 1**: Title & Elevator Pitch (SplitStellar)
- **Slide 2**: The Problem (Centralization & High Cross-Border Payout Fees)
- **Slide 3**: The Solution (Decentralized Soroban Smart Contract Expense Engine)
- **Slide 4**: Key Features (Base32 Invites, Debt Simplification, Net Debt Graph)
- **Slide 5**: Technical Architecture (Next.js, Soroban Rust Contracts, Freighter API)
- **Slide 6**: Live Debt Simplification Graph Engine
- **Slide 7**: Real-Time Indexing & Ledger Analytics
- **Slide 8**: Enterprise Admin & Health Monitoring System
- **Slide 9**: Security & Replay Attack Protection Model
- **Slide 10**: Competitive Advantage (Zero Middlemen, Instant Settlement)
- **Slide 11**: Roadmap (Mainnet Launch & Multi-Asset Stablecoin Support)
- **Slide 12**: Team & Closing Statement

---

## 4. Demo Video Script (3-5 Minutes)
- **0:00 - 0:45**: Introduction & Pain Point in Traditional Expense Apps.
- **0:45 - 1:30**: Connecting Freighter Wallet & Creating an Expense Group with Base32 Invites.
- **1:30 - 2:30**: Splitting Expenses & Inspecting the Dynamic Net Debt Graph.
- **2:30 - 3:45**: Settling Debt On-Chain & Verifying Transaction Hash on Stellar Expert Explorer.
- **3:45 - 4:30**: Reviewing Real-Time Analytics & Enterprise Admin Dashboard.
- **4:30 - 5:00**: Closing & Vision for On-Chain Shared Finances.

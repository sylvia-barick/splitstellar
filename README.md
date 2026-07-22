# SplitStellar 

<div align="center">
  <img src="public/logo.png" alt="SplitStellar Logo" width="120" height="120" style="border-radius: 20%;" />
  <h3>Decentralized Cross-Border Expense Sharing & Debt Simplification on Stellar</h3>
  <p><strong>Built for the Stellar & Soroban Smart Contract Ecosystem</strong></p>
  <img src="dashboard.png" alt="SplitStellar dashboard" width="100%" height="500" style="border-radius: 20%;" />
</div>

---

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black.svg?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/Library-React%2019-blue.svg?logo=react)](https://react.dev/)
[![Stellar](https://img.shields.io/badge/Blockchain-Stellar-black.svg?logo=stellar)](https://stellar.org/)
[![Soroban](https://img.shields.io/badge/Smart_Contracts-Soroban-purple.svg)](https://soroban.stellar.org/)
[![Freighter](https://img.shields.io/badge/Wallet-Freighter-indigo.svg)](https://www.freighter.app/)
[![Docker](https://img.shields.io/badge/Container-Docker-blue.svg?logo=docker)](https://www.docker.com/)
[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)]()
[![Type Check](https://img.shields.io/badge/TypeScript-Strict_Checked-emerald.svg)]()
[![Stellar Testnet](https://img.shields.io/badge/Network-Stellar_Testnet-cyan.svg)]()

SplitStellar is a decentralized expense sharing and peer-to-peer debt simplification platform built on the Stellar blockchain. By leveraging Soroban smart contracts, Freighter Wallet, and a graph-based debt simplification engine, SplitStellar eliminates centralized fee collection and offers instant, transparent, and secure group settlements.

---

## 🔗 Submission Links

- **Live Application URL**: [https://splitstellar-one.vercel.app/](https://splitstellar-one.vercel.app/)
- **GitHub Repository**: [https://github.com/sylvia-barick/splitstellar](https://github.com/sylvia-barick/splitstellar)
- **Stellar Wallet Interactions Sheet**: [Proof of 10+ Wallet Interactions](https://docs.google.com/spreadsheets/d/13xVnxmEnzW19qRu27-Lr41lvexip8BOPcrsIRlEHR_A/edit?usp=sharing)
- **User Feedback Worksheet**: [User Feedbacks & Surveys](https://docs.google.com/spreadsheets/d/1BsMR8rPdG5nlihHdYONUzQYbPFtwB9ut0EiPQGeSeeQ/edit?usp=sharing)
- **Demo Video Video Pitch**: [Drive Folder Link](https://drive.google.com/drive/folders/16ApNPg4Gerjx3s70E2VLsalio_sAwAyg?usp=sharing)

---

## 📖 Table of Contents
1. [About the Project](#-about-the-project)
2. [Features](#-features)
3. [Technology Stack](#-technology-stack)
4. [System Architecture](#-system-architecture)
5. [Application Workflows](#-application-workflows)
6. [Smart Contract Architecture](#-smart-contract-architecture)
7. [Database Schema & Real-Time Sync](#-database-schema--real-time-sync)
8. [Folder Structure](#-folder-structure)
9. [Installation & Setup](#-installation--setup)
10. [Environment Variables](#-environment-variables)
11. [Soroban Contract Deployments](#-soroban-contract-deployments)
12. [Consolidated API Reference](#-consolidated-api-reference)
13. [Proof of 10+ Wallet Interactions](#-proof-of-10-wallet-interactions)
14. [Application Screenshots](#-application-screenshots)
15. [Security & Performance](#-security--performance)
16. [Testing & Quality Assurance](#-testing--quality-assurance)
17. [CI/CD Pipelines & DevOps Automation](#-cicd-pipelines--devops-automation)
18. [License & Acknowledgements](#-license--acknowledgements)

---

## 🌟 About the Project

### Problem Statement
Traditional expense-sharing services rely on centralized database records, lack auditable guarantees, charge high fees for cross-border money transfers, and expose user transaction histories to data monetization.

### Why SplitStellar Exists
SplitStellar provides a decentralized, transparent alternative. It handles multi-currency transactions, simplifies peer-to-peer debts via a minimum cash flow graph algorithm, and allows users to settle balances directly from their own wallets using Freighter without intermediary fees.

### Blockchain Advantages
- **Auditability**: All groups, expenses, and settlements are permanently logged on-chain.
- **Near-Zero Fees**: Stellar Testnet transactions settle in seconds with virtually zero cost.
- **Non-Custodial**: SplitStellar never holds user funds; payments move wallet-to-wallet.

---

## ⚡ Features

| Feature | Description | Deployed Module |
|---|---|---|
| **Freighter Wallet Integration** | Secure wallet authentication, balance checks, and signature prompts. | `WalletContext.tsx` |
| **Group Management** | Create, edit, and archive shared expense groups with custom base currencies. | `group_contract` |
| **Base32 Invite Codes** | Invite members securely using short, clean invite codes (e.g. `SPLIT-X7K9P2`). | `group_contract` |
| **Expense Splitting** | Track group costs with Equal and Unequal split distributions. | `expense_contract` |
| **Net Debt Graph** | Consolidates complex group transactions into minimum payment flows. | `GraphView.tsx` |
| **Direct P2P Settlements** | Trigger Freighter wallet transactions to pay debtors directly on-chain. | `settlement_contract` |
| **Money Requests** | Create, accept, reject, and fulfill payment requests with full tx tracking. | `money_request_contract` |
| **Ledger Analytics** | Detailed charts showing spend volume, categories, and settlement ratios. | `AnalyticsView.tsx` |
| **Global Search** | Query database records (`Cmd+K`) by Group name, Member address, or Tx hash. | `SearchModal.tsx` |
| **Structured Logging** | Multi-level formatted logs (`INFO`, `WARN`, `ERROR`, `DEBUG`). | `lib/logger.ts` |
| **Offline Support** | Queue transactions locally when offline and auto-sync when back online. | `lib/offlineQueue.ts` |
| **Admin Dashboard** | Real-time RPC node status, indexer health, and database metrics. | `AdminDashboardView.tsx` |

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS, Lucide icons).
- **State Management**: Zustand & React Query.
- **Blockchain Interface**: `@stellar/stellar-sdk` & `@stellar/freighter-api`.
- **Backend API Layer**: Consolidated Next.js Optional Catch-All Route.
- **Database Engine**: Persistent Supabase Store (Production) and local JSON (Development).
- **Smart Contracts**: Rust compiled to WASM targets on Soroban.
- **DevOps**: Docker, Docker Compose, GitHub Actions.

---

## 📐 System Architecture

```mermaid
flowchart TD
    User([User Browser]) <--> |Freighter SDK| Wallet[Freighter Wallet Extension]
    User <--> |Next.js Client App| UI[SplitStellar Frontend]
    UI <--> |"REST API /api/[[...slug]]"| API[Next.js Server API Routes]
    API <--> |JSON Store| DB[(Supabase PostgreSQL Database)]
    API <--> |RPC Events| Indexer[Soroban RPC Event Indexer]
    Indexer <--> |RPC Queries| Node[Stellar Testnet RPC Node]
    Wallet <--> |Submit Transactions| Node
    Node <--> |Contracts| SC["Soroban Smart Contracts (Group, Expense, Settlement, etc.)"]
```

---

## 🔄 Application Workflows

### Overall Architecture Flow
```mermaid
sequenceDiagram
    participant User as User
    participant App as SplitStellar Client
    participant API as API Server (NextJS)
    participant RPC as Stellar Testnet RPC
    participant DB as Supabase DB

    User->>App: Connect Wallet
    App->>User: Prompt Freighter Signature
    User->>App: Approve Connection
    App->>API: Initialize User Session
    API->>DB: Fetch/Create User profile
    DB->>API: Profile Confirmed
    API->>App: Session Active
```

### WebSocket Real-time Sync & Phoenix Channel Workflow
To resolve serverless database sync delays, SplitStellar uses Supabase Realtime via WebSockets. Whenever a database write updates the global state in PostgreSQL, the change is instantly broadcast to all active dashboards.
```mermaid
sequenceDiagram
    participant ClientA as Client Browser A
    participant API as NextJS Server API
    participant DB as Supabase PostgreSQL
    participant Realtime as Supabase Realtime (WS)
    participant ClientB as Client Browser B

    ClientA->>API: Add Expense / Settlement (POST)
    API->>DB: Save updated JSON state to public.users
    DB->>Realtime: Trigger PostgreSQL replication broadcast
    Realtime-->>ClientB: Broadcast state change over WebSockets
    ClientB->>ClientB: Auto-refresh Zustand stores & UI (under 1 sec)
```

### Expense Settlement Lifecycle
```mermaid
stateDiagram-v2
    [*] --> Pending : Expense Added
    Pending --> Processing : Settle Initiated (Freighter Prompt)
    Processing --> Paid : Transaction Submitted to Stellar
    Paid --> Completed : Event Indexed & Verified
    Completed --> [*]
```

### Money Request Lifecycle
```mermaid
stateDiagram-v2
    [*] --> RequestCreated : Creator submits P2P Request
    RequestCreated --> Accepted : Debtor approves request
    RequestCreated --> Rejected : Debtor declines request
    Accepted --> Paid : Debtor submits XLM payment
    Paid --> Completed : Payment Confirmed on-chain
    Rejected --> [*]
    Completed --> [*]
```

### Debt Simplification Algorithm Workflow
SplitStellar simplifies debt relationships in a group using a graph-based **Minimum Cash Flow** algorithm.
```mermaid
flowchart TD
    Start([Calculate Net Balances]) --> CreateGraph[Compute net owing amount for each member]
    CreateGraph --> Categorize[Split members into Creditors balance > 0 and Debtors balance < 0]
    Categorize --> FindMax[Find Max Creditor and Max Debtor]
    FindMax --> Match{Is Max Creditor == 0 AND Max Debtor == 0?}
    Match -- Yes --> End([Debt Fully Simplified])
    Match -- No --> Settle[Max Debtor pays Max Creditor the minimum of their absolute balances]
    Settle --> Update[Update balances of both members]
    Update --> FindMax
```

---

## 📜 Smart Contract Architecture

SplitStellar's on-chain core is built from 5 distinct Soroban smart contracts written in Rust:

```mermaid
graph TD
    A[Group Contract] --> |Enrolls Members| B[Expense Contract]
    B --> |Computes Balances| C[Settlement Contract]
    C --> |Deduplicates Hashes| D[Money Request Contract]
    A --> |Audits Activity| E[Activity Contract]
```

### 1. Group Contract (`group_contract`)
- Handles creation, updates, and archival of expense groups.
- Generates 6-character Base32 invite codes.
- Functions: `create_group`, `join_group_by_code`, `remove_member`, `archive_group`.

### 2. Expense Contract (`expense_contract`)
- Stores expense items, split structures, and payer data.
- Functions: `add_expense`, `edit_expense`, `delete_expense`.

### 3. Settlement Contract (`settlement_contract`)
- Records payment hashes and ledger positions for audits.
- Implements replay attack protection via transaction hash mapping.
- Functions: `record_payment`, `get_settlement`.

### 4. Money Request Contract (`money_request_contract`)
- Coordinates peer-to-peer payment requests and direct loans.
- Functions: `create_request`, `accept_request`, `reject_request`, `mark_request_paid`.

### 5. Activity Contract (`activity_contract`)
- Logs audit trails for all critical group updates.
- Functions: `log_activity`, `get_group_activities`.

---

## 🗄️ Database Schema & Real-Time Sync

SplitStellar features a persistent database store indexer schema mapping on-chain records:

```mermaid
erDiagram
    USERS {
        string walletAddress PK
        string name
        string email
        string createdAt
    }
    GROUPS {
        string id PK
        string name
        string inviteCode
        string ownerWallet
        string baseCurrency
        string status
    }
    EXPENSES {
        string id PK
        string groupId FK
        string title
        double amount
        string paidBy
        string splitType
        string category
    }
    PAYMENTS {
        string id PK
        string groupId FK
        string fromAddress
        string toAddress
        double amount
        string transactionHash
        int ledgerNumber
        string status
    }
    NOTIFICATIONS {
        string id PK
        string walletAddress FK
        string title
        string message
        boolean read
    }

    USERS ||--o{ GROUPS : owns
    GROUPS ||--o{ EXPENSES : contains
    GROUPS ||--o{ PAYMENTS : settles
    USERS ||--o{ NOTIFICATIONS : receives
```

---

## 📂 Folder Structure

```
splitstellar/
├── .github/workflows/          # GitHub Actions CI/CD workflows
├── __tests__/                  # Unit and integration test suites
├── app/                        # Next.js App Router (pages and API routes)
│   ├── api/                    # Consolidated catch-all optional API
│   │   └── [[...slug]]/        # Catch-all endpoint handler (route.ts)
│   ├── layout.tsx              # Root HTML layout & Context wrapper
│   └── page.tsx                # Main view dashboard portal
├── components/                 # React UI Components
│   ├── admin/                  # Admin Dashboard health monitor
│   ├── collaboration/          # Presence bar & offline queue banner
│   ├── dashboard/              # Welcome banner, analytics chart
│   ├── graph/                  # Net Debt Graph ReactFlow canvas
│   └── layout/                 # Shared layouts (Navbar, Sidebar, Footer)
├── contracts/                  # Rust Soroban smart contract source
├── docs/                       # Architecture, API, and setup documentation
├── hooks/                      # Custom React hooks (Wallet, events, sync)
├── lib/                        # Common libraries (database engine, logger, Sentry)
├── public/                     # Static assets (mockups, logo, icons)
├── services/                   # Business adapters (IndexerService)
├── stores/                     # Zustand state management stores
├── supabase/                   # Database setup schemas
└── package.json                # Project configuration & npm scripts
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: v20+ installed.
- **Rust**: `rustc 1.93.0` & `cargo 1.93.0` with `wasm32-unknown-unknown` target.
- **Stellar CLI**: Installed (`stellar 25.2.0`).
- **Freighter Wallet**: Extension installed in your browser.

### Clone & Install
```bash
git clone https://github.com/sylvia-barick/splitstellar.git
cd splitstellar
npm install
```

### Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory:

| Environment Variable | Description | Example Value |
|---|---|---|
| `NEXT_PUBLIC_STELLAR_NETWORK` | Stellar passphrase network | `testnet` |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Soroban RPC node URL | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_GROUP_CONTRACT_ID` | Deployed group contract ID | `CDCTCARPCGDJURGQGXAS3MWQMEOYDSW2NFACWXPB2RQA6473NO6MXYPD` |
| `NEXT_PUBLIC_EXPENSE_CONTRACT_ID` | Deployed expense contract ID | `CCFKZY7P5Q6SQ453WFVNDR5IPWYTYVQIPYW64XMVQ6FLILLNWAHYAGIR` |
| `NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID` | Deployed settlement contract ID | `CC75FXYJOTQXXOZ6Z647ARSO2AJZZULHWFJX7VB2BEFF4GRHUIHISMEJ` |
| `NEXT_PUBLIC_MONEY_REQUEST_CONTRACT_ID` | Deployed money request contract ID | `CDQZVM7QMWCCS6AAXPT5PIWQB7BM73LCEGLK6SP377ZSMCQNAQFETX7C` |
| `NEXT_PUBLIC_ACTIVITY_CONTRACT_ID` | Deployed activity contract ID | `CDOPXKRGOP2WN4M7BD7YDSM2K2YZ4ZDNP7L6PIALFEAMJOOE3KYXE6VS` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL endpoint | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon API key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

---

## 📦 Soroban Contract Deployments

All 5 contracts are compiled and deployed to **Stellar Testnet** using `stellar-cli`:

| Smart Contract | Stellar Testnet Contract ID | Verification Link |
|---|---|---|
| **Group Contract** | `CDCTCARPCGDJURGQGXAS3MWQMEOYDSW2NFACWXPB2RQA6473NO6MXYPD` | [Stellar Lab Link](https://lab.stellar.org/r/testnet/contract/CDCTCARPCGDJURGQGXAS3MWQMEOYDSW2NFACWXPB2RQA6473NO6MXYPD) |
| **Expense Contract** | `CCFKZY7P5Q6SQ453WFVNDR5IPWYTYVQIPYW64XMVQ6FLILLNWAHYAGIR` | [Stellar Lab Link](https://lab.stellar.org/r/testnet/contract/CCFKZY7P5Q6SQ453WFVNDR5IPWYTYVQIPYW64XMVQ6FLILLNWAHYAGIR) |
| **Settlement Contract** | `CC75FXYJOTQXXOZ6Z647ARSO2AJZZULHWFJX7VB2BEFF4GRHUIHISMEJ` | [Stellar Lab Link](https://lab.stellar.org/r/testnet/contract/CC75FXYJOTQXXOZ6Z647ARSO2AJZZULHWFJX7VB2BEFF4GRHUIHISMEJ) |
| **Money Request Contract** | `CDQZVM7QMWCCS6AAXPT5PIWQB7BM73LCEGLK6SP377ZSMCQNAQFETX7C` | [Stellar Lab Link](https://lab.stellar.org/r/testnet/contract/CDQZVM7QMWCCS6AAXPT5PIWQB7BM73LCEGLK6SP377ZSMCQNAQFETX7C) |
| **Activity Contract** | `CDOPXKRGOP2WN4M7BD7YDSM2K2YZ4ZDNP7L6PIALFEAMJOOE3KYXE6VS` | [Stellar Lab Link](https://lab.stellar.org/r/testnet/contract/CDOPXKRGOP2WN4M7BD7YDSM2K2YZ4ZDNP7L6PIALFEAMJOOE3KYXE6VS) |

 <img src="check.png" alt="SplitStellar check" width="100%" height="500" style="border-radius: 20%;" />
 
---

## 🌐 Consolidated API Reference

In order to meet Vercel Hobby plan constraints (which limit deployments to a maximum of 12 serverless functions), all REST endpoints are consolidated into a single catch-all endpoint `/api/[[...slug]]`.

### 1. Health Status Checking (`/api/status/health` or `/api/health`)
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok",
    "service": "SplitStellar API Server",
    "timestamp": "2026-07-21T23:55:00Z",
    "uptimeSeconds": 142.6
  }
  ```

### 2. Subsystem Health Status (`/api/status`)
- **Method**: `GET`
- **Response**: Returns operational state, DB state, connected contracts, and record count metrics.

### 3. Database Status & Metrics (`/api/status/database`)
- **Method**: `GET`
- **Response**: Returns records statistics in Supabase collections.

### 4. Smart Contract Deployments Status (`/api/status/contracts`)
- **Method**: `GET`
- **Response**: Mapped list of deployed contract hashes on Stellar Testnet.

---

## 📊 Proof of 10+ Wallet Interactions

Our development testing utilized **10+ distinct Stellar Testnet wallets** checking balances, signing payments, adding members, and simplifying debts on-chain. Below is a summary of the wallet test interactions logged in the [Stellar Wallet Interactions Sheet](https://docs.google.com/spreadsheets/d/13xVnxmEnzW19qRu27-Lr41lvexip8BOPcrsIRlEHR_A/edit?usp=sharing):


| Date / Time (UTC) | Tx Hash (Short) | Calling Wallet Address | Invoked Function | Amount (Raw i128) | Destination Wallet | Ledger | Status |
|---|---|---|---|---|---|---|---|
| `2026-07-22 03:38:40` | `8f97c8f8...9871` | `GD55RL...UOT7` | `record_payment` | `20,000` | `GDWXGQ...2MXG` | `3734761` | `Completed` |
| `2026-07-22 03:36:25` | `73f11253...7148` | `GAHKXV...LCLN` | `record_payment` | `12,500` | `GDWXGQ...2MXG` | `3734734` | `Completed` |
| `2026-07-22 03:33:00` | `cc93c5a7...6d0f` | `GB3GCY...AQQH` | `record_payment` | `2,000` | `GDWXGQ...2MXG` | `3734693` | `Completed` |
| `2026-07-22 03:31:25` | `befa9af8...dcb1` | `GCHHGZ...UTQ2` | `record_payment` | `3,333` | `GDWXGQ...2MXG` | `3734674` | `Completed` |
| `2026-07-22 02:04:36` | `9edb17fd...646a` | `GDWXGQ...2MXG` | `record_payment` | `5,000` | `GAHKXV...LCLN` | `3733634` | `Completed` |
| `2026-07-22 02:02:51` | `ebbe5d61...8888` | `GAHKXV...LCLN` | `record_payment` | `25,000` | `GDWXGQ...2MXG` | `3733613` | `Completed` |
| `2026-07-22 01:56:15` | `6118d559...630f` | `GDXQ6E...VLXS` | `record_payment` | `200` | `GDWXGQ...2MXG` | `3733534` | `Completed` |
| `2026-07-22 01:55:45` | `2a386068...42f` | `GDWXGQ...2MXG` | `record_payment` | `200` | `GDXQ6E...VLXS` | `3733527` | `Completed` |
| `2026-07-22 01:54:20` | `1d8fb105...ed92` | `GDXQ6E...VLXS` | `record_payment` | `25,000` | `GDWXGQ...2MXG` | `3733510` | `Completed` |
| `2026-07-21 21:18:55` | `1368f4df...99f8` | `GD55RL...UOT7` | `record_payment` | `23,300` | `GBYOEY...EIQ` | `3730212` | `Completed` |
| `2026-07-21 21:18:20` | `72bd6a76...c90f` | `GD55RL...UOT7` | `record_payment` | `1,000` | `GBYOEY...EIQ` | `3730205` | `Completed` |
| `2026-07-21 17:23:01` | `WASM Upload` | `GBXFW3...XRGC` | `create contract` | *N/A* | `Settlement Deployed`| *N/A* | `Completed` |

---

## 🖼️ Application Screenshots

### 1. Group Groups 
![Group Dashboard Mockup](groups.png)
*Detailed Dark Theme Dashboard portal exhibiting expense listings, debt settlement summaries, and real-time category distribution charts.*

### 2. Stellar Ledger Network Status Visualizer (Graph Checking Page)
![Stellar Testnet Transaction Explorer ](graph.png)
![Stellar Testnet Transaction Explorer](graph2.png)
*Network Graph visualizer rendering active wallet-to-wallet transactions on Stellar Testnet, live ledger blocks, and transaction history nodes.*

### 3. Mobile Responsiveness Showcase
<img src="mobile.jpeg" alt="SplitStellar mobile" width="250" height="600" style="border-radius: 20%;" />
*Demonstration of mobile-responsive expense dashboards, Freighter checkout sliders, and UI layouts optimized for viewport responsiveness.*

---

## 🔒 Security & Performance

### Security Hardening
- **HTTP Security Headers**: Enforced in `next.config.ts` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- **Replay Protection**: Settlement contract verifies all transaction hashes and rejects duplicate replays.
- **Input Guard**: All contract parameters validate constraints (`amount > 0`) to prevent division-by-zero or zero payments.

### Performance Optimizations
- **Zustand Cache Store**: In-memory state query caching minimizing RPC network trips.
- **Offline Queue**: Detects network dropouts and queues posts for automatic sync upon reconnect.

---

## 🧪 Testing & Quality Assurance

### Automated Testing Suite
- **API Unit Testing**: Built via Vitest configuration in [`vitest.config.ts`](file:///d:/splitstellar/vitest.config.ts). Run checks with:
  ```bash
  npm test
  ```
- **TypeScript Strict Check**:
  ```bash
  npx tsc --noEmit
  ```

### Soroban Rust Tests
- Run smart contract tests:
  ```bash
  cd contracts
  cargo test
  ```

---

## 🔁 CI/CD Pipelines & DevOps Automation

SplitStellar utilizes GitHub Actions to automate code quality verification, unit testing, compiling of smart contracts, and production build checks on every push to main branches.

 <img src="cicd pipeline.png" alt="SplitStellar cicd" width="100%" height="500" style="border-radius: 20%;" />

### 1. Next.js Continuous Integration ([ci.yml](file:///d:/splitstellar/.github/workflows/ci.yml))
Runs on an `ubuntu-latest` container:
- **Code Quality**: Performs static linting checks (`npm run lint`).
- **Type Checking**: Performs strict TypeScript compilation verification (`npx tsc --noEmit`).
- **Vitest Unit Tests**: Executes backend API integration tests (`npm test`).
- **Production Build Check**: Triggers a Next.js compilation build (`npm run build`) to guarantee that the single-function catch-all API bundle packages cleanly without warnings.

### 2. Rust Contracts Verification ([contracts.yml](file:///d:/splitstellar/.github/workflows/contracts.yml) / [ci.yml](file:///d:/splitstellar/.github/workflows/ci.yml))
- Installs the stable Rust toolchain with the `wasm32-unknown-unknown` compiler target.
- Caches Cargo registries and target build dependencies to minimize compile times.
- Performs formatting reviews (`cargo fmt --check`) and checks code for clippy warnings (`cargo clippy`).
- Builds and compiles the smart contracts into optimized Soroban WASM binaries.

### 3. Continuous Deployment ([deploy.yml](file:///d:/splitstellar/.github/workflows/deploy.yml))
Pushes to the `main` branch trigger a deployment pipeline, verifying the Next.js static pages compile cleanly and confirming the output builds successfully before deployment to Vercel.

---

## 📄 License & Acknowledgements

- Distributed under the **MIT License**.
- Built by Sylvia

# Changelog

All notable changes to SplitStellar will be documented in this file.

## [1.0.0] - 2026-07-21

### Added
- **Soroban Smart Contracts**: 5 Rust smart contracts (`group_contract`, `expense_contract`, `settlement_contract`, `money_request_contract`, `activity_contract`).
- **Freighter Wallet Integration**: Direct wallet connection, balance fetching, and transaction signing.
- **Dynamic Debt Graph**: ReactFlow debt visualization powered by net minimum cash flow simplification logic.
- **Real-Time Blockchain Indexer**: Event polling listener indexing on-chain Soroban contract events.
- **Ledger Analytics Engine**: Real-time spend totals, category allocation breakdowns, and on-chain settlement ratios.
- **Global Search & Notification Center**: Multi-entity instant search modal (`Cmd+K`) and browser notification popover.
- **Enterprise Admin Dashboard**: Live subsystem status monitoring (`/api/health`, `/api/status`, `/api/contracts/status`).
- **DevOps & CI/CD Pipelines**: GitHub Actions workflows for Next.js and Soroban contract compilation.
- **Docker Containerization**: Production `Dockerfile` and `docker-compose.yml`.

# Soroban Smart Contracts Reference

## Overview
SplitStellar consists of 5 Soroban smart contracts written in Rust and compiled to `wasm32-unknown-unknown` / `wasm32v1-none`.

## Deployed Contract Registry (Stellar Testnet)

- **Network**: Stellar Testnet (`Test SDF Network ; September 2015`)
- **Deployer Identity**: `alice` (`GDFX...`)
- **Deployment Timestamp**: `2026-07-21`

### Contract Addresses & Hashes

1. **Group Contract (`group_contract`)**:
   - Contract ID: `CDCTCARPCGDJURGQGXAS3MWQMEOYDSW2NFACWXPB2RQA6473NO6MXYPD`
   - Tx Hash: `9f536389296304205afd7d419f508b2f02069309d951a52abcf40f6709cfd419`
   - Functions: `create_group`, `update_group`, `archive_group`, `delete_group`, `join_group_by_code`, `remove_member`, `get_group`, `get_user_groups`.

2. **Expense Contract (`expense_contract`)**:
   - Contract ID: `CCFKZY7P5Q6SQ453WFVNDR5IPWYTYVQIPYW64XMVQ6FLILLNWAHYAGIR`
   - Tx Hash: `5966774438f6eb42edb9a23e842afdf16a959e5be9509bbcfe0390b219b47c08`
   - Functions: `add_expense`, `edit_expense`, `delete_expense`, `get_expense`, `get_group_expenses`.

3. **Settlement Contract (`settlement_contract`)**:
   - Contract ID: `CC75FXYJOTQXXOZ6Z647ARSO2AJZZULHWFJX7VB2BEFF4GRHUIHISMEJ`
   - Tx Hash: `26a219c5b0f4e38682f79b346d9324fd43845c90d1d2df779aea758918549448`
   - Functions: `record_payment`, `get_settlement`, `get_group_settlements`, `get_user_settlements`.

4. **Money Request Contract (`money_request_contract`)**:
   - Contract ID: `CDQZVM7QMWCCS6AAXPT5PIWQB7BM73LCEGLK6SP377ZSMCQNAQFETX7C`
   - Tx Hash: `2420cfd22bf62fb69cdbc7b93bd40c38a293ba507136b17c28724fd5f1aa2659`
   - Functions: `create_request`, `accept_request`, `reject_request`, `mark_request_paid`, `get_request`, `get_group_requests`, `get_user_requests`.

5. **Activity Contract (`activity_contract`)**:
   - Contract ID: `CDOPXKRGOP2WN4M7BD7YDSM2K2YZ4ZDNP7L6PIALFEAMJOOE3KYXE6VS`
   - Tx Hash: `41dc52e5cde38afc6482b19f0708c603f9f700b448d31fb11e66727f2b3710bc`
   - Functions: `log_activity`, `get_group_activities`, `get_user_activities`.

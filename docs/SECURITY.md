# Security Architecture & Security Audit Report

## 1. Smart Contract Authorization & Permissions
- **Soroban `require_auth()`**: Every state-changing smart contract function enforces cryptographic wallet owner signatures.
- **Owner-Only Operations**: Group updates, deletion, and member removals strictly check caller authorization (`caller == owner_wallet`).

## 2. Replay Protection & Transaction Verification
- **Transaction Hash Mapping**: The Settlement Contract (`settlement_contract`) indexes used transaction hashes to prevent duplicate payment replays.
- **Negative Amount Guards**: Input validation panics if `amount <= 0`.

## 3. Web & API Security
- **HTTP Security Headers**: Enforced in `next.config.ts` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`).
- **Input Sanitization**: Base32 invite code checks and wallet address format validation via Stellar StrKey SDK (`isValidAddress`).
- **No Secret Exposure**: Zero private keys or secret seeds stored in client or server code.

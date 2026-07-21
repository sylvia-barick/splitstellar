# SplitStellar Troubleshooting Guide

## Common Issues & Solutions

### 1. Freighter Wallet Not Connecting
- **Cause**: Freighter browser extension is not installed or locked.
- **Solution**: Ensure Freighter extension is installed and unlocked. Make sure network is set to **Stellar Testnet**.

### 2. Transaction Signature Rejected
- **Cause**: User clicked "Reject" or closed the Freighter popup dialog.
- **Solution**: Re-initiate settlement payment and click "Approve" in Freighter wallet.

### 3. Account Unfunded Error
- **Cause**: The destination or sender account is new on Stellar Testnet and has 0 XLM balance.
- **Solution**: Fund account with Testnet XLM using Friendbot faucet at [laboratory.stellar.org](https://laboratory.stellar.org/#account-creator).

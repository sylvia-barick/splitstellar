# Production Deployment Guide

## Stellar Testnet Smart Contract Deployments
All 5 Soroban smart contracts have been compiled to WASM (`stellar contract build`) and deployed to Stellar Testnet using the Stellar CLI:

```bash
# 1. Compile WASM Targets
cd contracts
stellar contract build

# 2. Fund Deployer Key pair
stellar keys fund alice --network testnet

# 3. Deploy WASM Binaries
stellar contract deploy --wasm target/wasm32v1-none/release/group_contract.wasm --source alice --network testnet
stellar contract deploy --wasm target/wasm32v1-none/release/expense_contract.wasm --source alice --network testnet
stellar contract deploy --wasm target/wasm32v1-none/release/settlement_contract.wasm --source alice --network testnet
stellar contract deploy --wasm target/wasm32v1-none/release/money_request_contract.wasm --source alice --network testnet
stellar contract deploy --wasm target/wasm32v1-none/release/activity_contract.wasm --source alice --network testnet
```

The resulting addresses are saved in the project's root `.env.local` file and loaded dynamically at build and runtime.

## Vercel Deployment (Recommended)
1. Push project repository to GitHub.
2. Connect GitHub repository to Vercel.
3. Configure environment variables specified in `.env.example`.
4. Deploy using standard Next.js build command (`npm run build`).

## Docker Container Deployment
1. Build production image:
   ```bash
   docker build -t splitstellar:latest .
   ```
2. Run via Docker Compose:
   ```bash
   docker-compose up -d
   ```
3. Access application at `http://localhost:3000`.

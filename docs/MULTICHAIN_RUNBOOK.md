# Multi-Chain Runbook (G-026a)

How to bring GoLudo to an additional EVM chain. Pattern: **one deployment per
chain** (separate Vercel env + Railway service), one chain registry as the
single source of truth (`src/config/chains.ts`).

## 0. Prerequisites
- Chain entry exists in `src/config/chains.ts` (id, RPC, explorer, gas symbol, faucet).
- G-016 gate: testnets only until legal clearance. Mainnets are configured but must stay unfunded.
- Fresh deployer/signer key **per chain** (blast-radius rule, Daniel G-026 review). Store in Tresor `web3/`.

## 1. Contracts
```bash
cd smart-contracts
# fund the new deployer with gas on the target chain first
npx hardhat run scripts/deploy.ts --network <target>   # add network to hardhat.config
node ../scripts/verify-onchain.mjs                      # against the new addresses
```
Recommendation: CREATE2 deterministic deploys so addresses match across chains
(simplifies env + docs). Record addresses in Tresor (per chain!).

## 2. Backend (new Railway service or env-switched instance)
Set env:
- `CHAIN_ID=<id>` (drives EIP-712 domain, room chainId, stats)
- `FLARE_RPC_URL=<target rpc>` (name is legacy — it is THE rpc url)
- `GOTOKEN_ADDRESS`, `LUDOVAULT_ADDRESS` **UND zwingend `VITE_LUDOVAULT_ADDRESS`/`VITE_GOTOKEN_ADDRESS`** — der contractVerifier liest NUR den VITE-Namen; ohne ihn läuft das Backend mit deaktivierter On-Chain-Verifikation (Daniel W4)
- `SERVER_SIGNER_PRIVATE_KEY=<per-chain key>`
- `ADMIN_KEY` (≥24 chars, new one per instance)
`prisma migrate deploy` runs via startCommand; GameHistory rows carry `chainId`.

## 3. Frontend (Vercel env per deployment)
- `VITE_CHAIN_ID=<id>`
- `VITE_GOTOKEN_ADDRESS_<id>` / `VITE_LUDOVAULT_ADDRESS_<id>` (or legacy names)
- `VITE_API_URL=<backend url for that chain>`
Redeploy WITHOUT build cache (Vite bakes envs at build time — G-024 lesson).

## 4. Verify (per chain, non-negotiable)
1. `/health` + `/api/burn` + `/api/stats` (check `chainId` field!)
2. Wallet connect → auto-switch prompt appears if wallet is on another chain
3. Faucet → create → join → match → claim (full UI e2e)
4. Payout signature from chain A must FAIL on chain B (nonce/domain negative test)

## Open for G-026b (one instance, many chains)
Room namespacing per chain in one lobby, per-chain stats aggregation UI,
wallet-chain-choice UX, per-chain faucet monitoring. See ticket G-026.

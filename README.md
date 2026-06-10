# Vaultic Trust — Stellar Edition

**Tokenize Africa's real economy.** Compliant RWA tokenization for Rwanda and Africa. Fractionalize real estate, commodities, carbon credits, and infrastructure into programmable, liquid digital assets on the **Stellar Network**.

Built with Next.js, Stellar SDK, Soroban (Rust), and TypeScript.

---

## Deployed contracts (Stellar testnet)

The current Soroban deployment used by the frontend:

| Contract | Role | Contract ID (Soroban) | Explorer |
| :--- | :--- | :--- | :--- |
| **VaulticAssetRegistry** | Canonical asset registry | `CAUISC56SF5EFPLV33KRXWWU63JU7UATLKTMQVEEVONJPGTSZMITESWB` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAUISC56SF5EFPLV33KRXWWU63JU7UATLKTMQVEEVONJPGTSZMITESWB) |
| **VaulticUserRegistry** | On-chain KYC registry | `CCFXQOUZSAE7O5NLKJEA4I7I76YDDDKHF3V7EOAZYCMK2X7CIVQ6XSWR` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCFXQOUZSAE7O5NLKJEA4I7I76YDDDKHF3V7EOAZYCMK2X7CIVQ6XSWR) |
| **VaulticInvestmentManager** | KYC-gated investment engine | `CAWR3VTTADC6Y3CE2N3DORX7NRSTXPFRHQ35SXO5VKGDX43TGTASGPCG` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAWR3VTTADC6Y3CE2N3DORX7NRSTXPFRHQ35SXO5VKGDX43TGTASGPCG) |
| **VaulticDividendManager** | Yield and dividend distribution | `CBXBIPIRTZFZTO7YLX36JCH72TTND4IUQF7HBMWI4W2K36F5HMZLNJFF` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBXBIPIRTZFZTO7YLX36JCH72TTND4IUQF7HBMWI4W2K36F5HMZLNJFF) |

Contract IDs are also configured in `packages/nextjs/scaffold.config.ts`.

---

## Architecture

Vaultic Trust uses a Stellar-native hybrid model:

- **Soroban contracts** for KYC gating, asset lifecycle, investment pools, and dividends.
- **Native Stellar assets** for fractional shares (trustlines, not custom token contracts).
- **On-chain compliance** via `VaulticUserRegistry` before investment actions execute.

---

## Product features

### Asset owners
- Register RWA metadata and valuations on-chain
- Tokenize assets as native Stellar fractional shares
- Track lifecycle states: Pending, Active, Tokenized, Closed, Relisted

### Investors
- Browse approved marketplace listings
- Complete KYC and add trustlines before purchasing shares
- Claim pro-rata USDC dividends

### Protocol admins
- Review assets and KYC submissions
- Manage admin wallets and protocol fee sweeps

---

## Getting started

### Requirements
- Node.js (>= v20.x)
- Stellar CLI (v26.0.0+)
- Freighter wallet (browser extension)
- Rust/Cargo (for contract development)

### Install

```bash
yarn install
cp packages/nextjs/.env.example packages/nextjs/.env.local
```

Set `NEXT_PUBLIC_PINATA_JWT` in `.env.local` for IPFS uploads (KYC and asset metadata).

### Deploy contracts (optional)

Automated testnet deployment:

```bash
cd packages/soroban-contracts && ./deploy-testnet.sh
```

Then update contract IDs in `packages/nextjs/scaffold.config.ts`.

Manual CLI steps are documented in `deployment_suite.txt` and `architecture_and_usage.txt`.

### Run the frontend

```bash
yarn start
```

Open `http://localhost:3000`.

---

## Project layout

- `packages/soroban-contracts/` — Soroban contracts (Rust), build artifacts, deployment scripts
- `packages/nextjs/` — Next.js app, Stellar SDK integration, UI

---

## Smart contracts

### VaulticAssetRegistry
Source of truth for registered assets, state transitions, and IPFS-linked metadata.

### VaulticUserRegistry
Compliance layer mapping Stellar addresses to KYC status.

### VaulticInvestmentManager
Primary sales, USDC pool accounting, and KYC checks before investment.

### VaulticDividendManager
Yield rounds and pro-rata USDC claims for shareholders.

---

Vaultic Trust — tokenizing Africa's real economy with trust, transparency, and traceability on Stellar.

@ChanceDira && @0xJonaseb11

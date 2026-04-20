# Vaultic Trust — Stellar Edition

**Tokenize Africa's real economy.** Compliant RWA tokenization for Rwanda and Africa. Fractionalize real estate, commodities, carbon credits, and infrastructure into programmable, liquid digital assets on the **Stellar Network**.

Built with Next.js, Stellar SDK, Soroban (Rust), and TypeScript.

---

## 🚀 Live on Stellar Testnet (Verified Contracts)

The full ecosystem is currently deployed and operational on the Stellar Testnet.

| Contract | Role | Contract ID (Soroban) | Explorer |
| :--- | :--- | :--- | :--- |
| **VaulticAssetRegistry** | Canonical Asset Source of Truth | `CAUISC56SF5EFPLV33KRXWWU63JU7UATLKTMQVEEVONJPGTSZMITESWB` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAUISC56SF5EFPLV33KRXWWU63JU7UATLKTMQVEEVONJPGTSZMITESWB) |
| **VaulticUserRegistry** | On-Chain KYC/AML Compliance | `CCFXQOUZSAE7O5NLKJEA4I7I76YDDDKHF3V7EOAZYCMK2X7CIVQ6XSWR` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCFXQOUZSAE7O5NLKJEA4I7I76YDDDKHF3V7EOAZYCMK2X7CIVQ6XSWR) |
| **VaulticInvestmentManager** | KYC-Gated Investment Engine | `CAWR3VTTADC6Y3CE2N3DORX7NRSTXPFRHQ35SXO5VKGDX43TGTASGPCG` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAWR3VTTADC6Y3CE2N3DORX7NRSTXPFRHQ35SXO5VKGDX43TGTASGPCG) |
| **VaulticDividendManager** | Yield/Dividend Distribution | `CBXBIPIRTZFZTO7YLX36JCH72TTND4IUQF7HBMWI4W2K36F5HMZLNJFF` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBXBIPIRTZFZTO7YLX36JCH72TTND4IUQF7HBMWI4W2K36F5HMZLNJFF) |

---

## 🏗 Key Architectural Shift (Avalanche → Stellar)

Vaultic Trust has transitioned from an EVM-heavy model to a **Stellar Native Hybrid Architecture**:

*   **Logic (Soroban)**: Complex business logic (KYC gating, lifecycle states, investment pool math) is handled by high-performance Rust-based smart contracts.
*   **Tokenization (Native Assets)**: Instead of custom ERC-20 smart contracts, fractional shares are issued as **Native Stellar Assets**. This leverages Stellar's protocol-level optimizations for payments and trustlines, resulting in near-zero fees and instant settlement.
*   **Compliance (KYC Registry)**: No more off-chain-only whitelists. Compliance is enforced on the ledger via the `VaulticUserRegistry`, allowing for atomic "Check-then-Invest" operations.

---

## 🛠 Product Features

### 🏢 Asset Owners
- **Transparent Registration**: Submit RWA metadata and valuations to the immutable registry.
- **Hybrid Fractionalization**: Distribute yield-bearing shares via Stellar Native Assets.
- **Lifecycle Management**: Asset states (`PENDING`, `ACTIVE`, `TOKENIZED`, `CLOSED`, `RELISTED`) are tracked on-chain.

### 💰 Investors
- **Marketplace Browsing**: Discover validated real-world opportunities across Africa.
- **KYC Gating**: Direct integration with the `UserRegistry` ensures a compliant environment for institutional and retail capital.
- **Automated Dividends**: Claim pro-rata USDC yield distributions directly via the `DividendManager`.

### 🛡 Protocol Admins
- **Compliance Control**: Manage user verification statuses (Verify, Suspend, Reject) directly from the dashboard.
- **Treasury Management**: Automated protocol fee collection and sweeping.

---

## 🚦 Getting Started

### 1. Requirements
- **Node.js** (>= v20.x)
- **Stellar CLI** (v26.0.0+)
- **Freighter Wallet** (Active browser extension)
- **Rust/Cargo** (For contract development)

### 2. Setup
Clone the repository and install dependencies:
```bash
yarn install
```

### 3. Detailed Deployment Steps (CLI)
For a fresh ecosystem bootstrap, follow these commands:

```bash
# 1. Generate a local deployment key (alias: deployer)
stellar keys generate deployer --network testnet

# 2. Fund the deployer account with testnet XLM
stellar keys fund deployer --network testnet

# 3. Build optimized WASM binaries for the contracts
stellar contract build --package vaultic-user-registry --optimize

# 4. Deploy the WASM binary to the network to get a Contract ID
stellar contract deploy --wasm target/wasm32v1-none/release/vaultic_user_registry.wasm --source deployer --network testnet

# 5. Initialize the contract with your Admin Address
stellar contract invoke --id [ID] --source deployer --network testnet -- initialize --admin [YOUR_ADDRESS]
```

*Note: You can automate this entire process using our orchestrated script:*
```bash
cd packages/soroban-contracts && ./deploy-testnet.sh
```

### 4. Start Frontend
```bash
yarn start
```
Access the dashboard at `http://localhost:3000`.

---

## 📂 Project Layout

- `packages/soroban-contracts/` — Soroban smart contracts (Rust), build artifacts, and deployment scripts.
- `packages/nextjs/` — Frontend application, Stellar SDK integration, and UI components.

---

## 🧱 Smart Contract Breakdown

### **VaulticAssetRegistry**
The source of truth for all tokenized assets. Enforces valid state transitions and stores IPFS-linked metadata.

### **VaulticUserRegistry**
The core compliance layer. Stores a mapping of account addresses to their verified KYC status. This gated contract is the first check for any investment activity.

### **VaulticInvestmentManager**
The marketplace engine. Handles USDC payments (Stellar Testnet USDC), pool accounting, and verifies KYC status before permitting purchase.

### **VaulticDividendManager**
Manages the distribution of RWA yield rounds. Calculates pro-rata shares for investors based on their holdings at the time of deposit.

---

Vaultic Trust — Tokenizing Africa's real economy with trust, transparency, and traceability on Stellar.

-------------
@ChanceDira && @0xJonaseb11

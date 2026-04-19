#!/usr/bin/env bash
# =============================================================================
# Vaultic Trust — Soroban Testnet Deployment Script
# =============================================================================
# Prerequisites:
#   1. Install stellar CLI:  cargo install --locked stellar-cli --features opt
#   2. Add wasm target:      rustup target add wasm32-unknown-unknown
#   3. Generate a deploy key: stellar keys generate --global deployer --network testnet
#   4. Fund it via Friendbot: stellar keys fund --network testnet deployer
# =============================================================================

set -euo pipefail

NETWORK="testnet"
DEPLOYER_ALIAS="deployer"
CONTRACT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_WASM="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/vaultic_asset_registry.wasm"
INVESTMENT_WASM="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/vaultic_investment_manager.wasm"
DIVIDEND_WASM="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/vaultic_dividend_manager.wasm"

# Testnet USDC contract (Circle / SDF Testnet)
TESTNET_USDC="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"

CONFIG_TS="$CONTRACT_DIR/../nextjs/scaffold.config.ts"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Vaultic Trust — Soroban Testnet Deployment     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ---------------------------------------------------------------------------- #
# 1. BUILD
# ---------------------------------------------------------------------------- #
echo "▶ Step 1: Building Soroban contracts (release mode)..."
cargo build --manifest-path "$CONTRACT_DIR/Cargo.toml" \
  --target wasm32-unknown-unknown \
  --release \
  --quiet

echo "   ✓ WASM artifacts built."

# ---------------------------------------------------------------------------- #
# 2. DEPLOY ASSET REGISTRY
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 2: Deploying VaulticAssetRegistry..."
REGISTRY_ID=$(stellar contract deploy \
  --network "$NETWORK" \
  --source "$DEPLOYER_ALIAS" \
  --wasm "$REGISTRY_WASM")

echo "   ✓ VaulticAssetRegistry deployed: $REGISTRY_ID"

# ---------------------------------------------------------------------------- #
# 3. DEPLOY INVESTMENT MANAGER
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 3: Deploying VaulticInvestmentManager..."
INVESTMENT_ID=$(stellar contract deploy \
  --network "$NETWORK" \
  --source "$DEPLOYER_ALIAS" \
  --wasm "$INVESTMENT_WASM")

echo "   ✓ VaulticInvestmentManager deployed: $INVESTMENT_ID"

# ---------------------------------------------------------------------------- #
# 4. DEPLOY DIVIDEND MANAGER
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 4: Deploying VaulticDividendManager..."
DIVIDEND_ID=$(stellar contract deploy \
  --network "$NETWORK" \
  --source "$DEPLOYER_ALIAS" \
  --wasm "$DIVIDEND_WASM")

echo "   ✓ VaulticDividendManager deployed: $DIVIDEND_ID"

# ---------------------------------------------------------------------------- #
# 5. GET DEPLOYER PUBLIC KEY
# ---------------------------------------------------------------------------- #
DEPLOYER_ADDRESS=$(stellar keys address "$DEPLOYER_ALIAS")
echo ""
echo "   Deployer address: $DEPLOYER_ADDRESS"

# ---------------------------------------------------------------------------- #
# 6. INITIALIZE — ASSET REGISTRY
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 5: Initializing VaulticAssetRegistry..."
stellar contract invoke \
  --network "$NETWORK" \
  --source "$DEPLOYER_ALIAS" \
  --id "$REGISTRY_ID" \
  -- initialize \
  --admin "$DEPLOYER_ADDRESS" \
  --tokenizer "$INVESTMENT_ID"

echo "   ✓ Registry initialized. Admin=$DEPLOYER_ADDRESS, Tokenizer=$INVESTMENT_ID"

# ---------------------------------------------------------------------------- #
# 7. INITIALIZE — INVESTMENT MANAGER
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 6: Initializing VaulticInvestmentManager..."
stellar contract invoke \
  --network "$NETWORK" \
  --source "$DEPLOYER_ALIAS" \
  --id "$INVESTMENT_ID" \
  -- initialize \
  --admin "$DEPLOYER_ADDRESS" \
  --registry "$REGISTRY_ID" \
  --payment_token "$TESTNET_USDC" \
  --fee_treasury "$DEPLOYER_ADDRESS" \
  --protocol_fee_bps "50"

echo "   ✓ InvestmentManager initialized. USDC=$TESTNET_USDC, Fee=0.5%"

# ---------------------------------------------------------------------------- #
# 8. INITIALIZE — DIVIDEND MANAGER
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 7: Initializing VaulticDividendManager..."
stellar contract invoke \
  --network "$NETWORK" \
  --source "$DEPLOYER_ALIAS" \
  --id "$DIVIDEND_ID" \
  -- initialize \
  --admin "$DEPLOYER_ADDRESS" \
  --investment_manager "$INVESTMENT_ID" \
  --payment_token "$TESTNET_USDC"

echo "   ✓ DividendManager initialized."

# ---------------------------------------------------------------------------- #
# 9. UPDATE scaffold.config.ts
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 8: Updating scaffold.config.ts with deployed contract IDs..."
sed -i.bak \
  -e "s|VaulticAssetRegistry: null, // TODO: run deploy-testnet.sh|VaulticAssetRegistry: \"$REGISTRY_ID\",|g" \
  -e "s|VaulticInvestmentManager: null, // TODO: run deploy-testnet.sh|VaulticInvestmentManager: \"$INVESTMENT_ID\",|g" \
  -e "s|VaulticDividendManager: null, // TODO: run deploy-testnet.sh|VaulticDividendManager: \"$DIVIDEND_ID\",|g" \
  "$CONFIG_TS"

echo "   ✓ scaffold.config.ts updated."

# ---------------------------------------------------------------------------- #
# 10. SUMMARY
# ---------------------------------------------------------------------------- #
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              DEPLOYMENT COMPLETE ✓                           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-18s  %-38s ║\n" "Contract" "Contract ID"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-18s  %-38s ║\n" "AssetRegistry" "$REGISTRY_ID"
printf "║  %-18s  %-38s ║\n" "InvestManager" "$INVESTMENT_ID"
printf "║  %-18s  %-38s ║\n" "DividendManager" "$DIVIDEND_ID"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-18s  %-38s ║\n" "Testnet USDC" "$TESTNET_USDC"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Verify contracts on: https://stellar.expert/explorer/testnet"
echo "  2. Fund your admin wallet via Friendbot: https://friendbot.stellar.org"
echo "  3. Start the Next.js frontend: cd ../nextjs && yarn dev"
echo ""

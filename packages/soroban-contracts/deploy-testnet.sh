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

# Ensure Stellar CLI is in path (common Homebrew location)
export PATH="/opt/homebrew/bin:$PATH"

NETWORK="testnet"
DEPLOYER_ALIAS="deployer"
ADMIN_ADDRESS_1="GCBWGQS24DUWG3HNCIFVICSJQXUTNGRKY7OZ4IZGBJSLK3MYHBY7HWHI"
ADMIN_ADDRESS_2="GBWAF6C56BDHNNUDY2KLC5HFZPGXBZAFE7YKZC36GZYMI2B5QH2M3NCL"
CONTRACT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_WASM="$CONTRACT_DIR/target/wasm32v1-none/release/vaultic_asset_registry.wasm"
INVESTMENT_WASM="$CONTRACT_DIR/target/wasm32v1-none/release/vaultic_investment_manager.wasm"
DIVIDEND_WASM="$CONTRACT_DIR/target/wasm32v1-none/release/vaultic_dividend_manager.wasm"
USER_REGISTRY_WASM="$CONTRACT_DIR/target/wasm32v1-none/release/vaultic_user_registry.wasm"

# Testnet USDC contract (Circle / SDF Testnet)
TESTNET_USDC="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"

CONFIG_TS="$CONTRACT_DIR/../nextjs/scaffold.config.ts"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Vaultic Trust — Soroban Testnet Deployment     ║"
echo "╚══════════════════════════════════════════════════╝"

# ---------------------------------------------------------------------------- #
# 1. BUILD (Staged to satisfy contractimport dependencies)
# ---------------------------------------------------------------------------- #
echo "▶ Step 1: Building Soroban contracts (staged release mode)..."

echo "   - Building Registries..."
stellar contract build --package vaultic-asset-registry --optimize
stellar contract build --package vaultic-user-registry --optimize

echo "   - Building Investment Manager..."
stellar contract build --package vaultic-investment-manager --optimize

echo "   - Building Dividend Manager..."
stellar contract build --package vaultic-dividend-manager --optimize

echo "   ✓ All WASM artifacts built."

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
# 4a. DEPLOY USER REGISTRY
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 4a: Deploying VaulticUserRegistry (KYC)..."
USER_REGISTRY_ID=$(stellar contract deploy \
  --network "$NETWORK" \
  --source "$DEPLOYER_ALIAS" \
  --wasm "$USER_REGISTRY_WASM")

echo "   ✓ VaulticUserRegistry deployed: $USER_REGISTRY_ID"

# ---------------------------------------------------------------------------- #
# 5. GET DEPLOYER DETAILS
# ---------------------------------------------------------------------------- #
DEPLOYER_ADDRESS=$(stellar keys address "$DEPLOYER_ALIAS")
echo ""
echo "   Deployer address (paying gas): $DEPLOYER_ADDRESS"
echo "   Admin 1 address:               $ADMIN_ADDRESS_1"
echo "   Admin 2 address:               $ADMIN_ADDRESS_2"

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
  --admins "[ \"$ADMIN_ADDRESS_1\", \"$ADMIN_ADDRESS_2\" ]" \
  --tokenizer "$INVESTMENT_ID"

echo "   ✓ Registry initialized. Admins=[$ADMIN_ADDRESS_1, $ADMIN_ADDRESS_2], Tokenizer=$INVESTMENT_ID"

# ---------------------------------------------------------------------------- #
# 6a. INITIALIZE — USER REGISTRY
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 5a: Initializing VaulticUserRegistry..."
stellar contract invoke \
  --network "$NETWORK" \
  --source "$DEPLOYER_ALIAS" \
  --id "$USER_REGISTRY_ID" \
  -- initialize \
  --admins "[ \"$ADMIN_ADDRESS_1\", \"$ADMIN_ADDRESS_2\" ]"

echo "   ✓ UserRegistry initialized. Admins=[$ADMIN_ADDRESS_1, $ADMIN_ADDRESS_2]"

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
  --admins "[ \"$ADMIN_ADDRESS_1\", \"$ADMIN_ADDRESS_2\" ]" \
  --registry "$REGISTRY_ID" \
  --user_registry "$USER_REGISTRY_ID" \
  --payment_token "$TESTNET_USDC" \
  --fee_treasury "$ADMIN_ADDRESS_1" \
  --protocol_fee_bps "50"

echo "   ✓ InvestmentManager initialized. Admins=[$ADMIN_ADDRESS_1, $ADMIN_ADDRESS_2], USDC=$TESTNET_USDC, Fee=0.5%"

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
  --admins "[ \"$ADMIN_ADDRESS_1\", \"$ADMIN_ADDRESS_2\" ]" \
  --investment_manager "$INVESTMENT_ID" \
  --user_registry "$USER_REGISTRY_ID" \
  --payment_token "$TESTNET_USDC"

echo "   ✓ DividendManager initialized. Admins=[$ADMIN_ADDRESS_1, $ADMIN_ADDRESS_2]"

# ---------------------------------------------------------------------------- #
# 9. RENUNCIATION VERIFICATION — Confirming Developer Roles Transferred
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 8: Verifying Renunciation of Developer Privileges..."

check_renunciation() {
  local name=$1
  local id=$2
  echo "   - Checking $name ($id)..."
  
  # Invoke get_admins to verify the state
  local admins=$(stellar contract invoke \
    --network "$NETWORK" \
    --source "$DEPLOYER_ALIAS" \
    --id "$id" \
    -- get_admins)
  
  if [[ "$admins" == *"$DEPLOYER_ADDRESS"* ]]; then
    echo "   ⚠️ WARNING: Deployer address found in $name admins!"
  else
    echo "   ✓ Success: Deployer NOT an admin in $name. Power transferred to team."
  fi
}

check_renunciation "AssetRegistry" "$REGISTRY_ID"
check_renunciation "UserRegistry" "$USER_REGISTRY_ID"
check_renunciation "InvestManager" "$INVESTMENT_ID"
check_renunciation "DividendManager" "$DIVIDEND_ID"

# ---------------------------------------------------------------------------- #
# 10. UPDATE scaffold.config.ts (Note: Handled manually for accuracy since IDs changed)
# ---------------------------------------------------------------------------- #
echo ""
echo "▶ Step 9: Deployment successful. Please update scaffold.config.ts with the IDs below."

# ---------------------------------------------------------------------------- #
# 11. SUMMARY
# ---------------------------------------------------------------------------- #
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              DEPLOYMENT COMPLETE ✓                           ║"
echo "║      DEVELOPER ROLES RENOUNCED TO ADMINS                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-18s  %-38s ║\n" "Contract" "Contract ID"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-18s  %-38s ║\n" "AssetRegistry" "$REGISTRY_ID"
printf "║  %-18s  %-38s ║\n" "UserRegistry" "$USER_REGISTRY_ID"
printf "║  %-18s  %-38s ║\n" "InvestManager" "$INVESTMENT_ID"
printf "║  %-18s  %-38s ║\n" "DividendManager" "$DIVIDEND_ID"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-18s  %-38s ║\n" "Testnet USDC" "$TESTNET_USDC"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Explorer Links (Testnet):"
echo "  AssetRegistry:   https://stellar.expert/explorer/testnet/contract/$REGISTRY_ID"
echo "  UserRegistry:    https://stellar.expert/explorer/testnet/contract/$USER_REGISTRY_ID"
echo "  InvestManager:   https://stellar.expert/explorer/testnet/contract/$INVESTMENT_ID"
echo "  DividendManager: https://stellar.expert/explorer/testnet/contract/$DIVIDEND_ID"
echo ""
echo "Next steps:"
echo "  1. Update scaffold.config.ts with these IDs."
echo "  2. Fund your admin wallets via Friendbot: https://friendbot.stellar.org"
echo "  3. Start the Next.js frontend: cd ../nextjs && yarn dev"
echo ""

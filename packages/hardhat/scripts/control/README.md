# Control / upgrade scripts

Use these from the **repo root** (so `yarn` resolves correctly).

## Upgrade registry only (e.g. after VaultAssetRegistry.sol fix)

Upgrades the **VaulticAssetRegistry** proxy to the current implementation. Proxy address is unchanged; only the implementation is swapped.

```bash
yarn deploy:registry --network avalancheFuji
```

- Uses the deployer account (encrypted key: you’ll be prompted for the password).
- Deploys a new implementation and calls `upgradeToAndCall` on the existing registry proxy.
- Does **not** redeploy the Investment Manager or other contracts.

## Upgrade Investment Manager only

```bash
yarn deploy:investment-manager --network avalancheFuji
```

- On Fuji this may deploy a **new** proxy if the deploy script removes old IM artifacts (e.g. for Fuji USDC). Check the deploy script before running.
- After a new IM proxy, the registry owner must set the tokenizer again: Control panel → Registry admin → “Set tokenizer to Investment Manager”.

## Full deploy (all contracts)

```bash
yarn deploy --network avalancheFuji
```

Runs all deploy scripts in order. Use for a fresh chain or when you want to refresh every contract.

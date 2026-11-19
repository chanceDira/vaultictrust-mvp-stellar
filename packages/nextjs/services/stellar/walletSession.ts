import { getNetworkPassphrase } from "./horizonClient";
import { type WalletKit, getWalletKit } from "./walletKit";
import type { ModuleInterface } from "@creit.tech/stellar-wallets-kit/types";
import { Networks } from "@stellar/stellar-sdk";

// The kit gives each wallet 1s to answer, while Freighter and LOBSTR wait up to 2s for a sleeping extension to reply.
const DETECTION_RETRY_DELAYS_MS = [1_200, 3_000];

function selectedWallet(kit: WalletKit): ModuleInterface | null {
  try {
    return kit.selectedModule;
  } catch {
    return null;
  }
}

async function sessionAddress(kit: WalletKit): Promise<string | null> {
  try {
    const { address } = await kit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

async function isFreighter(wallet: ModuleInterface): Promise<boolean> {
  const { VARIAL_ID } = await import("@creit.tech/stellar-wallets-kit/modules/varial");
  return wallet.productId === VARIAL_ID;
}

async function silentAddress(wallet: ModuleInterface): Promise<string | null> {
  try {
    const { address } = await wallet.getAddress({ skipRequestAccess: true });
    return address || null;
  } catch {
    return null;
  }
}

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function networkName(passphrase: string): string {
  return passphrase === Networks.PUBLIC ? "Mainnet" : "Testnet";
}

export async function dropOrphanedSession(): Promise<void> {
  const kit = await getWalletKit();
  if ((await sessionAddress(kit)) && !selectedWallet(kit)) await kit.disconnect();
}

export async function connectWallet(): Promise<string> {
  const kit = await getWalletKit();
  const previousWalletId = selectedWallet(kit)?.productId ?? null;
  const hadSession = (await sessionAddress(kit)) !== null;

  const { allowedWallets } = await import("@creit.tech/stellar-wallets-kit/state");
  const retries = DETECTION_RETRY_DELAYS_MS.map(delay =>
    setTimeout(() => {
      // a wallet's in-app browser auto-connects on every list render, so a refresh would ask twice
      if (allowedWallets.value.some(wallet => wallet.isPlatformWrapper)) return;
      kit.refreshSupportedWallets().catch(() => undefined);
    }, delay),
  );

  try {
    const { address } = await kit.authModal();
    return address;
  } catch (error: unknown) {
    const switchedWallet = selectedWallet(kit)?.productId ?? null;
    if (hadSession && previousWalletId && switchedWallet !== previousWalletId) {
      kit.setWallet(previousWalletId);
    }
    throw error;
  } finally {
    retries.forEach(clearTimeout);
  }
}

async function followActiveAccount(): Promise<void> {
  const kit = await getWalletKit();
  const wallet = selectedWallet(kit);
  const current = await sessionAddress(kit);
  if (!wallet || !current || !(await isFreighter(wallet))) return;

  const active = await silentAddress(wallet);
  if (active && active !== current) await kit.fetchAddress();
}

let syncingAccount: Promise<void> | null = null;

export function syncWalletAccount(): Promise<void> {
  if (!syncingAccount) {
    syncingAccount = followActiveAccount().finally(() => {
      syncingAccount = null;
    });
  }
  return syncingAccount;
}

async function assertWalletMatches(kit: WalletKit, address: string): Promise<void> {
  const wallet = selectedWallet(kit);
  if (!wallet) throw new Error("No wallet is connected. Connect your wallet and try again.");
  if (!(await isFreighter(wallet))) return;

  const active = await silentAddress(wallet);
  if (active && active !== address) {
    throw new Error(
      `${wallet.productName} is set to account ${shortAddress(active)}. Switch back to ${shortAddress(address)} or reconnect.`,
    );
  }

  const expected = getNetworkPassphrase();
  const walletPassphrase = await wallet.getNetwork().then(
    network => network.networkPassphrase,
    () => null,
  );
  if (walletPassphrase && walletPassphrase !== expected) {
    throw new Error(
      `${wallet.productName} is on another network. Switch it to ${networkName(expected)} and try again.`,
    );
  }
}

export async function signWalletTransaction(xdr: string, address: string): Promise<string> {
  const kit = await getWalletKit();
  await assertWalletMatches(kit, address);
  const { signedTxXdr } = await kit.signTransaction(xdr, {
    networkPassphrase: getNetworkPassphrase(),
    address,
  });

  if (!signedTxXdr) {
    throw new Error("The wallet did not return a signed transaction");
  }

  return signedTxXdr;
}

import { getNetworkPassphrase } from "./horizonClient";
import { Networks } from "@stellar/stellar-sdk";

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const KIT_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

type KitTheme = {
  background: string;
  "background-secondary": string;
  "foreground-strong": string;
  foreground: string;
  "foreground-secondary": string;
  primary: string;
  "primary-foreground": string;
  transparent: string;
  lighter: string;
  light: string;
  "light-gray": string;
  gray: string;
  danger: string;
  border: string;
  shadow: string;
  "border-radius": string;
  "font-family": string;
};

const kitThemeShared = {
  transparent: "rgba(0, 0, 0, 0)",
  lighter: "#fbfbfe",
  light: "#f5f3ff",
  "light-gray": "#ddd6fe",
  gray: "#71717a",
  danger: "#ef4444",
  shadow: "0 10px 15px -3px rgba(0, 0, 0, 0.12)",
  "border-radius": "1rem",
  "font-family": KIT_FONT,
} as const;

function activeNetwork(): Networks {
  const passphrase = getNetworkPassphrase();
  if (passphrase === Networks.PUBLIC) return Networks.PUBLIC;
  return Networks.TESTNET;
}

export function readSiteIsDark(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  return root.getAttribute("data-theme") === "dark" || root.classList.contains("dark");
}

function siteKitTheme(isDark: boolean): KitTheme {
  if (isDark) {
    return {
      ...kitThemeShared,
      background: "#0a0a0a",
      "background-secondary": "#111111",
      "foreground-strong": "#f5f3ff",
      foreground: "#f5f3ff",
      "foreground-secondary": "#c4b5fd",
      primary: "#8b5cf6",
      "primary-foreground": "#ffffff",
      border: "#171717",
    };
  }

  return {
    ...kitThemeShared,
    background: "#ffffff",
    "background-secondary": "#fbfbfe",
    "foreground-strong": "#171717",
    foreground: "#171717",
    "foreground-secondary": "#52525b",
    primary: "#7c3aed",
    "primary-foreground": "#ffffff",
    border: "#f5f3ff",
  };
}

async function startKit() {
  const [{ StellarWalletsKit }, { defaultModules }] = await Promise.all([
    import("@creit.tech/stellar-wallets-kit/sdk"),
    import("@creit.tech/stellar-wallets-kit/modules/utils"),
  ]);

  const modules = [...defaultModules()];
  if (WALLETCONNECT_PROJECT_ID) {
    const { WalletConnectModule, WalletConnectTargetChain } = await import(
      "@creit.tech/stellar-wallets-kit/modules/wallet-connect"
    );
    const chain =
      activeNetwork() === Networks.PUBLIC ? WalletConnectTargetChain.PUBLIC : WalletConnectTargetChain.TESTNET;
    modules.push(
      new WalletConnectModule({
        projectId: WALLETCONNECT_PROJECT_ID,
        allowedChains: [chain],
        metadata: {
          name: "VTrust Africa",
          description: "Buy shares in real assets on Stellar.",
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.ico`],
        },
      }),
    );
  }

  StellarWalletsKit.init({
    modules,
    network: activeNetwork(),
    theme: siteKitTheme(readSiteIsDark()),
  });

  return StellarWalletsKit;
}

type WalletKit = Awaited<ReturnType<typeof startKit>>;

let startingKit: Promise<WalletKit> | null = null;

export async function syncWalletKitTheme(isDark = readSiteIsDark()): Promise<void> {
  const kit = await getWalletKit();
  kit.setTheme(siteKitTheme(isDark));
}

export async function getWalletKit(): Promise<WalletKit> {
  if (typeof window === "undefined") {
    throw new Error("A wallet can only be used in the browser");
  }

  if (!startingKit) {
    startingKit = startKit().catch((error: unknown) => {
      startingKit = null;
      throw error;
    });
  }

  return startingKit;
}

export async function signWalletTransaction(xdr: string, address: string): Promise<string> {
  const kit = await getWalletKit();
  const { signedTxXdr } = await kit.signTransaction(xdr, {
    networkPassphrase: getNetworkPassphrase(),
    address,
  });

  if (!signedTxXdr) {
    throw new Error("The wallet did not return a signed transaction");
  }

  return signedTxXdr;
}

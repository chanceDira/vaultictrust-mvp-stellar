type EnvSpec = { key: string; optional?: boolean };

const SERVER_ENV: EnvSpec[] = [{ key: "PINATA_JWT" }];

const CLIENT_ENV: EnvSpec[] = [
  { key: "NEXT_PUBLIC_STELLAR_NETWORK", optional: true },
  { key: "NEXT_PUBLIC_HORIZON_URL", optional: true },
  { key: "NEXT_PUBLIC_SOROBAN_RPC_URL", optional: true },
];

export function validateEnv() {
  const isServer = typeof window === "undefined";
  const errors: string[] = [];
  const specs = isServer ? [...SERVER_ENV, ...CLIENT_ENV] : CLIENT_ENV;

  for (const spec of specs) {
    if (!process.env[spec.key] && !spec.optional) {
      errors.push(`${spec.key} is required but not set`);
    }
  }

  if (errors.length > 0) {
    const msg = `env validation failed:\n${errors.map(e => `  - ${e}`).join("\n")}`;
    if (isServer) throw new Error(msg);
    else console.warn(`[env] ${msg}`);
  }
}

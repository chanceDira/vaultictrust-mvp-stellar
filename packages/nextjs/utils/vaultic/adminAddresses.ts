const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;

export function parseAdminAddresses(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  const addresses: string[] = [];
  for (const part of raw.split(",")) {
    const address = part.trim();
    if (!STELLAR_ACCOUNT.test(address) || addresses.includes(address)) continue;
    addresses.push(address);
  }
  return addresses;
}

export function adminAddresses(): readonly string[] {
  return parseAdminAddresses(process.env.NEXT_PUBLIC_ADMIN_ADDRESSES);
}

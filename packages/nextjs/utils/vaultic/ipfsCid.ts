const CID_PATTERN = /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,128})$/;

export function isIpfsCid(value: string): boolean {
  return CID_PATTERN.test(value);
}

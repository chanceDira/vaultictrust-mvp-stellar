const BADGE_ATTRIBUTE = "data-vtrust-recommended";
const SVG_NS = "http://www.w3.org/2000/svg";
const STAR_PATH =
  "M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z";
const BADGE_STYLE = [
  "display:inline-flex",
  "align-items:center",
  "gap:4px",
  "padding:2px 8px",
  "border-radius:9999px",
  "background:var(--swk-primary)",
  "color:var(--swk-primary-foreground)",
  "font-size:11px",
  "font-weight:700",
  "line-height:16px",
  "white-space:nowrap",
].join(";");

function starIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("width", "12");
  svg.setAttribute("height", "12");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("fill-rule", "evenodd");
  path.setAttribute("clip-rule", "evenodd");
  path.setAttribute("d", STAR_PATH);
  svg.appendChild(path);
  return svg;
}

function recommendedBadge(): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.setAttribute(BADGE_ATTRIBUTE, "");
  badge.style.cssText = BADGE_STYLE;
  badge.append(starIcon(), "Recommended");
  return badge;
}

function tagWalletRow(walletName: string): void {
  document.querySelectorAll(`li img[alt="${walletName} icon"]`).forEach(icon => {
    const row = icon.closest("li");
    const label = row?.querySelector("p");
    if (!label || row?.querySelector(`[${BADGE_ATTRIBUTE}]`)) return;
    label.after(recommendedBadge());
  });
}

// the kit renders its wallet list with preact and offers no hook for row content, so the badge is added after each render
export function markRecommendedWallet(walletName: string): () => void {
  tagWalletRow(walletName);
  const observer = new MutationObserver(() => tagWalletRow(walletName));
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

"use client";

import { type ReactElement, type ReactNode, useEffect, useState } from "react";

type MarqueeTrackProps = {
  durationSec: number;
  children: ReactNode;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reduced;
}

export function MarqueeTrack({ durationSec, children }: MarqueeTrackProps): ReactElement {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="asset-marquee">
      <div className="asset-marquee__track" style={reduced ? undefined : { animationDuration: `${durationSec}s` }}>
        <div className="asset-marquee__set">{children}</div>
        {reduced ? null : (
          <div className="asset-marquee__set" aria-hidden inert>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

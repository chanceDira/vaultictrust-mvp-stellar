import type { ReactElement } from "react";
import Link from "next/link";

type AudienceColumnProps = {
  title: string;
  intro: string;
  points: string[];
  linkLabel: string;
  linkHref: string;
};

export function AudienceColumn({ title, intro, points, linkLabel, linkHref }: AudienceColumnProps): ReactElement {
  return (
    <div>
      <h3 className="text-xl font-bold text-base-content">{title}</h3>
      <p className="mt-2 text-base font-medium leading-relaxed text-base-content/70">{intro}</p>
      <ul className="mt-5 divide-y divide-base-300 border-y border-base-300">
        {points.map(point => (
          <li key={point} className="py-3 text-sm font-medium leading-relaxed text-base-content/80 sm:text-base">
            {point}
          </li>
        ))}
      </ul>
      <Link href={linkHref} className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
        {linkLabel}
      </Link>
    </div>
  );
}

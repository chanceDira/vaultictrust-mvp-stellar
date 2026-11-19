import type { ComponentType, ReactElement, SVGProps } from "react";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "@heroicons/react/24/outline";

type PanelLink = {
  label: string;
  href: string;
};

type AudiencePanelProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  audience: string;
  title: string;
  points: string[];
  primary: PanelLink;
  secondary: PanelLink;
  highlighted?: boolean;
};

export function AudiencePanel({
  icon: Icon,
  audience,
  title,
  points,
  primary,
  secondary,
  highlighted = false,
}: AudiencePanelProps): ReactElement {
  const frame = highlighted
    ? "border-primary/30 bg-gradient-to-br from-primary/10 via-base-100 to-base-100"
    : "border-base-300 bg-base-100";

  return (
    <article className={`flex h-full flex-col rounded-3xl border p-6 sm:p-8 ${frame}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-content">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-sm font-bold text-primary">{audience}</p>
      </div>
      <h3 className="mt-5 text-2xl font-bold tracking-tight text-base-content">{title}</h3>
      <ul className="mt-6 flex-1 space-y-3">
        {points.map(point => (
          <li key={point} className="flex gap-3 text-base font-medium leading-relaxed text-base-content/80">
            <CheckIcon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href={primary.href} className="btn btn-primary gap-2 rounded-xl px-6 font-bold">
          {primary.label}
          <ArrowRightIcon className="h-4 w-4" aria-hidden />
        </Link>
        <Link href={secondary.href} className="btn btn-ghost rounded-xl px-6 font-bold text-primary">
          {secondary.label}
        </Link>
      </div>
    </article>
  );
}

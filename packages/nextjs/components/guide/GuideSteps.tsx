import type { ReactElement } from "react";
import Link from "next/link";
import type { GuideStep } from "~~/utils/vaultic/guideContent";

type GuideStepsProps = {
  steps: GuideStep[];
};

export function GuideSteps({ steps }: GuideStepsProps): ReactElement {
  return (
    <ol className="divide-y divide-base-300 border-y border-base-300">
      {steps.map((step, index) => (
        <li key={step.title} className="grid gap-1 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-4">
          <span className="text-sm font-semibold tabular-nums text-base-content/40 sm:pt-0.5">{index + 1}</span>
          <div>
            <h3 className="font-bold text-base-content">{step.title}</h3>
            <p className="mt-1 text-sm font-medium leading-relaxed text-base-content/75 sm:text-base">
              {step.description}
            </p>
            {step.link ? (
              <Link
                href={step.link.href}
                className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
              >
                {step.link.label}
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

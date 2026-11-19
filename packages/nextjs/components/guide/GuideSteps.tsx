import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { GuideStep } from "~~/utils/vaultic/guideContent";

type GuideStepsProps = {
  steps: GuideStep[];
};

export function GuideSteps({ steps }: GuideStepsProps): ReactElement {
  return (
    <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-5 before:top-6 before:w-px before:bg-primary/25">
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-5">
          <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-content shadow-lg shadow-primary/20">
            {index + 1}
          </span>
          <div className="flex-1 rounded-2xl border border-base-300 bg-base-100 p-5">
            <h3 className="text-lg font-bold text-base-content">{step.title}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-base-content/75 sm:text-base">
              {step.description}
            </p>
            {step.link ? (
              <Link
                href={step.link.href}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                {step.link.label}
                <ArrowRightIcon className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

import type { ReactElement } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { FaqEntry } from "~~/utils/vaultic/faqEntries";

type FaqListProps = {
  entries: FaqEntry[];
};

export function FaqList({ entries }: FaqListProps): ReactElement {
  return (
    <div className="divide-y divide-base-300 rounded-3xl border border-base-300 bg-base-100">
      {entries.map(entry => (
        <details key={entry.question} className="landing-faq group px-5 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-bold text-base-content">
            {entry.question}
            <PlusIcon
              className="landing-faq__icon h-5 w-5 shrink-0 text-primary transition-transform duration-200"
              aria-hidden
            />
          </summary>
          <p className="pb-5 text-sm font-medium leading-relaxed text-base-content/75 sm:text-base">{entry.answer}</p>
        </details>
      ))}
    </div>
  );
}

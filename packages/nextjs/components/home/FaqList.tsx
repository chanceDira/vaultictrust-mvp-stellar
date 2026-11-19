import type { ReactElement } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { FaqEntry } from "~~/utils/vaultic/faqEntries";

type FaqListProps = {
  entries: FaqEntry[];
};

export function FaqList({ entries }: FaqListProps): ReactElement {
  return (
    <div className="divide-y divide-base-300 border-y border-base-300">
      {entries.map(entry => (
        <details key={entry.question} className="landing-faq">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-bold text-base-content">
            {entry.question}
            <ChevronDownIcon
              className="landing-faq__icon h-4 w-4 shrink-0 text-base-content/50 transition-transform"
              aria-hidden
            />
          </summary>
          <p className="pb-4 text-sm font-medium leading-relaxed text-base-content/75 sm:text-base">{entry.answer}</p>
        </details>
      ))}
    </div>
  );
}

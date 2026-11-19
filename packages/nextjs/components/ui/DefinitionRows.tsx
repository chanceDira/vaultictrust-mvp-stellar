import type { ReactElement } from "react";

type DefinitionRow = {
  title: string;
  description: string;
};

type DefinitionRowsProps = {
  rows: DefinitionRow[];
};

export function DefinitionRows({ rows }: DefinitionRowsProps): ReactElement {
  return (
    <dl className="divide-y divide-base-300 border-y border-base-300">
      {rows.map(row => (
        <div key={row.title} className="grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
          <dt className="font-bold text-base-content">{row.title}</dt>
          <dd className="text-sm font-medium leading-relaxed text-base-content/75 sm:text-base">{row.description}</dd>
        </div>
      ))}
    </dl>
  );
}

import type { ReactElement, ReactNode } from "react";

type SectionHeadingProps = {
  title: string;
  children?: ReactNode;
};

export function SectionHeading({ title, children }: SectionHeadingProps): ReactElement {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">{title}</h2>
      {children ? <p className="mt-3 text-base font-medium leading-relaxed text-base-content/70">{children}</p> : null}
    </div>
  );
}

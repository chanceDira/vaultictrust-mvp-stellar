import type { ReactElement, ReactNode } from "react";

type SectionHeadingProps = {
  label: string;
  title: string;
  children?: ReactNode;
  tone?: "default" | "inverse";
};

export function SectionHeading({ label, title, children, tone = "default" }: SectionHeadingProps): ReactElement {
  const inverse = tone === "inverse";
  return (
    <div className="max-w-2xl">
      <p className={`text-sm font-bold ${inverse ? "text-primary-content/80" : "text-primary"}`}>{label}</p>
      <h2
        className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${
          inverse ? "text-primary-content" : "text-base-content"
        }`}
      >
        {title}
      </h2>
      {children ? (
        <p
          className={`mt-4 text-base font-medium leading-relaxed sm:text-lg ${
            inverse ? "text-primary-content/85" : "text-base-content/75"
          }`}
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}

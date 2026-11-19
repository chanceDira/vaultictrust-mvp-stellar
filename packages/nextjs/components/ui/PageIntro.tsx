import type { ReactElement, ReactNode } from "react";

type PageIntroProps = {
  label: string;
  title: string;
  lede: string;
  children?: ReactNode;
};

export function PageIntro({ label, title, lede, children }: PageIntroProps): ReactElement {
  return (
    <section className="relative overflow-hidden border-b border-base-300/80 px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-12">
      <div className="landing-dots" aria-hidden />
      <div className="relative mx-auto w-full max-w-7xl">
        <p className="text-sm font-bold text-primary">{label}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-base-content sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-base-content/80 sm:text-lg">{lede}</p>
        {children ? <div className="mt-8 flex flex-col gap-3 sm:flex-row">{children}</div> : null}
      </div>
    </section>
  );
}

import type { ReactElement, ReactNode } from "react";

type PageIntroProps = {
  title: string;
  lede: string;
  children?: ReactNode;
};

export function PageIntro({ title, lede, children }: PageIntroProps): ReactElement {
  return (
    <section className="border-b border-base-300/80 px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-base-content sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-base-content/75 sm:text-lg">{lede}</p>
        {children ? <div className="mt-8 flex flex-col gap-3 sm:flex-row">{children}</div> : null}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

type SwitchThemeProps = {
  className?: string;
};

export const SwitchTheme = ({ className = "" }: SwitchThemeProps): ReactElement => {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDarkMode = resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  const switchTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  if (!mounted) {
    return <span className={`inline-block h-8 w-8 ${className}`} aria-hidden />;
  }

  const label = isDarkMode ? "Use light theme" : "Use dark theme";

  return (
    <button
      type="button"
      onClick={switchTheme}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-base-content/75 transition-colors hover:bg-base-200 hover:text-base-content ${className}`}
    >
      {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
};

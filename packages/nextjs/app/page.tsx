"use client";

import React from "react";
import Link from "next/link";
import type { NextPage } from "next";
import {
  ArrowRightIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  CubeIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";

const ASSET_PREVIEWS = [
  { label: "Real Estate", value: "RWF 1.2B", icon: BuildingOffice2Icon },
  { label: "Carbon Credits", value: "52,000 tCO2e", icon: SparklesIcon },
  { label: "Treasury Bills", value: "12% APY", icon: CurrencyDollarIcon },
  { label: "Commodities", value: "Gold/Tea", icon: CubeIcon },
  { label: "Infrastructure", value: "Power/Water", icon: GlobeAltIcon },
  { label: "Location Oracles", value: "DePIN", icon: MapPinIcon },
];

const FEATURES = ["Regulated On/Off-Ramp", "Proof-of-Asset Oracles", "Escrow & Custody", "Secondary Liquidity"];

const HOW_IT_WORKS = [
  {
    title: "Asset owners",
    description: "Submit real-world assets with documentation. Choose whole-asset sale or fractional tokenization.",
    href: "/owner",
    label: "Owner dashboard",
    icon: BuildingOffice2Icon,
  },
  {
    title: "Marketplace",
    description: "Browse tokenized assets. Invest in whole assets or buy fractions with on-chain ownership.",
    href: "/marketplace",
    label: "Browse marketplace",
    icon: CubeIcon,
  },
  {
    title: "Investors",
    description: "View your portfolio. Track whole-asset and fractional holdings with transparent funding progress.",
    href: "/investor",
    label: "View portfolio",
    icon: WalletIcon,
  },
];

const STELLAR_ADVANTAGES = [
  {
    icon: BoltIcon,
    title: "3–5 Second Finality",
    desc: "Stellar confirms transactions in seconds — not minutes.",
  },
  {
    icon: CurrencyDollarIcon,
    title: "Fractions of a Cent",
    desc: "Fees as low as 0.00001 XLM. Accessible at any scale.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Native Compliance",
    desc: "Built-in trustlines act as a KYC/whitelist layer by design.",
  },
  {
    icon: GlobeAltIcon,
    title: "Global Reach",
    desc: "ISO 20022 compatible. Connects to real payment rails.",
  },
];

const Home: NextPage = () => {
  return (
    <div className="min-h-0 flex flex-col">
      <section className="relative px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl opacity-50" />
          <div className="absolute top-1/4 right-0 h-[600px] w-[600px] rounded-full bg-violet-600/5 blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 h-[600px] w-[600px] rounded-full bg-indigo-600/5 blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-4xl text-center relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary sm:text-sm mb-6">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Now on Stellar Network
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-base-content sm:text-5xl lg:text-6xl xl:text-7xl xl:leading-[1.1]">
            Tokenize Africa&apos;s <span className="text-primary">Real Economy</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-base-content/80 sm:mt-8 sm:text-lg">
            Vaultic Trust is the compliant RWA tokenization layer for Rwanda and Africa. Fractionalize real estate,
            commodities, carbon credits, and infrastructure into programmable, liquid digital assets — backed by
            verifiable proofs and powered by <span className="font-semibold text-primary">Stellar</span>.
          </p>
          <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-4 sm:mt-12 sm:flex-row sm:items-center sm:gap-5 md:gap-6">
            <Link
              href="/owner"
              className="stellar-glow btn btn-primary btn-lg min-h-14 flex flex-1 items-center justify-center gap-2 rounded-2xl px-12 font-black uppercase tracking-widest sm:flex-initial sm:flex-none"
            >
              Get Early Access
              <ArrowRightIcon className="h-5 w-5 shrink-0" />
            </Link>
            <Link
              href="/litepaper"
              className="btn btn-outline btn-lg min-h-14 flex flex-1 items-center justify-center rounded-2xl border-2 border-base-content/10 px-12 font-black uppercase tracking-widest hover:bg-base-200 sm:flex-initial sm:flex-none"
            >
              Litepaper
            </Link>
          </div>
          <p className="mt-10 text-sm font-medium tracking-wide text-base-content/60 sm:mt-12">
            Compliance-first · KYC/AML · Auditable · Stellar Network
          </p>
          <ul className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-x-8 gap-y-3 sm:mt-8 sm:gap-x-10">
            {FEATURES.map((item, i) => (
              <li key={i} className="flex items-center justify-center gap-2 text-sm text-base-content/85 sm:text-base">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-primary" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-base-300/80 bg-base-200/60 py-16 lg:py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mb-8 sm:mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/90 sm:text-sm">Preview</p>
            <h2 className="mt-1 text-xl font-bold text-base-content sm:text-2xl lg:text-3xl">Asset Tokenization</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-6 lg:gap-6">
            {ASSET_PREVIEWS.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-base-300 bg-base-100/50 backdrop-blur-sm p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 sm:p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-11 sm:w-11">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <p className="mt-3 font-semibold text-base-content sm:text-sm">{label}</p>
                <p className="mt-1 text-xs font-medium text-base-content/60">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-base-300 bg-base-100/40 backdrop-blur-md p-6 shadow-2xl shadow-primary/5 sm:mt-10 sm:p-8 lg:p-10">
            <p className="font-bold text-base-content sm:text-lg">VT-RWA: Kigali Green Tower</p>
            <p className="mt-2 text-sm leading-relaxed text-base-content/60">
              Supply: 1,000,000 VT-KGT · Standard: SEP-0041 (Stellar Asset Contract) · Oracle: Stellar Oracle · Custody:
              Qualified Trustee
            </p>
            <div className="mt-5 sm:mt-6">
              <div className="mb-2 flex justify-between text-sm font-medium text-base-content/70">
                <span>Funding progress</span>
                <span>65%</span>
              </div>
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-base-300/80"
                role="progressbar"
                aria-valuenow={65}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: "65%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-base-100 py-16 lg:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <div className="mb-12 text-center lg:mb-14">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary/90">Product</p>
            <h2 className="text-2xl font-bold text-base-content sm:text-3xl">How it works</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {HOW_IT_WORKS.map(({ title, description, href, label, icon: Icon }) => (
              <Link
                key={title}
                href={href}
                className="group rounded-3xl border border-base-300 bg-base-100/40 backdrop-blur-md p-6 text-left shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 sm:p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-base-content">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-base-content/70">{description}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-all group-hover:gap-2.5">
                  {label}
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-base-300/80 bg-base-200/60 py-16 lg:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary/90">Infrastructure</p>
            <h2 className="text-2xl font-bold text-base-content sm:text-3xl">Why Stellar?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-base-content/70">
              Stellar is purpose-built for real-world asset tokenization — fast, cheap, and compliance-ready by design.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STELLAR_ADVANTAGES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-base-300/70 bg-base-100 p-5 shadow-sm hover:border-primary/20 hover:shadow-md transition-all"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-semibold text-base-content text-sm">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-base-content/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-base-300/80 bg-base-200/50 py-8 sm:py-10">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <p className="text-center text-sm text-base-content/70">
            Built on{" "}
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary hover:opacity-80 transition-opacity"
            >
              Stellar Network
            </a>{" "}
            for fast settlement and minimal fees. On-chain asset ownership and funding progress.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;

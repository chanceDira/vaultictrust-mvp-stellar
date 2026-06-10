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
import { FeaturedAssetsShowcase } from "~~/components/home/FeaturedAssetsShowcase";
import { EARLY_ACCESS_FORM_URL } from "~~/scaffold.config";

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
    title: "3 to 5 second finality",
    desc: "Stellar confirms transactions in seconds, not minutes.",
  },
  {
    icon: CurrencyDollarIcon,
    title: "Fractions of a cent",
    desc: "Fees as low as 0.00001 XLM. Accessible at any scale.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Native compliance",
    desc: "Built-in trustlines act as a KYC and whitelist layer by design.",
  },
  {
    icon: GlobeAltIcon,
    title: "Global reach",
    desc: "ISO 20022 compatible. Connects to real payment rails.",
  },
];

const Home: NextPage = () => {
  return (
    <div className="flex min-h-0 flex-col">
      <section className="relative overflow-hidden px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/10 opacity-50 blur-3xl" />
          <div className="absolute top-1/4 right-0 h-[600px] w-[600px] rounded-full bg-violet-600/5 blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 h-[600px] w-[600px] rounded-full bg-indigo-600/5 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="text-center">
            <div className="hero-live-banner" role="status">
              <span className="hero-live-banner__scan" aria-hidden />
              <span className="hero-live-banner__dot ml-1" aria-hidden />
              <span className="hero-eyebrow relative z-[1]">Now on Stellar Network</span>
            </div>
            <h1 className="display-headline mt-2">
              Tokenize Africa&apos;s <span className="text-primary">Real Economy</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-base-content/80 sm:mt-8 sm:text-lg lg:max-w-4xl">
              Vaultic Trust is the compliant RWA tokenization layer for Rwanda and Africa. Fractionalize real estate,
              commodities, carbon credits, and infrastructure into programmable, liquid digital assets, backed by
              verifiable proofs and powered by <span className="font-semibold text-primary">Stellar</span>.
            </p>
          </div>

          <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-12 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            <a
              href={EARLY_ACCESS_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg stellar-glow min-h-14 flex-1 gap-2 rounded-2xl px-8 text-sm font-bold uppercase tracking-widest sm:max-w-xs sm:flex-initial sm:px-10"
            >
              Get Early Access
              <ArrowRightIcon className="h-5 w-5 shrink-0" />
            </a>
            <Link
              href="/litepaper"
              className="btn btn-outline btn-lg min-h-14 flex-1 rounded-2xl border-2 border-base-content/10 px-8 text-sm font-bold uppercase tracking-widest hover:bg-base-200 sm:max-w-xs sm:flex-initial sm:px-10"
            >
              Litepaper
            </Link>
          </div>

          <p className="mt-10 text-center text-xs font-medium uppercase tracking-[0.15em] text-base-content/50 sm:mt-12 sm:text-sm">
            Compliance-first. KYC/AML. Auditable. Stellar Network.
          </p>

          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-4">
            {FEATURES.map(item => (
              <li
                key={item}
                className="flex items-center justify-center gap-2 rounded-xl border border-base-300/60 bg-base-100/40 px-4 py-3 text-sm text-base-content/80 sm:justify-start lg:py-4"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-primary" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-base-300/80 bg-base-200/50 py-16 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="landing-section-head mb-10 sm:mb-14">
            <p className="section-eyebrow">Preview</p>
            <h2 className="landing-section-title">Asset tokenization</h2>
            <p className="landing-section-desc">
              From real estate to carbon credits. Fractional shares on Stellar with on-chain lifecycle and compliance
              built in.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6 lg:gap-5">
            {ASSET_PREVIEWS.map(({ label, value, icon: Icon }) => (
              <div key={label} className="landing-stat-card group">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <p className="mt-3 text-sm font-semibold text-base-content">{label}</p>
                <p className="mt-1 text-xs font-medium text-base-content/55">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 w-full sm:mt-16">
            <div className="mb-6 text-center sm:mb-8">
              <p className="section-eyebrow">Live listings</p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-base-content sm:text-2xl">
                Featured marketplace assets
              </h3>
            </div>
            <FeaturedAssetsShowcase />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-base-100 py-16 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="landing-section-head mb-12 sm:mb-14">
            <p className="section-eyebrow">Product</p>
            <h2 className="landing-section-title">How it works</h2>
            <p className="landing-section-desc">
              Three paths: owners tokenize, investors participate, and everything stays auditable on Stellar.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {HOW_IT_WORKS.map(({ title, description, href, label, icon: Icon }) => (
              <Link
                key={title}
                href={href}
                className="group flex h-full flex-col rounded-3xl border border-base-300/80 bg-base-100/60 p-6 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/5 sm:p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-base-content">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-base-content/70">{description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-all group-hover:gap-2.5">
                  {label}
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-base-300/80 bg-base-200/50 py-16 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="landing-section-head mb-12 sm:mb-14">
            <p className="section-eyebrow">Infrastructure</p>
            <h2 className="landing-section-title">Why Stellar?</h2>
            <p className="landing-section-desc">
              Purpose-built for real-world asset tokenization. Fast settlement, low fees, and compliance-ready by
              design.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {STELLAR_ADVANTAGES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-base-300/80 bg-base-100/70 p-5 text-center shadow-sm transition-all hover:border-primary/25 hover:shadow-md sm:p-6 sm:text-left"
              >
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary sm:mx-0">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-base-content">{title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-base-content/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

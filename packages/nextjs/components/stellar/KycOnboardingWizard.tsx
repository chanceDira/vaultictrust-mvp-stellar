import React, { useState } from "react";
import {
  CheckCircleIcon,
  FingerPrintIcon,
  IdentificationIcon,
  InformationCircleIcon,
  LockClosedIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { submitKyc } from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/scaffold-eth";

interface KycOnboardingWizardProps {
  publicKey: string;
  onComplete: () => void;
}

type WizardStep = "intro" | "data" | "proof" | "submit" | "success";

export const KycOnboardingWizard: React.FC<KycOnboardingWizardProps> = ({ publicKey, onComplete }) => {
  const [step, setStep] = useState<WizardStep>("intro");
  const [formData, setFormData] = useState({
    fullName: "",
    documentId: "",
    country: "Rwanda",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to generate a ZK-Commitment Hash using Web Crypto API
  const generateCommitment = async () => {
    const encoder = new TextEncoder();
    const secret = window.crypto.getRandomValues(new Uint8Array(16));
    const dataString = JSON.stringify({ ...formData, secret: Array.from(secret) });
    const data = encoder.encode(dataString);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hashBuffer);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const id = notification.loading("Generating Commitment & Submitting On-Chain...");
    try {
      const commitment = await generateCommitment();
      // For the URI, we'll use a mock CID representing the user's data (encrypted)
      // In a real app, we'd upload to IPFS here.
      const mockCid = `ipfs://vaultic_kyc_${Math.random().toString(36).substring(7)}`;

      await submitKyc(mockCid, commitment, publicKey);
      notification.success("KYC Details Submitted Successfully!");
      setStep("success");
    } catch (e: any) {
      notification.error(`Submission failed: ${e.message}`);
    } finally {
      setIsSubmitting(false);
      notification.remove(id);
    }
  };

  return (
    <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl overflow-hidden max-w-xl w-full mx-auto">
      {/* Progress Header */}
      <div className="bg-base-200/50 p-6 border-b border-base-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl">
            <IdentificationIcon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-bold uppercase tracking-tight text-sm">Investor Verification</h2>
        </div>
        <div className="flex gap-1.5">
          {(["intro", "data", "submit", "success"] as WizardStep[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 w-6 rounded-full transition-all ${
                ["intro", "data", "submit", "success"].indexOf(step) >= i ? "bg-primary" : "bg-base-300"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-8">
        {step === "intro" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-2xl font-bold mb-4">Unlock High-Yield RWAs</h3>
            <p className="text-base-content/60 mb-6 leading-relaxed">
              To comply with global financial regulations and ensure a secure marketplace, Vaultic Trust requires all
              investors to complete a one-time verification.
            </p>
            <div className="space-y-4 mb-8">
              {[
                {
                  icon: LockClosedIcon,
                  title: "Privacy First",
                  desc: "Your data is hashed and never stored unencrypted.",
                },
                {
                  icon: ShieldCheckIcon,
                  title: "Regulatory Compliance",
                  desc: "Access institutional-grade real estate & mineral assets.",
                },
                { icon: FingerPrintIcon, title: "ZK-Ready", desc: "Prepare for a decentralized identity future." },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="bg-base-200 rounded-lg p-2 h-fit">
                    <item.icon className="h-5 w-5 text-base-content/40" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{item.title}</h4>
                    <p className="text-xs text-base-content/50">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary w-full rounded-xl" onClick={() => setStep("data")}>
              Get Started
            </button>
          </div>
        )}

        {step === "data" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold mb-6">Personal Attributes</h3>
            <div className="space-y-4 mb-8">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs font-bold uppercase tracking-widest opacity-50">
                    Full Legal Name
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="input input-bordered rounded-xl"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs font-bold uppercase tracking-widest opacity-50">
                    Identity Document Number
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="ID / Passport / Resident Card"
                  className="input input-bordered rounded-xl"
                  value={formData.documentId}
                  onChange={e => setFormData({ ...formData, documentId: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs font-bold uppercase tracking-widest opacity-50">
                    Tax Residency
                  </span>
                </label>
                <select
                  className="select select-bordered rounded-xl"
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                >
                  <option>Rwanda</option>
                  <option>Kenya</option>
                  <option>Nigeria</option>
                  <option>South Africa</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1 rounded-xl" onClick={() => setStep("intro")}>
                Back
              </button>
              <button
                className="btn btn-primary flex-1 rounded-xl"
                disabled={!formData.fullName || !formData.documentId}
                onClick={() => setStep("submit")}
              >
                Review & Confirm
              </button>
            </div>
          </div>
        )}

        {step === "submit" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <RocketLaunchIcon className="h-10 w-10 text-primary animate-bounce" />
            </div>
            <h3 className="text-xl font-bold mb-4">Generate Proof</h3>
            <p className="text-sm text-base-content/60 mb-8 max-w-sm mx-auto">
              A unique SHA-256 commitment will be generated from your data. This commitment stays on the Stellar ledger,
              while your raw data is securely linked.
            </p>
            <div className="bg-base-200 rounded-2xl p-4 mb-8 text-left border border-base-300">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest opacity-40">
                <InformationCircleIcon className="h-4 w-4" />
                Commitment Info
              </div>
              <code className="text-[10px] break-all opacity-70">
                {`{ "owner": "${publicKey.substring(0, 8)}...", "algorithm": "SHA-256", "type": "KYC_COMMITMENT" }`}
              </code>
            </div>
            <div className="flex gap-3">
              <button
                className="btn btn-ghost flex-1 rounded-xl"
                onClick={() => setStep("data")}
                disabled={isSubmitting}
              >
                Edit Info
              </button>
              <button className="btn btn-primary flex-1 rounded-xl" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <span className="loading loading-spinner" /> : "Submit to Ledger"}
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="animate-in zoom-in-95 duration-500 text-center py-4">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-500/5">
              <CheckCircleIcon className="h-12 w-12 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-base-content">Submitted!</h3>
            <p className="text-base-content/60 mb-8 max-w-xs mx-auto">
              Your application is now on-chain. The Vaultic compliance team will review your commitment hash and
              metadata shortly.
            </p>
            <button className="btn btn-success w-full rounded-xl" onClick={onComplete}>
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

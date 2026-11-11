"use client";

import Image from "next/image";
import { KYC_CONFIG } from "./constants";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { getExplorerTxUrl } from "~~/scaffold.config";
import { KycStatusTag, UserRecord } from "~~/types/stellar";

type KycApplicantMeta = {
  fullName?: string;
  country?: string;
  submittedAt?: string;
};

type Props = {
  foundUser: UserRecord;
  kycApplicantMeta: KycApplicantMeta | null;
  adminOrgKey: string;
  setAdminOrgKey: (v: string) => void;
  decryptedFileUrl: string | null;
  setDecryptedFileUrl: (v: string | null) => void;
  isDecrypting: boolean;
  isUpdatingKyc: boolean;
  explorerTxHash: string | null;
  onUpdateKyc: (e: React.MouseEvent, status: number) => void;
  onDecryptIdentity: () => void;
};

function statusMatches(user: UserRecord, tag: KycStatusTag): boolean {
  return user.status.tag === tag;
}

export function KycUserDetail({
  foundUser,
  kycApplicantMeta,
  adminOrgKey,
  setAdminOrgKey,
  decryptedFileUrl,
  setDecryptedFileUrl,
  isDecrypting,
  isUpdatingKyc,
  explorerTxHash,
  onUpdateKyc,
  onDecryptIdentity,
}: Readonly<Props>) {
  const statusCfg = KYC_CONFIG[foundUser.status.tag] ?? KYC_CONFIG.None;

  return (
    <div className="mt-8 p-6 rounded-xl bg-base-200/50 border border-base-300 animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">User Address</p>
          <p className="font-mono text-sm break-all">{foundUser.address}</p>

          <div className="mt-4 flex items-center gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">Current Status</p>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">Last Updated</p>
              <p className="text-sm">{new Date(Number(foundUser.updated_at) * 1000).toLocaleString()}</p>
            </div>
          </div>

          {explorerTxHash && (
            <a
              href={getExplorerTxUrl(explorerTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-2"
            >
              Last tx on Explorer <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
          )}

          {foundUser.metadata_uri && (
            <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Encrypted identity review</p>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[10px] text-base-content/40 uppercase mb-1">Encrypted Payload CID</p>
                  <code className="text-[10px] bg-base-300 px-2 py-1 rounded truncate block">
                    {foundUser.metadata_uri}
                  </code>
                </div>

                {kycApplicantMeta && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="bg-base-200 rounded-lg p-2">
                      <p className="text-[9px] uppercase tracking-widest text-base-content/40 mb-0.5">Full Name</p>
                      <p className="text-xs font-bold">{kycApplicantMeta.fullName ?? "N/A"}</p>
                    </div>
                    <div className="bg-base-200 rounded-lg p-2">
                      <p className="text-[9px] uppercase tracking-widest text-base-content/40 mb-0.5">Country</p>
                      <p className="text-xs font-bold">{kycApplicantMeta.country ?? "N/A"}</p>
                    </div>
                    {kycApplicantMeta.submittedAt && (
                      <div className="bg-base-200 rounded-lg p-2 col-span-2">
                        <p className="text-[9px] uppercase tracking-widest text-base-content/40 mb-0.5">Submitted At</p>
                        <p className="text-[10px] font-mono">
                          {new Date(kycApplicantMeta.submittedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!decryptedFileUrl ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="password"
                      placeholder="Paste the VTrust Africa review key"
                      className="input input-bordered input-xs w-full text-[10px]"
                      value={adminOrgKey}
                      onChange={e => setAdminOrgKey(e.target.value)}
                    />
                    <button
                      className="btn btn-primary btn-xs w-full"
                      onClick={onDecryptIdentity}
                      disabled={isDecrypting || !adminOrgKey}
                    >
                      {isDecrypting ? <span className="loading loading-bars loading-xs" /> : "Decrypt & View PII"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 text-center relative group">
                    <Image
                      src={decryptedFileUrl}
                      alt="Decrypted ID"
                      width={500}
                      height={300}
                      className="max-h-64 rounded-lg mx-auto shadow-xl border-2 border-primary/30"
                    />
                    <button
                      className="btn btn-circle btn-xs absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDecryptedFileUrl(null)}
                    >
                      ✕
                    </button>
                    <p className="text-[10px] text-success mt-2 font-bold uppercase tracking-[0.2em]">
                      Decrypted successfully
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {foundUser.commitment && (
            <div className="mt-4 bg-base-300/30 rounded-lg p-3 border border-base-300">
              <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/40 mb-1">
                ZK-Commitment Hash (SHA-256)
              </p>
              <code className="text-[10px] break-all opacity-70 font-mono">
                {Buffer.from(foundUser.commitment).toString("hex")}
              </code>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0 sm:w-48">
          <button
            className="btn btn-success btn-sm w-full"
            onClick={e => onUpdateKyc(e, 2)}
            disabled={isUpdatingKyc || statusMatches(foundUser, "Verified")}
          >
            Verify User
          </button>
          <button
            className="btn btn-warning btn-sm w-full"
            onClick={e => onUpdateKyc(e, 4)}
            disabled={isUpdatingKyc || statusMatches(foundUser, "Suspended")}
          >
            Suspend User
          </button>
          <button
            className="btn btn-error btn-outline btn-sm w-full"
            onClick={e => onUpdateKyc(e, 3)}
            disabled={isUpdatingKyc || statusMatches(foundUser, "Rejected")}
          >
            Reject KYC
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { KycApplicationList } from "./KycApplicationList";
import { KycUserDetail } from "./KycUserDetail";
import { IdentificationIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { decryptFileAsAdmin } from "~~/services/stellar/cryptoService";
import { fetchFromIpfs } from "~~/services/stellar/ipfsService";
import {
  fetchAllUserAddresses,
  fetchKycSubmissions,
  fetchUserRecord,
  setUserStatus,
} from "~~/services/stellar/sorobanService";
import { UserRecord } from "~~/types/stellar";
import { notification } from "~~/utils/vaultic";

type KycApplicantMeta = {
  fullName?: string;
  country?: string;
  submittedAt?: string;
};

type Props = {
  publicKey: string;
};

export function AdminComplianceTab({ publicKey }: Readonly<Props>) {
  const [kycApplications, setKycApplications] = useState<string[]>([]);
  const [isLoadingKycApps, setIsLoadingKycApps] = useState(false);
  const [kycSearchAddr, setKycSearchAddr] = useState("");
  const [foundUser, setFoundUser] = useState<UserRecord | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isUpdatingKyc, setIsUpdatingKyc] = useState(false);
  const [kycApplicantMeta, setKycApplicantMeta] = useState<KycApplicantMeta | null>(null);
  const [adminOrgKey, setAdminOrgKey] = useState("");
  const [decryptedFileUrl, setDecryptedFileUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const lockUpdatingKyc = useRef(false);

  const loadKycSubmissions = useCallback(async () => {
    setIsLoadingKycApps(true);
    try {
      const [registryApps, eventApps] = await Promise.all([fetchAllUserAddresses(), fetchKycSubmissions()]);
      setKycApplications(Array.from(new Set([...eventApps, ...registryApps])));
    } finally {
      setIsLoadingKycApps(false);
    }
  }, []);

  const handleSearchUser = useCallback(
    async (addr?: string) => {
      const target = addr ?? kycSearchAddr;
      if (!target) return;
      setIsSearchingUser(true);
      try {
        const user = await fetchUserRecord(target);
        if (user && user.address !== "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF") {
          setFoundUser(user);
        } else {
          notification.error("User not found or never registered");
          setFoundUser(null);
        }
      } catch {
        notification.error("Invalid address or RPC error");
      } finally {
        setIsSearchingUser(false);
      }
    },
    [kycSearchAddr],
  );

  const handleUpdateKyc = async (e: React.MouseEvent, status: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!foundUser || isUpdatingKyc || lockUpdatingKyc.current) return;
    lockUpdatingKyc.current = true;
    setIsUpdatingKyc(true);
    const notifId = notification.loading("Updating KYC status on-chain...");
    try {
      const { hash } = await setUserStatus(foundUser.address, status, publicKey);
      setLastTxHash(hash);
      notification.success(<p className="font-bold">KYC status updated!</p>);
      await handleSearchUser(foundUser.address);
    } catch (err: unknown) {
      notification.error(`Update failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setIsUpdatingKyc(false);
      lockUpdatingKyc.current = false;
      notification.remove(notifId);
    }
  };

  const handleDecryptIdentity = async () => {
    if (!foundUser?.metadata_uri || !adminOrgKey) {
      notification.error("Metadata URI and Admin Org Key are required.");
      return;
    }
    setIsDecrypting(true);
    const notifId = notification.loading("Decrypting document...");
    try {
      const ipfsPayload = (await fetchFromIpfs(foundUser.metadata_uri)) as Record<string, unknown>;
      const encryptedData = (ipfsPayload?.encryptedDocument ?? ipfsPayload) as Parameters<typeof decryptFileAsAdmin>[0];
      if (ipfsPayload?.applicant) {
        setKycApplicantMeta(ipfsPayload.applicant as KycApplicantMeta);
      }
      const decryptedBuffer = await decryptFileAsAdmin(encryptedData, adminOrgKey);
      const blob = new Blob([decryptedBuffer], { type: "image/jpeg" });
      setDecryptedFileUrl(URL.createObjectURL(blob));
      notification.success("Document decrypted successfully!");
    } catch (err: unknown) {
      notification.error(`Decryption failed: ${err instanceof Error ? err.message : "invalid Org Key"}`);
    } finally {
      setIsDecrypting(false);
      notification.remove(notifId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-base-300 bg-base-100/40 backdrop-blur-md p-8 shadow-2xl shadow-primary/5">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <IdentificationIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Compliance management</h2>
            <p className="text-sm text-base-content/50">User registry</p>
          </div>
        </div>
        <p className="text-sm text-base-content/60 mb-6">
          Search for a user by their Stellar public key to review or update their compliance status.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter user address (G...)"
            className="input input-bordered grow font-mono text-sm"
            value={kycSearchAddr}
            onChange={e => setKycSearchAddr(e.target.value)}
          />
          <button
            className="btn btn-primary rounded-xl px-8 shadow-lg shadow-primary/20 stellar-glow"
            onClick={() => handleSearchUser()}
            disabled={isSearchingUser}
          >
            {isSearchingUser ? <span className="loading loading-bars loading-xs" /> : "Lookup User"}
          </button>
        </div>

        {foundUser && (
          <KycUserDetail
            foundUser={foundUser}
            kycApplicantMeta={kycApplicantMeta}
            adminOrgKey={adminOrgKey}
            setAdminOrgKey={setAdminOrgKey}
            decryptedFileUrl={decryptedFileUrl}
            setDecryptedFileUrl={setDecryptedFileUrl}
            isDecrypting={isDecrypting}
            isUpdatingKyc={isUpdatingKyc}
            explorerTxHash={lastTxHash}
            onUpdateKyc={handleUpdateKyc}
            onDecryptIdentity={handleDecryptIdentity}
          />
        )}
      </div>

      <KycApplicationList
        applications={kycApplications}
        isLoading={isLoadingKycApps}
        onRefresh={loadKycSubmissions}
        onReview={addr => {
          setKycSearchAddr(addr);
          handleSearchUser(addr);
        }}
      />

      <div className="rounded-xl bg-primary/5 border border-primary/10 p-6">
        <div className="flex gap-4">
          <UserGroupIcon className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold text-primary mb-1">KYC on Stellar</h3>
            <p className="text-sm text-base-content/70">
              Compliance flags live on-chain in the User Registry. Personal data stays off-chain and encrypted;
              contracts enforce investment gating from those flags.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

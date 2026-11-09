"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { shortenStellarAddress } from "~~/services/stellar/horizonClient";
import { fetchAdmins, setAdmins } from "~~/services/stellar/sorobanService";
import { notification } from "~~/utils/vaultic";

type Props = {
  publicKey: string;
};

export function AdminGovernanceTab({ publicKey }: Readonly<Props>) {
  const [onChainAdmins, setOnChainAdmins] = useState<string[]>([]);
  const [newAdminAddr, setNewAdminAddr] = useState("");
  const [isUpdatingAdmins, setIsUpdatingAdmins] = useState(false);

  const loadAdmins = useCallback(async () => {
    const admins = await fetchAdmins();
    setOnChainAdmins(admins);
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleAddAdmin = async () => {
    if (!newAdminAddr) return;
    setIsUpdatingAdmins(true);
    const notifId = notification.loading("Authorizing new admin...");
    try {
      await setAdmins([...onChainAdmins, newAdminAddr], publicKey);
      notification.success("Admin added successfully!");
      await loadAdmins();
      setNewAdminAddr("");
    } catch (err: unknown) {
      notification.error(`Failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setIsUpdatingAdmins(false);
      notification.remove(notifId);
    }
  };

  const handleRemoveAdmin = async (e: React.MouseEvent, addr: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUpdatingAdmins(true);
    const notifId = notification.loading("Revoking admin...");
    try {
      await setAdmins(
        onChainAdmins.filter(a => a !== addr),
        publicKey,
      );
      notification.success("Admin revoked!");
      await loadAdmins();
    } catch (err: unknown) {
      notification.error(`Failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setIsUpdatingAdmins(false);
      notification.remove(notifId);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
      <div className="space-y-6">
        <div className="rounded-[2.5rem] bg-base-100/40 p-8 border border-base-300 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <ShieldCheckIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold italic">On-chain governance</h3>
              <p className="text-sm text-base-content/50">Admin wallet registry</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-base-200/50 rounded-2xl p-4 border border-base-300">
              <p className="text-[10px] uppercase font-black tracking-widest text-base-content/40 mb-3">
                Admin wallets
              </p>
              <div className="space-y-2">
                {onChainAdmins.length === 0 ? (
                  <div className="py-8 text-center italic text-base-content/30 border border-dashed border-base-300 rounded-xl">
                    Loading administrators...
                  </div>
                ) : (
                  onChainAdmins.map(admin => (
                    <div
                      key={admin}
                      className="flex items-center justify-between bg-base-100 px-3 py-1.5 rounded-xl border border-base-300 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        <span className="text-xs font-mono font-bold opacity-70">
                          {shortenStellarAddress(admin, 12)}
                        </span>
                      </div>
                      {onChainAdmins.length > 1 && (
                        <button
                          onClick={e => handleRemoveAdmin(e, admin)}
                          disabled={isUpdatingAdmins}
                          className="text-[10px] text-error font-black uppercase opacity-0 group-hover:opacity-100 transition-all hover:underline"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add new admin address..."
                className="input input-ghost bg-base-200/50 rounded-xl grow text-sm font-mono focus:bg-base-200 border-base-300"
                value={newAdminAddr}
                onChange={e => setNewAdminAddr(e.target.value)}
              />
              <button
                onClick={handleAddAdmin}
                disabled={isUpdatingAdmins || !newAdminAddr}
                className="btn btn-primary rounded-xl px-6 text-sm"
              >
                {isUpdatingAdmins ? <span className="loading loading-bars loading-xs" /> : "Authorize"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[2.5rem] bg-primary/5 p-8 border border-primary/20 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-base-100 flex items-center justify-center text-primary shadow-xl border border-primary/10">
              <ShieldCheckIcon className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-black text-lg uppercase tracking-tight">System Integrity</h4>
              <p className="text-xs text-base-content/60">
                Admin power allows for protocol-level verification and issuance control. Handle with care.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2.5rem] bg-base-100/40 p-8 border border-base-300 shadow-2xl backdrop-blur-xl">
          <h3 className="text-xl font-black italic uppercase tracking-tight mb-4">Administrative Log</h3>
          <p className="text-sm text-base-content/60 italic border-l-2 border-primary/20 pl-4 py-2">
            All governance actions are recorded on the Stellar ledger for transparency and auditability.
          </p>
        </div>
      </div>
    </div>
  );
}

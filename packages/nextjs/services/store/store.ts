import { create } from "zustand";

/**
 * Vaultic Global Store (Stellar Migration)
 */

type GlobalState = {
  targetNetworkId: string;
  setTargetNetworkId: (id: string) => void;
};

export const useGlobalState = create<GlobalState>(set => ({
  targetNetworkId: "testnet",
  setTargetNetworkId: id => set({ targetNetworkId: id }),
}));

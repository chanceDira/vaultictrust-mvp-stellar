import { create } from "zustand";

type GlobalState = {
  targetNetworkId: string;
  setTargetNetworkId: (id: string) => void;
};

export const useGlobalState = create<GlobalState>(set => ({
  targetNetworkId: "testnet",
  setTargetNetworkId: id => set({ targetNetworkId: id }),
}));

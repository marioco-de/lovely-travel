import { create } from "zustand";

export type LightboxItem = {
  src: string;
  alt: string;
  place: string;
  caption: string;
};

type LightboxState = {
  item: LightboxItem | null;
  open: (item: LightboxItem) => void;
  close: () => void;
};

export const useLightbox = create<LightboxState>((set) => ({
  item: null,
  open: (item) => set({ item }),
  close: () => set({ item: null }),
}));

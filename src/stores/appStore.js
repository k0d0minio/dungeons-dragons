import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  isOnline: true,
  setOnline: (value) => set({ isOnline: value }),
  theme: 'system',
  setTheme: (theme) => set({ theme }),
  lastSyncAt: null,
  setLastSyncAt: (date) => set({ lastSyncAt: date }),
}))


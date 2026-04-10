import { create } from 'zustand';
export const useUIStore = create(set => ({
  sidebarOpen: true,
  commandOpen: false,
  activeWorkspaceId: null,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  openCommand: () => set({ commandOpen: true }),
  closeCommand: () => set({ commandOpen: false }),
  setWorkspace: id => set({ activeWorkspaceId: id }),
}));

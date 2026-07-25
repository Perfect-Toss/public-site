import { create } from 'zustand';
import {
  fetchAllTablets,
  fetchTabletById,
  createTablet,
  updateTablet,
  deleteTablet,
  type Tablet,
  type CreateTabletRequest,
  type UpdateTabletRequest,
} from '../api/api.tablets';
import {
  fetchAllTabletTypes,
  fetchTabletTypeById,
  createTabletType,
  updateTabletType,
  deleteTabletType,
  type TabletType,
  type CreateTabletTypeRequest,
  type UpdateTabletTypeRequest,
} from '../api/api.tabletTypes';

interface TabletState {
  // Tablets
  tablets: Tablet[];
  tabletsLoading: boolean;
  tabletsError: string | null;

  // Tablet types
  tabletTypes: TabletType[];
  tabletTypesLoading: boolean;
  tabletTypesError: string | null;

  // Actions
  loadTablets: () => Promise<void>;
  loadTabletById: (id: string) => Promise<Tablet | null>;
  createTablet: (data: CreateTabletRequest) => Promise<Tablet | null>;
  updateTablet: (id: string, data: UpdateTabletRequest) => Promise<void>;
  deleteTablet: (id: string) => Promise<void>;

  loadTabletTypes: () => Promise<void>;
  loadTabletTypeById: (id: string) => Promise<TabletType | null>;
  createTabletType: (data: CreateTabletTypeRequest) => Promise<TabletType | null>;
  updateTabletType: (id: string, data: UpdateTabletTypeRequest) => Promise<void>;
  deleteTabletType: (id: string) => Promise<void>;

  // Convenience lookups (derived)
  getTypeName: (typeId: string | null | undefined) => string | undefined;
}

export const useTabletStore = create<TabletState>((set, get) => ({
  // ── Tablets ──────────────────────────────────────────────────────
  tablets: [],
  tabletsLoading: false,
  tabletsError: null,

  loadTablets: async () => {
    set({ tabletsLoading: true, tabletsError: null });
    try {
      const data = await fetchAllTablets();
      set({ tablets: data, tabletsLoading: false });
    } catch (err) {
      set({
        tabletsError: err instanceof Error ? err.message : 'Failed to load tablets',
        tabletsLoading: false,
      });
    }
  },

  loadTabletById: async (id) => {
    try {
      return await fetchTabletById(id);
    } catch {
      return null;
    }
  },

  createTablet: async (data) => {
    try {
      const result = await createTablet(data);
      if (result) await get().loadTablets();
      return result;
    } catch {
      return null;
    }
  },

  updateTablet: async (id, data) => {
    await updateTablet(id, data);
    await get().loadTablets();
  },

  deleteTablet: async (id) => {
    await deleteTablet(id);
    await get().loadTablets();
  },

  // ── Tablet Types ─────────────────────────────────────────────────
  tabletTypes: [],
  tabletTypesLoading: false,
  tabletTypesError: null,

  loadTabletTypes: async () => {
    set({ tabletTypesLoading: true, tabletTypesError: null });
    try {
      const data = await fetchAllTabletTypes();
      set({ tabletTypes: data, tabletTypesLoading: false });
    } catch (err) {
      set({
        tabletTypesError: err instanceof Error ? err.message : 'Failed to load tablet types',
        tabletTypesLoading: false,
      });
    }
  },

  loadTabletTypeById: async (id) => {
    try {
      return await fetchTabletTypeById(id);
    } catch {
      return null;
    }
  },

  createTabletType: async (data) => {
    try {
      const result = await createTabletType(data);
      if (result) await get().loadTabletTypes();
      return result;
    } catch {
      return null;
    }
  },

  updateTabletType: async (id, data) => {
    await updateTabletType(id, data);
    await get().loadTabletTypes();
  },

  deleteTabletType: async (id) => {
    await deleteTabletType(id);
    await get().loadTabletTypes();
  },

  // ── Lookups ──────────────────────────────────────────────────────
  getTypeName: (typeId) => {
    if (!typeId) return undefined;
    return get().tabletTypes.find((t) => t.id === typeId)?.model ?? undefined;
  },
}));

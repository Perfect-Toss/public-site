import { create } from 'zustand';
import {
  fetchAllMachines,
  fetchMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  type Machine,
  type CreateMachineRequest,
  type UpdateMachineRequest,
} from '../api/api';

interface MachineState {
  machines: Machine[];
  loading: boolean;
  error: string | null;

  loadMachines: () => Promise<void>;
  loadMachineById: (id: string) => Promise<Machine | null>;
  createMachine: (data: CreateMachineRequest) => Promise<Machine | null>;
  updateMachine: (id: string, data: UpdateMachineRequest) => Promise<void>;
  deleteMachine: (id: string) => Promise<void>;
}

export const useMachineStore = create<MachineState>((set, get) => ({
  machines: [],
  loading: false,
  error: null,

  loadMachines: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchAllMachines();
      set({ machines: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load machines',
        loading: false,
      });
    }
  },

  loadMachineById: async (id) => {
    try {
      return await fetchMachineById(id);
    } catch {
      return null;
    }
  },

  createMachine: async (data) => {
    try {
      const result = await createMachine(data);
      if (result) await get().loadMachines();
      return result;
    } catch {
      return null;
    }
  },

  updateMachine: async (id, data) => {
    await updateMachine(id, data);
    await get().loadMachines();
  },

  deleteMachine: async (id) => {
    await deleteMachine(id);
    await get().loadMachines();
  },
}));

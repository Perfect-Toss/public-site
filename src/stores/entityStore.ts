import { create } from 'zustand';
import {
  fetchAllEntities,
  fetchEntityById,
  createEntity,
  updateEntity,
  deleteEntity,
  fetchEntityUsers,
  addUserToEntity,
  removeUserFromEntity,
  type Entity,
  type CreateEntityRequest,
  type UpdateEntityRequest,
} from '../api/api.entities';
import type { User, Roles } from '../api/api.users';

interface EntityState {
  entities: Entity[];
  loading: boolean;
  error: string | null;
  entityUsers: Record<string, User[]>;

  loadEntities: () => Promise<void>;
  loadEntityById: (id: string) => Promise<Entity | null>;
  createEntity: (data: CreateEntityRequest) => Promise<Entity | null>;
  updateEntity: (id: string, data: UpdateEntityRequest) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  loadEntityUsers: (entityId: string) => Promise<void>;
  addUserToEntity: (entityId: string, userId: string, roles: { roles: Roles[] | null }) => Promise<boolean>;
  removeUserFromEntity: (entityId: string, userId: string) => Promise<boolean>;
}

export const useEntityStore = create<EntityState>((set, get) => ({
  entities: [],
  loading: false,
  error: null,
  entityUsers: {},

  loadEntities: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchAllEntities();
      set({ entities: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load entities',
        loading: false,
      });
    }
  },

  loadEntityById: async (id) => {
    try {
      return await fetchEntityById(id);
    } catch {
      return null;
    }
  },

  createEntity: async (data) => {
    try {
      const result = await createEntity(data);
      if (result) await get().loadEntities();
      return result;
    } catch {
      return null;
    }
  },

  updateEntity: async (id, data) => {
    await updateEntity(id, data);
    await get().loadEntities();
  },

  deleteEntity: async (id) => {
    await deleteEntity(id);
    await get().loadEntities();
  },

  loadEntityUsers: async (entityId) => {
    try {
      const users = await fetchEntityUsers(entityId);
      set((state) => ({
        entityUsers: { ...state.entityUsers, [entityId]: users },
      }));
    } catch {
      // silently fail
    }
  },

  addUserToEntity: async (entityId, userId, roles: { roles: Roles[] | null }) => {
    try {
      await addUserToEntity(entityId, userId, roles);
      await get().loadEntityUsers(entityId);
      return true;
    } catch {
      return false;
    }
  },

  removeUserFromEntity: async (entityId, userId) => {
    try {
      await removeUserFromEntity(entityId, userId);
      await get().loadEntityUsers(entityId);
      return true;
    } catch {
      return false;
    }
  },
}));

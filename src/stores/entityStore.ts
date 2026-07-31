import { create } from 'zustand';
import {
  fetchAllEntities,
  fetchEntityById,
  createEntity,
  updateEntity,
  deleteEntity,
  fetchChildEntities,
  fetchEntitiesForUser,
  fetchEntityUsers,
  addUserToEntity,
  removeUserFromEntity,
  type Entity,
  type CreateEntityRequest,
  type UpdateEntityRequest,
} from '../api/api.entities';
import { Role, type User } from '../api/api.users';

/** Rebuild a hierarchy map from a flat entity list. */
function buildEntityMap(flat: Entity[]): Record<string, Entity[]> {
  const map: Record<string, Entity[]> = { root: [] };
  for (const entity of flat) {
    const key = entity.parentEntityId ?? 'root';
    if (!map[key]) map[key] = [];
    map[key].push(entity);
  }
  return map;
}

interface EntityState {
  /** Flat list of all entities (e.g. for dropdowns). */
  entities: Entity[];
  /** Entities keyed by parent ID. `'root'` = entities without a parent. */
  entityMap: Record<string, Entity[]>;
  loading: boolean;
  error: string | null;
  entityUsers: Record<string, User[]>;

  /** Fetch all entities and build the hierarchy map. */
  loadEntities: () => Promise<void>;
  loadEntityById: (id: string) => Promise<Entity | null>;
  createEntity: (data: CreateEntityRequest) => Promise<Entity | null>;
  updateEntity: (id: string, data: UpdateEntityRequest) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  loadChildEntities: (parentId: string) => Promise<Entity[]>;
  loadEntitiesForUser: (userId: string) => Promise<Entity[]>;
  loadEntityUsers: (entityId: string) => Promise<void>;
  addUserToEntity: (entityId: string, userId: string, roles: { roles: Role[] | null }) => Promise<boolean>;
  removeUserFromEntity: (entityId: string, userId: string) => Promise<boolean>;
}

export const useEntityStore = create<EntityState>((set, get) => ({
  entities: [],
  entityMap: {},
  loading: false,
  error: null,
  entityUsers: {},

  loadEntities: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchAllEntities();
      set({ entities: data, entityMap: buildEntityMap(data), loading: false });
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

  loadChildEntities: async (parentId) => {
    try {
      return await fetchChildEntities(parentId);
    } catch {
      return [];
    }
  },

  loadEntitiesForUser: async (userId) => {
    try {
      return await fetchEntitiesForUser(userId);
    } catch {
      return [];
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

  addUserToEntity: async (entityId, userId, roles: { roles: Role[] | null }) => {
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

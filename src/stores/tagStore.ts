import { create } from 'zustand';
import {
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  type Tag,
  type CreateTagRequest,
  type UpdateTagRequest,
} from '../api/api.tags';

interface TagState {
  tags: Tag[];
  loading: boolean;
  error: string | null;

  loadTags: () => Promise<void>;
  loadTagById: (id: string) => Promise<Tag | null>;
  createTag: (data: CreateTagRequest) => Promise<Tag | null>;
  updateTag: (id: string, data: UpdateTagRequest) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loading: false,
  error: null,

  loadTags: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchTags();
      set({ tags: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load tags',
        loading: false,
      });
    }
  },

  loadTagById: async (id) => {
    const existing = get().tags.find((t) => t.id === id);
    if (existing) return existing;
    // The API has no GET-by-id endpoint, so load the full list and look it up.
    await get().loadTags();
    return get().tags.find((t) => t.id === id) ?? null;
  },

  createTag: async (data) => {
    try {
      const result = await createTag(data);
      if (result) await get().loadTags();
      return result;
    } catch {
      return null;
    }
  },

  updateTag: async (id, data) => {
    await updateTag(id, data);
    await get().loadTags();
  },

  deleteTag: async (id) => {
    await deleteTag(id);
    await get().loadTags();
  },
}));

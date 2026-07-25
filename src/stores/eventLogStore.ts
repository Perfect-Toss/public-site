import { create } from 'zustand';
import {
  fetchEventLogSummary,
  type EventLogUserSummary,
} from '../api/api.eventLogs';

interface EventLogState {
  summary: EventLogUserSummary[];
  summaryLoading: boolean;
  summaryError: string | null;

  loadSummary: () => Promise<void>;
}

export const useEventLogStore = create<EventLogState>((set) => ({
  summary: [],
  summaryLoading: false,
  summaryError: null,

  loadSummary: async () => {
    set({ summaryLoading: true, summaryError: null });
    try {
      const data = await fetchEventLogSummary();
      set({ summary: data, summaryLoading: false });
    } catch (err) {
      set({
        summaryError: err instanceof Error ? err.message : 'Failed to load event log summary',
        summaryLoading: false,
      });
    }
  },
}));

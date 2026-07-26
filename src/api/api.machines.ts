/**
 * Machines API functions
 */

import { api } from './index';
import type { components } from './schema';

export type Machine = components['schemas']['Machine'];
export type CreateMachineRequest = components['schemas']['CreateMachineRequest'];
export type UpdateMachineRequest = components['schemas']['UpdateMachineRequest'];
export type UpdateMachineInfoRequest = components['schemas']['UpdateMachineInfoRequest'];
export type MachineInfo = components['schemas']['MachineInfo'];

/**
 * Fetch all machines (requires admin authorization)
 */
export async function fetchAllMachines(): Promise<Machine[]> {
  const { data, error } = await api.GET('/api/v1/machines', {});

  if (error) {
    console.error('Failed to fetch machines:', error);
    throw new Error('Failed to fetch machines');
  }

  return data || [];
}

/**
 * Fetch a specific machine by ID (requires admin authorization)
 */
export async function fetchMachineById(id: string): Promise<Machine | null> {
  const { data, error } = await api.GET('/api/v1/machines/id/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to fetch machine:', error);
    throw new Error('Failed to fetch machine');
  }

  return data ?? null;
}

/**
 * Create a new machine (requires admin authorization)
 */
export async function createMachine(machineData: CreateMachineRequest): Promise<Machine | null> {
  const { data, error } = await api.POST('/api/v1/machines', {
    body: machineData,
  });

  if (error) {
    console.error('Failed to create machine:', error);
    throw new Error('Failed to create machine');
  }

  return data ?? null;
}

/**
 * Update an existing machine (requires admin authorization)
 */
export async function updateMachine(id: string, machineData: UpdateMachineRequest): Promise<Machine | null> {
  const { data, error } = await api.PUT('/api/v1/machines/{id}', {
    params: { path: { id } },
    body: machineData,
  });

  if (error) {
    console.error('Failed to update machine:', error);
    throw new Error('Failed to update machine');
  }

  return data ?? null;
}

/**
 * Delete a machine (requires admin authorization)
 */
export async function deleteMachine(id: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/machines/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete machine:', error);
    throw new Error('Failed to delete machine');
  }

  return true;
}

/**
 * Update machine info / device details (requires admin authorization)
 */
export async function updateMachineInfo(id: string, infoData: UpdateMachineInfoRequest): Promise<MachineInfo | null> {
  const { data, error } = await api.PUT('/api/v1/machines/{id}/info', {
    params: { path: { id } },
    body: infoData,
  });

  if (error) {
    console.error('Failed to update machine info:', error);
    throw new Error('Failed to update machine info');
  }

  return data ?? null;
}

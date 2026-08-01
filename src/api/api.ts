/**
 * Barrel file that re-exports all API functions and types.
 * 
 * This is a compatibility shim — consider importing directly from the
 * individual module files instead:
 * 
 *   import { login } from '../api/api.auth';
 *   import { fetchAllUsers, type User } from '../api/api.users';
 *   import { fetchEntities } from '../api/api.entities';
 *   import { fetchAllMachines } from '../api/api.machines';
 *   import { fetchAllTablets } from '../api/api.tablets';
 *   import { fetchAllTabletTypes } from '../api/api.tabletTypes';
 *   import { fetchEventLogSummary } from '../api/api.eventLogs';
 *   import { fetchMetaInfo } from '../api/api.meta';
 *   import { fetchVideos } from '../api/api.videos';
 *   import { fetchTags } from '../api/api.tags';
 */

export * from './api.auth';
export * from './api.eventLogs';
export * from './api.meta';
export * from './api.users';
export * from './api.entities';
export * from './api.machines';
export * from './api.tablets';
export * from './api.tabletTypes';
export * from './api.videos';
export * from './api.tags';

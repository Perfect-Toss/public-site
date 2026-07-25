/**
 * Videos & Video Access API functions
 * 
 * These endpoints are new additions from the updated OpenAPI schema.
 */

import { api } from './index';
import type { components } from './schema';

export type Video = components['schemas']['Video'];
export type CreateVideoRequest = components['schemas']['CreateVideoRequest'];
export type UpdateVideoRequest = components['schemas']['UpdateVideoRequest'];
export type SasUrlResponse = components['schemas']['SasUrlResponse'];
export type TransferOwnershipRequest = components['schemas']['TransferOwnershipRequest'];
export type ShareVideoRequest = components['schemas']['ShareVideoRequest'];
export type SetVideoAccessRequest = components['schemas']['SetVideoAccessRequest'];
export type VideoAccessLevel = components['schemas']['VideoAccessLevel'];
export type VideoUserAccessResult = components['schemas']['VideoUserAccessResult'];
export type VideoEntityAccessResult = components['schemas']['VideoEntityAccessResult'];
export type VideoIEnumerablePagedResponse = components['schemas']['VideoIEnumerablePagedResponse'];

// ============================================================================
// Videos API
// ============================================================================

/**
 * Get all video metadata records with paging
 */
export async function fetchVideos(pageNumber?: number, pageSize?: number): Promise<VideoIEnumerablePagedResponse> {
  const { data, error } = await api.GET('/api/v1/videos', {
    params: { query: { pageNumber, pageSize } },
  });

  if (error) {
    console.error('Failed to fetch videos:', error);
    throw new Error('Failed to fetch videos');
  }

  return data ?? {};
}

/**
 * Get a specific video metadata record by ID
 */
export async function fetchVideoById(id: string) {
  const { data, error } = await api.GET('/api/v1/videos/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to fetch video:', error);
    throw new Error('Failed to fetch video');
  }

  return data?.data || null;
}

/**
 * Create a new video metadata record
 */
export async function createVideo(videoData: CreateVideoRequest) {
  const { data, error } = await api.POST('/api/v1/videos', {
    body: videoData,
  });

  if (error) {
    console.error('Failed to create video:', error);
    throw new Error('Failed to create video');
  }

  return data?.data || null;
}

/**
 * Update an existing video metadata record
 */
export async function updateVideo(id: string, videoData: UpdateVideoRequest) {
  const { data, error } = await api.PUT('/api/v1/videos/{id}', {
    params: { path: { id } },
    body: videoData,
  });

  if (error) {
    console.error('Failed to update video:', error);
    throw new Error('Failed to update video');
  }

  return data?.data || null;
}

/**
 * Delete a video metadata record
 */
export async function deleteVideo(id: string) {
  const { data, error } = await api.DELETE('/api/v1/videos/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete video:', error);
    throw new Error('Failed to delete video');
  }

  return data?.succeeded || false;
}

/**
 * Get all video metadata records associated with a specific entity
 */
export async function fetchVideosByEntity(entityId: string, pageNumber?: number, pageSize?: number) {
  const { data, error } = await api.GET('/api/v1/videos/entity/{entityId}', {
    params: { path: { entityId }, query: { pageNumber, pageSize } },
  });

  if (error) {
    console.error('Failed to fetch videos by entity:', error);
    throw new Error('Failed to fetch videos by entity');
  }

  return data ?? {};
}

/**
 * Generate a time-limited SAS URL for uploading a video file to Azure Blob Storage
 */
export async function requestUploadToken(id: string) {
  const { data, error } = await api.POST('/api/v1/videos/{id}/request-upload-token', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to request upload token:', error);
    throw new Error('Failed to request upload token');
  }

  return data?.data || null;
}

/**
 * Generate a time-limited SAS URL for downloading a video file from Azure Blob Storage
 */
export async function requestDownloadToken(id: string) {
  const { data, error } = await api.POST('/api/v1/videos/{id}/request-download-token', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to request download token:', error);
    throw new Error('Failed to request download token');
  }

  return data?.data || null;
}

/**
 * Confirm that a video file has been uploaded to Azure Blob Storage
 */
export async function confirmUploadComplete(id: string) {
  const { data, error } = await api.POST('/api/v1/videos/{id}/upload-complete', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to confirm upload complete:', error);
    throw new Error('Failed to confirm upload complete');
  }

  return data?.succeeded || false;
}

/**
 * Transfer video ownership to another user
 */
export async function transferVideoOwnership(id: string, newOwnerId: string) {
  const { data, error } = await api.PUT('/api/v1/videos/{id}/owner', {
    params: { path: { id } },
    body: { newOwnerId },
  });

  if (error) {
    console.error('Failed to transfer video ownership:', error);
    throw new Error('Failed to transfer video ownership');
  }

  return data?.succeeded || false;
}

// ============================================================================
// Video Access API
// ============================================================================

/**
 * Bulk-set video access for users and entities
 */
export async function setVideoAccess(videoId: string, access: SetVideoAccessRequest) {
  const { data, error } = await api.PUT('/api/v1/videoaccess/{videoId}/access', {
    params: { path: { videoId } },
    body: access,
  });

  if (error) {
    console.error('Failed to set video access:', error);
    throw new Error('Failed to set video access');
  }

  return data?.succeeded || false;
}

/**
 * Share a video with a specific user or entity
 */
export async function shareVideo(videoId: string, shareRequest: ShareVideoRequest) {
  const { data, error } = await api.POST('/api/v1/videoaccess/{videoId}/access', {
    params: { path: { videoId } },
    body: shareRequest,
  });

  if (error) {
    console.error('Failed to share video:', error);
    throw new Error('Failed to share video');
  }

  return data?.succeeded || false;
}

/**
 * Remove a user's access to a video
 */
export async function removeVideoUserAccess(videoId: string, userId: string) {
  const { data, error } = await api.DELETE('/api/v1/videoaccess/{videoId}/access/user/{userId}', {
    params: { path: { videoId, userId } },
  });

  if (error) {
    console.error('Failed to remove video user access:', error);
    throw new Error('Failed to remove video user access');
  }

  return data?.succeeded || false;
}

/**
 * Remove an entity's access to a video
 */
export async function removeVideoEntityAccess(videoId: string, entityId: string) {
  const { data, error } = await api.DELETE('/api/v1/videoaccess/{videoId}/access/entity/{entityId}', {
    params: { path: { videoId, entityId } },
  });

  if (error) {
    console.error('Failed to remove video entity access:', error);
    throw new Error('Failed to remove video entity access');
  }

  return data?.succeeded || false;
}

/**
 * Get all users that have access to a video
 */
export async function fetchVideoUsers(videoId: string) {
  const { data, error } = await api.GET('/api/v1/videoaccess/{videoId}/access/users', {
    params: { path: { videoId } },
  });

  if (error) {
    console.error('Failed to fetch video users:', error);
    throw new Error('Failed to fetch video users');
  }

  return data?.data || [];
}

/**
 * Get all entities that have access to a video
 */
export async function fetchVideoEntities(videoId: string) {
  const { data, error } = await api.GET('/api/v1/videoaccess/{videoId}/access/entities', {
    params: { path: { videoId } },
  });

  if (error) {
    console.error('Failed to fetch video entities:', error);
    throw new Error('Failed to fetch video entities');
  }

  return data?.data || [];
}

/**
 * Get all users who have access to a video through entity-level sharing
 */
export async function fetchVideoEntityUsers(videoId: string) {
  const { data, error } = await api.GET('/api/v1/videoaccess/{videoId}/access/entity-users', {
    params: { path: { videoId } },
  });

  if (error) {
    console.error('Failed to fetch video entity users:', error);
    throw new Error('Failed to fetch video entity users');
  }

  return data?.data || [];
}

/**
 * Videos & Video Access API functions
 */

import { api } from './index';
import type { components } from './schema';

export type Video = components['schemas']['Video'];
export type CreateVideoRequest = components['schemas']['CreateVideoRequest'];
export type UpdateVideoRequest = components['schemas']['UpdateVideoRequest'];
export type SasUrlResponse = components['schemas']['SasUrlResponse'];
export type SetVideoAccessRequest = components['schemas']['SetVideoAccessRequest'];
export type ShareVideoRequest = components['schemas']['ShareVideoRequest'];
export type VideoUserAccessResult = components['schemas']['VideoUserAccessResult'];
export type VideoEntityAccessResult = components['schemas']['VideoEntityAccessResult'];
export type VideoAccessLevel = components['schemas']['VideoAccessLevel'];
export type DeviceOrientation = components['schemas']['DeviceOrientation'];
export type UploadStatus = components['schemas']['UploadStatus'];
export type ReviewStatus = components['schemas']['ReviewStatus'];
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
export async function fetchVideoById(id: string): Promise<Video | null> {
  const { data, error } = await api.GET('/api/v1/videos/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to fetch video:', error);
    throw new Error('Failed to fetch video');
  }

  return data ?? null;
}

/**
 * Create a new video metadata record
 */
export async function createVideo(videoData: CreateVideoRequest): Promise<Video | null> {
  const { data, error } = await api.POST('/api/v1/videos', {
    body: videoData,
  });

  if (error) {
    console.error('Failed to create video:', error);
    throw new Error('Failed to create video');
  }

  return data ?? null;
}

/**
 * Update an existing video metadata record
 */
export async function updateVideo(id: string, videoData: UpdateVideoRequest): Promise<Video | null> {
  const { data, error } = await api.PUT('/api/v1/videos/{id}', {
    params: { path: { id } },
    body: videoData,
  });

  if (error) {
    console.error('Failed to update video:', error);
    throw new Error('Failed to update video');
  }

  return data ?? null;
}

/**
 * Delete a video metadata record
 */
export async function deleteVideo(id: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/videos/{id}', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete video:', error);
    throw new Error('Failed to delete video');
  }

  return true;
}

/**
 * Get all video metadata records associated with a specific entity
 */
export async function fetchVideosByEntity(entityId: string, pageNumber?: number, pageSize?: number): Promise<VideoIEnumerablePagedResponse> {
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
export async function requestUploadToken(id: string): Promise<SasUrlResponse | null> {
  const { data, error } = await api.POST('/api/v1/videos/{id}/request-upload-token', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to request upload token:', error);
    throw new Error('Failed to request upload token');
  }

  return data ?? null;
}

/**
 * Generate a time-limited SAS URL for downloading a video file from Azure Blob Storage
 */
export async function requestDownloadToken(id: string): Promise<SasUrlResponse | null> {
  const { data, error } = await api.POST('/api/v1/videos/{id}/request-download-token', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to request download token:', error);
    throw new Error('Failed to request download token');
  }

  return data ?? null;
}

/**
 * Confirm that a video file has been uploaded to Azure Blob Storage
 */
export async function confirmUploadComplete(id: string): Promise<boolean> {
  const { error } = await api.POST('/api/v1/videos/{id}/upload-complete', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to confirm upload complete:', error);
    throw new Error('Failed to confirm upload complete');
  }

  return true;
}

/**
 * Transfer video ownership to another user
 */
export async function transferVideoOwnership(id: string, newOwnerId: string): Promise<boolean> {
  const { error } = await api.PUT('/api/v1/videos/{id}/owner', {
    params: { path: { id } },
    body: { newOwnerId },
  });

  if (error) {
    console.error('Failed to transfer video ownership:', error);
    throw new Error('Failed to transfer video ownership');
  }

  return true;
}

// ============================================================================
// Video Access API
// ============================================================================

/**
 * Bulk-set video access for users and entities
 */
export async function setVideoAccess(videoId: string, access: SetVideoAccessRequest): Promise<boolean> {
  const { error } = await api.PUT('/api/v1/videoaccess/{videoId}/access', {
    params: { path: { videoId } },
    body: access,
  });

  if (error) {
    console.error('Failed to set video access:', error);
    throw new Error('Failed to set video access');
  }

  return true;
}

/**
 * Share a video with a specific user or entity
 */
export async function shareVideo(videoId: string, shareRequest: ShareVideoRequest): Promise<boolean> {
  const { error } = await api.POST('/api/v1/videoaccess/{videoId}/access', {
    params: { path: { videoId } },
    body: shareRequest,
  });

  if (error) {
    console.error('Failed to share video:', error);
    throw new Error('Failed to share video');
  }

  return true;
}

/**
 * Remove a user's access to a video
 */
export async function removeVideoUserAccess(videoId: string, userId: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/videoaccess/{videoId}/access/user/{userId}', {
    params: { path: { videoId, userId } },
  });

  if (error) {
    console.error('Failed to remove video user access:', error);
    throw new Error('Failed to remove video user access');
  }

  return true;
}

/**
 * Remove an entity's access to a video
 */
export async function removeVideoEntityAccess(videoId: string, entityId: string): Promise<boolean> {
  const { error } = await api.DELETE('/api/v1/videoaccess/{videoId}/access/entity/{entityId}', {
    params: { path: { videoId, entityId } },
  });

  if (error) {
    console.error('Failed to remove video entity access:', error);
    throw new Error('Failed to remove video entity access');
  }

  return true;
}

/**
 * Get all users that have access to a video
 */
export async function fetchVideoUsers(videoId: string): Promise<VideoUserAccessResult[]> {
  const { data, error } = await api.GET('/api/v1/videoaccess/{videoId}/access/users', {
    params: { path: { videoId } },
  });

  if (error) {
    console.error('Failed to fetch video users:', error);
    throw new Error('Failed to fetch video users');
  }

  return data || [];
}

/**
 * Get all entities that have access to a video
 */
export async function fetchVideoEntities(videoId: string): Promise<VideoEntityAccessResult[]> {
  const { data, error } = await api.GET('/api/v1/videoaccess/{videoId}/access/entities', {
    params: { path: { videoId } },
  });

  if (error) {
    console.error('Failed to fetch video entities:', error);
    throw new Error('Failed to fetch video entities');
  }

  return data || [];
}

/**
 * Get all users who have access to a video through entity-level sharing
 */
export async function fetchVideoEntityUsers(videoId: string): Promise<VideoEntityAccessResult[]> {
  const { data, error } = await api.GET('/api/v1/videoaccess/{videoId}/access/entity-users', {
    params: { path: { videoId } },
  });

  if (error) {
    console.error('Failed to fetch video entity users:', error);
    throw new Error('Failed to fetch video entity users');
  }

  return data || [];
}

/**
 * Upload (or replace) a video's thumbnail image.
 * The server writes the image to public storage and bumps the cache-busting version.
 */
export async function uploadVideoThumbnail(id: string, file: File | Blob): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  const { error } = await api.POST('/api/v1/videos/{id}/thumbnail', {
    params: { path: { id } },
    body: formData,
  });

  if (error) {
    console.error('Failed to upload video thumbnail:', error);
    throw new Error('Failed to upload video thumbnail');
  }
}

/**
 * Remove a video's thumbnail image (deletes the blob and clears the stored path).
 */
export async function deleteVideoThumbnail(id: string): Promise<void> {
  const { error } = await api.DELETE('/api/v1/videos/{id}/thumbnail', {
    params: { path: { id } },
  });

  if (error) {
    console.error('Failed to delete video thumbnail:', error);
    throw new Error('Failed to delete video thumbnail');
  }
}

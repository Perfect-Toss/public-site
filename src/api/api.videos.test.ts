import {
  changesVideoAssociations,
  updateVideo,
  videoAssociationsLocked,
  type UpdateVideoRequest,
} from './api.videos';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The client is what the guard has to keep a request away from.
const api = vi.hoisted(() => ({
  PUT: vi.fn(async (..._args: unknown[]) => ({ data: { id: 'video-1' } as unknown })),
}));
vi.mock('./index', () => ({ api }));

/** The fields every update has to carry. */
const required = (): UpdateVideoRequest => ({
  timestamp: '2026-11-13T10:00:00Z',
  lengthInMilliseconds: 1000,
  deviceOrientation: 'Landscape',
});

describe('videoAssociationsLocked', () => {
  it('locks the associations once the file is uploaded', () => {
    expect(videoAssociationsLocked({ uploadStatus: 'Uploaded' })).toBe(true);
  });

  it('leaves them open until the upload completes', () => {
    expect(videoAssociationsLocked({ uploadStatus: 'NotUploaded' })).toBe(false);
    expect(videoAssociationsLocked({ uploadStatus: 'Pending' })).toBe(false);
    expect(videoAssociationsLocked({ uploadStatus: 'Unknown' })).toBe(false);
    expect(videoAssociationsLocked({})).toBe(false);
  });
});

describe('changesVideoAssociations', () => {
  it('counts setting or clearing either list as a change', () => {
    expect(changesVideoAssociations({ ...required(), associatedEntityIds: ['entity-1'] })).toBe(true);
    expect(changesVideoAssociations({ ...required(), coachIds: [] })).toBe(true);
  });

  it('counts a null or absent list as no change', () => {
    expect(
      changesVideoAssociations({ ...required(), associatedEntityIds: null, coachIds: null }),
    ).toBe(false);
    expect(changesVideoAssociations(required())).toBe(false);
  });
});

describe('updateVideo', () => {
  beforeEach(() => {
    api.PUT.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refuses an association change on an uploaded video, without calling the API', async () => {
    await expect(
      updateVideo('video-1', { ...required(), coachIds: ['user-1'] }, { uploadStatus: 'Uploaded' }),
    ).rejects.toThrow(/fixed once the video is uploaded/);

    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('still saves a metadata change that leaves the associations alone', async () => {
    api.PUT.mockResolvedValueOnce({ data: { id: 'video-1', label: 'Serve' } });

    const updated = await updateVideo(
      'video-1',
      { ...required(), label: 'Serve', coachIds: null },
      { uploadStatus: 'Uploaded' },
    );

    expect(updated).toEqual({ id: 'video-1', label: 'Serve' });
    expect(api.PUT).toHaveBeenCalledTimes(1);
  });

  it('lets a video that is not uploaded set its associations', async () => {
    await updateVideo(
      'video-1',
      { ...required(), associatedEntityIds: ['entity-1'] },
      { uploadStatus: 'NotUploaded' },
    );

    expect(api.PUT).toHaveBeenCalledTimes(1);
  });

  it('leaves the request alone when the caller has no video to check', async () => {
    await updateVideo('video-1', { ...required(), coachIds: ['user-1'] });

    expect(api.PUT).toHaveBeenCalledTimes(1);
  });
});

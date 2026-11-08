import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));
vi.mock('../../api/api.videos', () => ({ fetchVideoReviewContentUrl: apiMock }));

type ContentModule = typeof import('./reviewContent');

/**
 * Fresh module instance per test: the caches and the "can this origin read the
 * blobs at all" probe are module state that must not leak between cases.
 */
async function loadContentModule(): Promise<ContentModule> {
  vi.resetModules();
  return import('./reviewContent');
}

/** Fake a storage response that can be downloaded as a blob. */
function downloadResponse(bytes = 'clip') {
  return { ok: true, blob: async () => new Blob([bytes]) };
}

describe('review content caching', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let objectUrls: number;

  beforeEach(() => {
    apiMock.mockReset();
    objectUrls = 0;
    fetchMock = vi.fn(async () => downloadResponse());
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => `blob:local-${++objectUrls}`);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('downloads a clip once and replays it from the local blob', async () => {
    const { loadReviewContentBlobUrl } = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');

    const first = await loadReviewContentBlobUrl('video-a', 'item-a');
    const second = await loadReviewContentBlobUrl('video-a', 'item-a');

    expect(first).toBe('blob:local-1');
    expect(second).toBe('blob:local-1');
    // One SAS mint, one download — the replay touches nothing.
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares one download between concurrent callers', async () => {
    const { loadReviewContentBlobUrl } = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');

    const [a, b] = await Promise.all([
      loadReviewContentBlobUrl('video-b', 'item-b'),
      loadReviewContentBlobUrl('video-b', 'item-b'),
    ]);

    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops trying when storage refuses the read (no CORS), and never repeats it', async () => {
    const { loadReviewContentBlobUrl } = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    expect(await loadReviewContentBlobUrl('video-c', 'item-c')).toBeNull();
    // Callers stream the SAS URL instead, and no further CORS error is logged.
    expect(await loadReviewContentBlobUrl('video-c', 'item-d')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when the item has no blob at all', async () => {
    const { loadReviewContentBlobUrl } = await loadContentModule();
    apiMock.mockResolvedValue(null);

    expect(await loadReviewContentBlobUrl('video-d', 'item-d')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forgetting a clip revokes it so the next play downloads again', async () => {
    const { forgetReviewContentBlob, loadReviewContentBlobUrl } = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');

    const first = await loadReviewContentBlobUrl('video-e', 'item-e');
    forgetReviewContentBlob('video-e', 'item-e');
    const second = await loadReviewContentBlobUrl('video-e', 'item-e');

    expect(first).toBe('blob:local-1');
    expect(second).toBe('blob:local-2');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('still exposes the SAS URL for callers that stream directly', async () => {
    const { loadReviewContentUrl } = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');

    expect(await loadReviewContentUrl('video-f', 'item-f')).toBe('https://blob/item?sas');
    expect(await loadReviewContentUrl('video-f', 'item-f')).toBe('https://blob/item?sas');
    expect(apiMock).toHaveBeenCalledTimes(1);
  });
});

describe('review audio', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let playing: boolean;

  beforeEach(() => {
    apiMock.mockReset();
    playing = false;
    fetchMock = vi.fn(async () => downloadResponse());
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:note');
    URL.revokeObjectURL = vi.fn();
    // jsdom has no media pipeline: make play/pause real enough to observe.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => {
      playing = true;
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {
      playing = false;
    });
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(() => !playing);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shares ONE element and ONE download between the marker click and the list control', async () => {
    const mod = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');

    // Clicking the review in the scrub bar…
    await mod.playReviewAudio('video-g', 'item-g');
    expect(mod.isReviewAudioPlaying('video-g', 'item-g')).toBe(true);

    // …then the play control in the review list: pause, play again.
    await mod.toggleReviewAudio('video-g', 'item-g');
    expect(mod.isReviewAudioPlaying('video-g', 'item-g')).toBe(false);
    await mod.toggleReviewAudio('video-g', 'item-g');
    expect(mod.isReviewAudioPlaying('video-g', 'item-g')).toBe(true);

    // Same element, same cached clip: exactly one download for all of it.
    expect(await mod.getReviewAudio('video-g', 'item-g')).toBe(
      await mod.getReviewAudio('video-g', 'item-g'),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops the previous note when another one starts', async () => {
    const mod = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');

    await mod.playReviewAudio('video-h', 'item-h1');
    const first = (await mod.getReviewAudio('video-h', 'item-h1'))!;
    const pauseSpy = vi.spyOn(first, 'pause');

    await mod.playReviewAudio('video-h', 'item-h2');

    expect(pauseSpy).toHaveBeenCalled();
    expect(mod.isReviewAudioPlaying('video-h', 'item-h2')).toBe(true);
  });

  it('follows the player output settings', async () => {
    const mod = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');
    mod.setReviewAudioOutput({ muted: true, volume: 0.4 });

    await mod.playReviewAudio('video-i', 'item-i');
    const audio = (await mod.getReviewAudio('video-i', 'item-i'))!;

    expect(audio.muted).toBe(true);
    expect(audio.volume).toBeCloseTo(0.4);
  });

  it('resumes from where the scrubber left it, and starts over once finished', async () => {
    const mod = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');
    vi.spyOn(HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(10);

    await mod.playReviewAudio('video-j', 'item-j');
    const audio = (await mod.getReviewAudio('video-j', 'item-j'))!;

    // Scrub to 6s, pause, press play again: it continues from 6s.
    mod.seekReviewAudio('video-j', 'item-j', 6);
    await mod.toggleReviewAudio('video-j', 'item-j'); // pause
    await mod.toggleReviewAudio('video-j', 'item-j'); // resume
    expect(audio.currentTime).toBe(6);

    // At the end there is nothing left to resume, so it replays from the top.
    await mod.toggleReviewAudio('video-j', 'item-j'); // pause
    mod.seekReviewAudio('video-j', 'item-j', 10);
    await mod.toggleReviewAudio('video-j', 'item-j');
    expect(audio.currentTime).toBe(0);
  });

  it('reports position and duration for the row scrubber', async () => {
    const mod = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');
    vi.spyOn(HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(10);

    await mod.playReviewAudio('video-k', 'item-k');
    const audio = (await mod.getReviewAudio('video-k', 'item-k'))!;
    audio.currentTime = 4;

    const state = mod.readReviewAudioState('video-k', 'item-k');
    expect(state.playing).toBe(true);
    expect(state.currentTime).toBe(4);
    expect(state.duration).toBe(10);
    // Stable object while nothing changes (useSyncExternalStore requires it).
    expect(mod.readReviewAudioState('video-k', 'item-k')).toBe(state);
  });

  it('falls back to a freshly minted URL when the download keeps failing', async () => {
    const mod = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');
    fetchMock.mockResolvedValue({ ok: false, blob: async () => new Blob(['expired']) });

    expect(await mod.loadReviewContentBlobUrl('video-l', 'item-l')).toBeNull();

    // The dead SAS was dropped, so the streaming fallback mints a third one.
    expect(await mod.loadReviewContentUrl('video-l', 'item-l')).toBe('https://blob/item?sas');
    expect(apiMock).toHaveBeenCalledTimes(3);
  });

  it('downloads nothing until a note is actually played', async () => {
    const mod = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');

    // Merely resolving state (as the row scrubber does) must not fetch.
    expect(mod.readReviewAudioState('video-n', 'item-n')).toEqual({
      playing: false,
      currentTime: 0,
      duration: 0,
    });
    expect(mod.isReviewAudioPlaying('video-n', 'item-n')).toBe(false);
    expect(apiMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    await mod.playReviewAudio('video-n', 'item-n');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-mints a stale SAS URL and retries the download once', async () => {
    const mod = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');
    fetchMock.mockResolvedValueOnce({ ok: false, blob: async () => new Blob(['expired']) });
    fetchMock.mockResolvedValueOnce(downloadResponse());

    expect(await mod.loadReviewContentBlobUrl('video-m', 'item-m')).toBe('blob:note');
    // Two SAS mints (the cached one was dropped) and two fetch attempts.
    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('primes an element with metadata only, then plays the local clip', async () => {
    const mod = await loadContentModule();
    apiMock.mockResolvedValue('https://blob/item?sas');

    mod.primeReviewAudio('video-o', 'item-o');
    await Promise.resolve();
    await Promise.resolve();

    // Only the SAS was minted — nothing of the clip itself was downloaded.
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();

    await mod.playReviewAudio('video-o', 'item-o');

    // Playing downloads the clip once and the element ends up on the blob.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await mod.getReviewAudio('video-o', 'item-o'))!.src).toBe('blob:note');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

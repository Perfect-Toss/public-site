import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchYouTubeInfo, youTubeEmbedUrl, youTubeId, youTubeThumbnail } from './youtube';

describe('youTubeId', () => {
  it('reads the id from a watch URL', () => {
    expect(youTubeId('https://www.youtube.com/watch?v=u3N6NBuUyhY')).toBe('u3N6NBuUyhY');
  });

  it('reads the id from a short link and ignores tracking query params', () => {
    expect(youTubeId('https://youtu.be/98YCir7axdU?si=5P76QKkop81lRkEG')).toBe('98YCir7axdU');
  });

  it('reads the id from shorts, embed and live URLs', () => {
    expect(youTubeId('https://www.youtube.com/shorts/jNbD55kfWFA')).toBe('jNbD55kfWFA');
    expect(youTubeId('https://www.youtube.com/embed/yyO2IA3zo-k')).toBe('yyO2IA3zo-k');
    expect(youTubeId('https://www.youtube.com/live/u3N6NBuUyhY')).toBe('u3N6NBuUyhY');
    expect(youTubeId('https://www.youtube-nocookie.com/embed/98YCir7axdU')).toBe('98YCir7axdU');
  });

  it('accepts a bare id', () => {
    expect(youTubeId('  jNbD55kfWFA  ')).toBe('jNbD55kfWFA');
  });

  it('returns null for non-video or non-YouTube input', () => {
    expect(youTubeId('https://www.youtube.com/watch')).toBeNull();
    expect(youTubeId('https://www.youtube.com/playlist?list=PL123')).toBeNull();
    expect(youTubeId('https://example.com/watch?v=u3N6NBuUyhY')).toBeNull();
    expect(youTubeId('not a url')).toBeNull();
    expect(youTubeId('')).toBeNull();
  });
});

describe('youTubeEmbedUrl / youTubeThumbnail', () => {
  it('builds the embed and thumbnail URLs for an id', () => {
    expect(youTubeEmbedUrl('u3N6NBuUyhY')).toBe('https://www.youtube-nocookie.com/embed/u3N6NBuUyhY');
    expect(youTubeThumbnail('u3N6NBuUyhY')).toBe('https://i.ytimg.com/vi/u3N6NBuUyhY/hqdefault.jpg');
  });
});

describe('fetchYouTubeInfo', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the title and channel from oEmbed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Volley Drill', author_name: 'Perfect Toss' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchYouTubeInfo('jNbD55kfWFA')).resolves.toEqual({
      title: 'Volley Drill',
      author: 'Perfect Toss',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DjNbD55kfWFA&format=json',
    );
  });

  it('returns null when the video is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(fetchYouTubeInfo('nope')).resolves.toBeNull();
  });

  it('returns null when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(fetchYouTubeInfo('jNbD55kfWFA')).resolves.toBeNull();
  });
});

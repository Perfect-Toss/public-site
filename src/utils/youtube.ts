/** A YouTube video id is always 11 characters of base64url-ish alphabet. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Hosts that carry the video id in the path instead of a `v` query parameter. */
const PATH_ID_SEGMENTS = new Set(['embed', 'shorts', 'live', 'v']);

/**
 * The 11-character video id for a YouTube link, or the input itself when it
 * already is one. Returns null for anything that isn't a YouTube video.
 */
export function youTubeId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m|music)\./, '');
  if (host !== 'youtu.be' && host !== 'youtube.com' && host !== 'youtube-nocookie.com') {
    return null;
  }

  const fromQuery = url.searchParams.get('v');
  if (fromQuery && VIDEO_ID.test(fromQuery)) return fromQuery;

  const [first, second] = url.pathname.split('/').filter(Boolean);
  if (host === 'youtu.be') {
    return first && VIDEO_ID.test(first) ? first : null;
  }
  return second && PATH_ID_SEGMENTS.has(first) && VIDEO_ID.test(second) ? second : null;
}

/** The privacy-enhanced player URL for a video id. */
export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/** The default poster frame for a video id. */
export function youTubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** A video's title and channel, as returned by YouTube's keyless oEmbed endpoint. */
export interface YouTubeVideoInfo {
  title: string;
  author: string;
}

/**
 * Reads a video's title and channel from YouTube's oEmbed endpoint. Needs no API
 * key, and returns null when the video is unavailable or the request fails.
 */
export async function fetchYouTubeInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
    );
    if (!response.ok) return null;

    const data = (await response.json()) as { title?: string; author_name?: string };
    if (!data.title) return null;

    return { title: data.title, author: data.author_name ?? '' };
  } catch {
    return null;
  }
}

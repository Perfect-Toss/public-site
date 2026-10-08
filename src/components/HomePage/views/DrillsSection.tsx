import './DrillsSection.css';

import { useEffect, useState } from 'react';
import { formatDate } from '../../../utils/format';
import {
  fetchYouTubeInfo,
  type YouTubeVideoInfo,
  youTubeId,
  youTubeThumbnail,
} from '../../../utils/youtube';
import { YouTubePlayer } from './YouTubePlayer';

interface Drill {
  /** A YouTube id or link. */
  url: string;
  /**
   * Upload date, shown under the video. YouTube's oEmbed response carries no
   * date, and the watch page / feed are not readable from the browser.
   */
  uploaded: string;
}

/** Drills shown on the home page, in display order. */
const DRILLS: Drill[] = [
  { url: 'https://youtu.be/u3N6NBuUyhY', uploaded: '2026-07-22' },
  { url: 'https://youtu.be/98YCir7axdU', uploaded: '2026-07-14' },
  { url: 'https://youtu.be/jNbD55kfWFA', uploaded: '2026-06-26' },
  { url: 'https://youtu.be/yyO2IA3zo-k', uploaded: '2026-06-06' },
];

/** The playable cards, with unusable links dropped. */
const CARDS = DRILLS.flatMap((drill) => {
  const id = youTubeId(drill.url);
  return id ? [{ id, uploaded: drill.uploaded }] : [];
});

interface DrillCardProps {
  videoId: string;
  uploaded: string;
  index: number;
  info?: YouTubeVideoInfo;
}

/**
 * One drill: the title and upload date sit below the player, stacked, so
 * neither depends on YouTube's overlay.
 */
function DrillCard({ videoId, uploaded, index, info }: DrillCardProps) {
  const label = info?.title ?? `Perfect Toss drill ${index + 1}`;

  return (
    <div className="drill-card">
      <YouTubePlayer videoId={videoId} title={label} poster={youTubeThumbnail(videoId)} />

      <div className="drill-caption">
        <h3 className="drill-title">{info?.title ?? ''}</h3>
        <span className="drill-date">{formatDate(uploaded)}</span>
      </div>
    </div>
  );
}

function DrillsSection() {
  const [info, setInfo] = useState<Record<string, YouTubeVideoInfo>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      CARDS.map(async ({ id }) => [id, await fetchYouTubeInfo(id)] as const),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, YouTubeVideoInfo> = {};
      for (const [id, value] of entries) {
        if (value) next[id] = value;
      }
      setInfo(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (CARDS.length === 0) return null;

  return (
    <section className="section">
      <div className="section-header">
        <h2>Drills</h2>
      </div>
      <div className="drills-grid">
        {CARDS.map(({ id, uploaded }, index) => (
          <DrillCard
            key={id}
            videoId={id}
            uploaded={uploaded}
            index={index}
            info={info[id]}
          />
        ))}
      </div>
    </section>
  );
}

export default DrillsSection;

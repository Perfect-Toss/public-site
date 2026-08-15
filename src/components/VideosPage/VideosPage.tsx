import '../../styles/page.css';
import './VideosPage.css';

import { faSearch, faVideo } from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchVideos, type Video } from '../../api/api.videos';
import { formatDate, formatDuration } from '../../utils/format';
import { ownerDisplayName, thumbnailSrc } from '../../utils/videos';

const PAGE_SIZE = 12;

function VideoCard({ video }: { video: Video }) {
  const navigate = useNavigate();
  const thumb = thumbnailSrc(video);
  const duration = formatDuration(video.lengthInSeconds);
  const ownerName = ownerDisplayName(video);

  const pendingUpload = video.uploadStatus === 'Pending' || video.uploadStatus === 'NotUploaded';
  const reviewRequested = video.reviewStatus === 'ReviewRequested';
  const reviewed = video.reviewStatus === 'Reviewed';

  const openVideo = useCallback(() => {
    navigate(`/videos/${video.id}`);
  }, [navigate, video.id]);

  return (
    <div
      className="video-card"
      role="button"
      tabIndex={0}
      aria-label={`Open video ${video.label || 'Untitled video'}`}
      onClick={openVideo}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openVideo();
        }
      }}
    >
      <div className="video-card-thumbnail">
        {thumb ? (
          <img src={thumb} alt={video.label ?? 'Video'} loading="lazy" />
        ) : (
          <div className="video-card-thumbnail-placeholder">
            <FontAwesomeIcon icon={faVideo} size="3x" style={{ opacity: 0.3 }} />
          </div>
        )}
        {duration !== '—' && <span className="video-card-duration">{duration}</span>}
      </div>

      <div className="video-card-body">
        <h3 className="video-card-title" title={video.label ?? ''}>
          {video.label || 'Untitled video'}
        </h3>
        <div className="video-card-meta">
          {video.timestamp && <span>{formatDate(video.timestamp)}</span>}
          {ownerName && <span>{ownerName}</span>}
        </div>

        {video.tags && video.tags.length > 0 && (
          <div className="video-card-tags">
            {video.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="video-card-tag">
                {tag.name}
              </span>
            ))}
            {video.tags.length > 3 && (
              <span className="video-card-tag">+{video.tags.length - 3}</span>
            )}
          </div>
        )}

        {(pendingUpload || reviewRequested || reviewed) && (
          <span className={`video-card-status${reviewed ? ' reviewed' : ''}`}>
            {pendingUpload
              ? 'Pending upload'
              : reviewRequested
                ? 'Review requested'
                : 'Reviewed'}
          </span>
        )}
      </div>
    </div>
  );
}

function VideosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);

  const hasMore = videos.length < totalCount;

  const loadPage = useCallback(async (page: number) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const isFirst = page === 1;
    if (isFirst) setInitialLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const response = await fetchVideos(page, PAGE_SIZE);
      const items = response.items ?? [];

      setVideos((prev) => {
        if (isFirst) return items;
        const seen = new Set(prev.map((v) => v.id));
        return [...prev, ...items.filter((v) => !seen.has(v.id))];
      });
      setTotalCount(response.totalCount ?? 0);
      setPageNumber((prev) => (isFirst ? 2 : prev + 1));
    } catch (err) {
      console.error('Failed to load videos:', err);
      setError('Failed to load videos. Please try again.');
    } finally {
      inFlightRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial page load
  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  // Infinite scroll: load the next page when the sentinel becomes visible.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !inFlightRef.current &&
          !initialLoading
        ) {
          loadPage(pageNumber);
        }
      },
      { rootMargin: '300px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, pageNumber, initialLoading, loadPage]);

  // Client-side search over the accumulated metadata.
  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter(
      (v) =>
        (v.label ?? '').toLowerCase().includes(q) ||
        ownerDisplayName(v).toLowerCase().includes(q) ||
        (v.tags ?? []).some((t) => (t.name ?? '').toLowerCase().includes(q)),
    );
  }, [videos, searchQuery]);

  const renderContent = () => {
    if (initialLoading) {
      return (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading videos...</p>
        </div>
      );
    }

    if (error && videos.length === 0) {
      return (
        <div className="error-container">
          <p>{error}</p>
          <button className="retry-button" onClick={() => loadPage(1)}>
            Retry
          </button>
        </div>
      );
    }

    if (videos.length === 0) {
      return (
        <div className="empty-state-large">
          <FontAwesomeIcon icon={faVideo} size="3x" style={{ opacity: 0.3 }} />
          <h3>No videos yet</h3>
          <p>Your video library will appear here once you start uploading content</p>
        </div>
      );
    }

    if (filteredVideos.length === 0) {
      return (
        <div className="empty-state-large">
          <FontAwesomeIcon icon={faSearch} size="3x" style={{ opacity: 0.3 }} />
          <h3>No matches</h3>
          <p>No videos match your search for “{searchQuery.trim()}”</p>
        </div>
      );
    }

    return (
      <>
        <div className="videos-grid">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>

        <div className="videos-footer" ref={sentinelRef}>
          {loadingMore && (
            <>
              <div className="spinner" />
              <span>Loading more videos...</span>
            </>
          )}
          {!loadingMore && !hasMore && videos.length > 0 && (
            <span>You&apos;ve seen all {videos.length} videos</span>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="videos-page">
      <section className="section">
        <div className="section-header">
          <h2>Videos</h2>
          <div className="header-actions">
            <div className="search-box">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {renderContent()}
      </section>
    </div>
  );
}

export default VideosPage;

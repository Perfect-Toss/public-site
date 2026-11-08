import './VideoReviewsPanel.css';

import { faChevronDown, faChevronUp, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useState } from 'react';
import { deleteVideoReviewRequest, type VideoReviewRequest } from '../../api/api.videos';
import { formatDateTime } from '../../utils/format';
import { UserInfo } from '../common';
import { REQUEST_STATUS_LABELS } from './reviewLabels';

export interface VideoReviewRequestListProps {
  videoId: string;
  requests: VideoReviewRequest[];
  /** Re-fetch the reviews/requests pair (they load together). */
  reload: () => Promise<void>;
}

/** Review requests for a video, in their own collapsible section. */
export function VideoReviewRequestList({ videoId, requests, reload }: VideoReviewRequestListProps) {
  const [open, setOpen] = useState(true);

  const handleDelete = useCallback(
    async (requestId: string) => {
      try {
        await deleteVideoReviewRequest(videoId, requestId);
        await reload();
      } catch (err) {
        console.error('Failed to delete review request:', err);
      }
    },
    [videoId, reload],
  );

  return (
    <section className="video-reviews-list-section">
      <button
        type="button"
        className="video-reviews-list-header"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
      >
        <h2>Review requests</h2>
        <span className="vr-list-count">{requests.length}</span>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="vr-chevron" />
      </button>

      {open &&
        (requests.length === 0 ? (
          <p className="vr-empty">No review requests.</p>
        ) : (
          <ul className="vr-list">
            {requests.map((request) => (
              <li key={request.id} className="vr-item">
                <div className="vr-details-head">
                  <UserInfo user={request.requestedBy ?? {}} size={24} />
                  <span
                    className={`vr-req-status vr-req-${(request.status ?? 'Unknown').toLowerCase()}`}
                  >
                    {REQUEST_STATUS_LABELS[request.status ?? 'Unknown']}
                  </span>
                  <span className="vr-item-time">{formatDateTime(request.createdAt)}</span>
                  <button
                    type="button"
                    className="vr-delete"
                    title="Delete request"
                    onClick={() => void handleDelete(request.id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
                {request.requestNote && <p className="vr-details-text">{request.requestNote}</p>}
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

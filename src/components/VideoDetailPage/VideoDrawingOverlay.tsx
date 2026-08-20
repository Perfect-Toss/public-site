import './VideoDrawingOverlay.css';

import {
  faArrowRight,
  faCamera,
  faCheck,
  faCircle,
  faEraser,
  faPen,
  faPlus,
  faRotateLeft,
  faSpinner,
  faTimes,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useRef, useState } from 'react';
import { addVideoReview, type AddVideoReviewRequest } from '../../api/api.videos';
import type { ReviewAnchor } from './ReviewAnchorPicker';
import { toTimeSpan } from './videoTime';

export interface VideoDrawingOverlayProps {
  videoId: string;
  /** The <video> element whose current frame is the drawing backdrop. */
  videoElement?: HTMLVideoElement | null;
  /** The current anchor (drawing is snapshot-only). */
  anchor: ReviewAnchor;
  /** Update the anchor (used when re-capturing the frame). */
  onAnchorChange: (anchor: ReviewAnchor) => void;
  /** Live playback position (seconds). */
  positionTime: number;
  /** Cancel / close the drawing without saving. */
  onClose: () => void;
  /** Called after a review is successfully added (parent refreshes). */
  onAdded: () => void | Promise<void>;
}

export type DrawingTool = 'pen' | 'eraser';
export type DrawingStampType = 'arrow' | 'circle' | 'check' | 'x';

interface StrokeOp {
  kind: 'stroke';
  color: string;
  eraser: boolean;
  points: Array<{ x: number; y: number }>;
}
interface StampOp {
  kind: 'stamp';
  type: DrawingStampType;
  color: string;
  x: number;
  y: number;
  size: number;
}
type DrawingOp = StrokeOp | StampOp;

const DRAW_COLORS = ['#ff4757', '#ffd93d', '#2ed573', '#1e90ff', '#ffffff'];

const STAMPS = [
  { type: 'arrow' as const, icon: faArrowRight, label: 'Arrow' },
  { type: 'circle' as const, icon: faCircle, label: 'Circle' },
  { type: 'check' as const, icon: faCheck, label: 'Check' },
  { type: 'x' as const, icon: faXmark, label: 'X' },
];

/**
 * Full-video drawing overlay for snapshot reviews. A canvas sits on top of the
 * video so the user can draw directly on the current frame, annotate it with
 * pen / eraser / stamps, and submit the drawing (as a PNG) with an optional
 * caption.
 */
export function VideoDrawingOverlay({
  videoId,
  videoElement,
  anchor,
  onAnchorChange,
  positionTime,
  onClose,
  onAdded,
}: VideoDrawingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const opsRef = useRef<DrawingOp[]>([]);
  const drawingRef = useRef(false);

  const [tool, setTool] = useState<DrawingTool | 'stamp'>('pen');
  const [stampType, setStampType] = useState<DrawingStampType>('arrow');
  const [color, setColor] = useState(DRAW_COLORS[0]);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Freeze playback so the frame being drawn on is stable.
  useEffect(() => {
    videoElement?.pause();
  }, [videoElement]);

  /** Draw the current video frame (object-fit: contain) as the backdrop. */
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const video = videoElement;
    if (!video || video.videoWidth <= 0) return;
    const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const dw = video.videoWidth * scale;
    const dh = video.videoHeight * scale;
    ctx.drawImage(video, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  }, [videoElement]);

  const drawStampShape = useCallback((ctx: CanvasRenderingContext2D, op: StampOp) => {
    ctx.save();
    ctx.strokeStyle = op.color;
    ctx.fillStyle = op.color;
    ctx.lineWidth = Math.max(3, op.size * 0.09);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const half = op.size / 2;
    switch (op.type) {
      case 'arrow': {
        const x0 = op.x - half;
        const x1 = op.x + half;
        ctx.beginPath();
        ctx.moveTo(x0, op.y);
        ctx.lineTo(x1 - half * 0.6, op.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1, op.y);
        ctx.lineTo(x1 - half * 0.8, op.y - half * 0.6);
        ctx.lineTo(x1 - half * 0.5, op.y);
        ctx.lineTo(x1 - half * 0.8, op.y + half * 0.6);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'circle': {
        ctx.beginPath();
        ctx.arc(op.x, op.y, half, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'check': {
        ctx.beginPath();
        ctx.moveTo(op.x - half * 0.8, op.y + half * 0.1);
        ctx.lineTo(op.x - half * 0.1, op.y + half * 0.6);
        ctx.lineTo(op.x + half * 0.8, op.y - half * 0.6);
        ctx.stroke();
        break;
      }
      case 'x': {
        ctx.beginPath();
        ctx.moveTo(op.x - half * 0.7, op.y - half * 0.7);
        ctx.lineTo(op.x + half * 0.7, op.y + half * 0.7);
        ctx.moveTo(op.x + half * 0.7, op.y - half * 0.7);
        ctx.lineTo(op.x - half * 0.7, op.y + half * 0.7);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }, []);

  /** Redraw the frame + all drawing operations in order. */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawFrame();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const op of opsRef.current) {
      if (op.kind === 'stroke') {
        if (op.points.length === 0) continue;
        ctx.globalCompositeOperation = op.eraser ? 'destination-out' : 'source-over';
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.eraser ? 30 : 5;
        ctx.beginPath();
        op.points.forEach((point, i) => {
          if (i === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        drawStampShape(ctx, op);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [drawFrame, drawStampShape]);

  // Size the canvas to its display box and draw the initial frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
    }
    redraw();
  }, [redraw]);

  const pointFromEvent = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      const p = pointFromEvent(e);
      if (tool === 'stamp') {
        const dim = Math.min(canvasRef.current?.width ?? 0, canvasRef.current?.height ?? 0);
        const size = Math.max(48, dim * 0.12);
        opsRef.current = [
          ...opsRef.current,
          { kind: 'stamp', type: stampType, color, x: p.x, y: p.y, size },
        ];
        redraw();
      } else {
        opsRef.current = [
          ...opsRef.current,
          { kind: 'stroke', color, eraser: tool === 'eraser', points: [p] },
        ];
      }
    },
    [tool, stampType, color, pointFromEvent, redraw],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const ops = opsRef.current;
      const last = ops[ops.length - 1];
      if (!last || last.kind !== 'stroke') return;
      last.points = [...last.points, pointFromEvent(e)];
      redraw();
    },
    [pointFromEvent, redraw],
  );

  const onPointerUp = useCallback(() => {
    drawingRef.current = false;
  }, []);

  const undo = useCallback(() => {
    opsRef.current = opsRef.current.slice(0, -1);
    redraw();
  }, [redraw]);

  const clear = useCallback(() => {
    opsRef.current = [];
    redraw();
  }, [redraw]);

  /** Re-capture the current video frame as the backdrop and sync the anchor. */
  const captureFrame = useCallback(() => {
    redraw();
    onAnchorChange({ kind: 'snapshot', time: positionTime });
  }, [redraw, onAnchorChange, positionTime]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas?.toDataURL('image/png');
      const comma = dataUrl ? dataUrl.indexOf(',') : -1;
      const body: AddVideoReviewRequest = { text: caption.trim() || null };
      const timestamp =
        anchor.kind === 'snapshot'
          ? anchor.time
          : anchor.kind === 'segment'
            ? anchor.start
            : positionTime;
      body.timestamp = toTimeSpan(timestamp);
      if (dataUrl && comma >= 0) {
        body.drawingData = dataUrl.slice(comma + 1);
        body.drawingMimeType = 'image/png';
      }
      await addVideoReview(videoId, body);
      await onAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add review:', err);
      setSubmitError('Failed to add review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [caption, anchor, positionTime, videoId, onAdded, onClose]);

  return (
    <div
      className="vdo-overlay"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="vdo-toolbar">
        <div className="vdo-tool-group">
          <button
            type="button"
            className={`vdo-tool${tool === 'pen' ? ' active' : ''}`}
            onClick={() => setTool('pen')}
            title="Pen"
            aria-label="Pen"
          >
            <FontAwesomeIcon icon={faPen} />
          </button>
          <button
            type="button"
            className={`vdo-tool${tool === 'eraser' ? ' active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Eraser"
            aria-label="Eraser"
          >
            <FontAwesomeIcon icon={faEraser} />
          </button>
        </div>

        <div className="vdo-tool-group">
          {STAMPS.map((stamp) => (
            <button
              key={stamp.type}
              type="button"
              className={`vdo-tool${tool === 'stamp' && stampType === stamp.type ? ' active' : ''}`}
              onClick={() => {
                setStampType(stamp.type);
                setTool('stamp');
              }}
              title={stamp.label}
              aria-label={stamp.label}
            >
              <FontAwesomeIcon icon={stamp.icon} />
            </button>
          ))}
        </div>

        <div className="vdo-colors">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`vdo-swatch${color === c ? ' active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <div className="vdo-tool-group">
          <button type="button" className="vdo-tool" onClick={undo} title="Undo" aria-label="Undo">
            <FontAwesomeIcon icon={faRotateLeft} />
          </button>
          <button type="button" className="vdo-tool" onClick={clear} title="Clear" aria-label="Clear">
            <FontAwesomeIcon icon={faTrash} />
          </button>
          <button
            type="button"
            className="vdo-tool"
            onClick={captureFrame}
            title="Capture frame"
            aria-label="Capture frame"
          >
            <FontAwesomeIcon icon={faCamera} />
          </button>
          <button
            type="button"
            className="vdo-tool vdo-close"
            onClick={onClose}
            title="Cancel"
            aria-label="Cancel"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="vdo-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      <div className="vdo-compose">
        <textarea
          className="vdo-caption"
          rows={1}
          placeholder="Add a caption (optional)..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <button
          type="button"
          className="vdo-submit"
          onClick={() => void submit()}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin />
              Adding...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faPlus} />
              Add review
            </>
          )}
        </button>
      </div>

      {submitError && <p className="vdo-error">{submitError}</p>}
    </div>
  );
}

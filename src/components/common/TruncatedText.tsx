import { useCallback, useEffect, useRef, useState } from 'react';

export interface TruncatedTextProps {
  /** The text to render. Used as the tooltip only when it is actually clipped. */
  text: string;
  className?: string;
}

/**
 * A span that ellipsizes its text (the caller supplies the ellipsis styles) and
 * exposes a `title` tooltip only when the text is clipped — so fully visible
 * text never gets a redundant tooltip. Re-measures on resize and text change.
 */
export function TruncatedText({ text, className }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setClipped(el.scrollWidth > el.clientWidth);
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, text]);

  return (
    <span ref={ref} className={className} title={clipped ? text : undefined}>
      {text}
    </span>
  );
}

export default TruncatedText;

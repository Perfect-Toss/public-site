/**
 * How long a restore keeps re-applying while the page is still growing.
 * Pages fetch their data after the route commits, so the document is often too
 * short to hold the saved offset at first.
 */
const RESTORE_TIMEOUT_MS = 1000;

/**
 * Scrolls the window to `top`, re-applying while the page is still growing and
 * stopping as soon as the offset sticks, the page stops growing, or the user
 * takes over (wheel / touch / key).
 *
 * Returns a function that cancels a restore still in progress.
 */
export function restoreScroll(top: number): () => void {
  const target = Math.max(0, top);
  const deadline = Date.now() + RESTORE_TIMEOUT_MS;
  let frame = 0;
  let done = false;

  const stop = () => {
    if (done) return;
    done = true;
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('keydown', stop);
  };

  const apply = () => {
    if (done) return;
    window.scrollTo(0, target);

    // Still short of where we belong: the page is probably still loading.
    if (target > 0 && window.scrollY < target - 1 && Date.now() < deadline) {
      frame = requestAnimationFrame(apply);
      return;
    }
    stop();
  };

  if (target > 0) {
    window.addEventListener('wheel', stop, { passive: true, once: true });
    window.addEventListener('touchstart', stop, { passive: true, once: true });
    window.addEventListener('keydown', stop, { once: true });
  }
  apply();

  return stop;
}

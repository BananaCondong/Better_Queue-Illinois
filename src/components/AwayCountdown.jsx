import { useState, useEffect } from 'react';

/**
 * Live countdown until an away student is auto-removed from the queue.
 * `awayTimeoutSeconds` is the configured removal delay (demo: seconds).
 */
export default function AwayCountdown({ awaySince, awayTimeoutSeconds, active }) {
  const [remainingSec, setRemainingSec] = useState(0);

  useEffect(() => {
    if (!active || awaySince == null) return;
    const awayMs = typeof awaySince === 'number' ? awaySince : Number(awaySince);
    if (!Number.isFinite(awayMs)) return;
    const totalSec = Math.max(1, awayTimeoutSeconds);
    const tick = () => {
      const elapsed = (Date.now() - awayMs) / 1000;
      setRemainingSec(Math.max(0, Math.ceil(totalSec - elapsed)));
    };
    const t0 = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, [active, awaySince, awayTimeoutSeconds]);

  if (!active || awaySince == null) return null;

  return (
    <p className="away-countdown" role="status" aria-live="polite">
      <span className="away-countdown__label">Away</span>
      <span className="away-countdown__sep" aria-hidden="true">
        ·
      </span>
      <span className="away-countdown__timer">Removes in {remainingSec}s</span>
    </p>
  );
}

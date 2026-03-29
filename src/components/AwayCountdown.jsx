import { useState, useEffect } from 'react';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Live countdown until an away student is auto-removed from the queue.
 */
export default function AwayCountdown({ awaySince, awayTimeoutMinutes, active }) {
  const [remainingSec, setRemainingSec] = useState(0);

  useEffect(() => {
    if (!active || awaySince == null) return;
    const awayMs = typeof awaySince === 'number' ? awaySince : Number(awaySince);
    if (!Number.isFinite(awayMs)) return;
    const totalSec = awayTimeoutMinutes * 60;
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
  }, [active, awaySince, awayTimeoutMinutes]);

  if (!active || awaySince == null) return null;

  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;

  return (
    <p className="away-countdown" role="status" aria-live="polite">
      <span className="away-countdown__label">Away</span>
      <span className="away-countdown__sep" aria-hidden="true">
        ·
      </span>
      <span className="away-countdown__timer">
        Removes in {m}:{pad2(s)}
      </span>
    </p>
  );
}

import { useState, useEffect } from 'react';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Live countdown until an away student is auto-removed from the queue.
 */
export default function AwayCountdown({ awaySince, awayTimeoutMinutes, active }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active || awaySince == null) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active, awaySince]);

  if (!active || awaySince == null) return null;

  const totalSec = awayTimeoutMinutes * 60;
  const elapsed = (Date.now() - awaySince) / 1000;
  const remaining = Math.max(0, Math.ceil(totalSec - elapsed));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

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

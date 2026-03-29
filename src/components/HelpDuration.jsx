import { useState, useEffect } from 'react';

function formatElapsed(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Live MM:SS from when this instance mounted (use key={helpStartedAt} on parent
 * so a new help session resets the counter).
 */
export default function HelpDuration() {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="help-duration" title="Time helping this student">
      {formatElapsed(elapsedSec)}
    </span>
  );
}

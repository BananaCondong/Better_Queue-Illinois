import { useState, useEffect } from 'react';

/**
 * Live elapsed seconds from when this instance mounted (use key={helpStartedAt} on parent
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
      {elapsedSec}s
    </span>
  );
}

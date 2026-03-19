'use client';

import { useRef, useEffect } from 'react';

interface Props {
  current: number;
  total: number;
}

const DURATION_MS = 900;

// Module-level: persists across remounts for the lifetime of the page session
let prevPct     = 0;
let prevCurrent = 0;

export default function StepProgress({ current, total }: Props) {
  const fillRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const targetPct = ((current - 1) / (total - 1)) * 100;

  // Snapshot the "from" state at render time before the effect updates it
  const fromPct     = prevPct;
  const fromCurrent = prevCurrent;

  useEffect(() => {
    const fillEl = fillRef.current;
    if (!fillEl) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const fillDistance = Math.abs(targetPct - fromPct);
    const isForward    = targetPct >= fromPct;
    const animDuration = fillDistance > 0 ? DURATION_MS / 1000 : 0;

    // GSAP animates the fill line from its current rendered position
    import('gsap').then(({ gsap }) => {
      gsap.to(fillEl, { width: `${targetPct}%`, duration: animDuration, ease: 'power1.out' });
    }).catch(() => {
      fillEl.style.width = `${targetPct}%`;
    });

    // Update dot states, timed to when the fill line reaches each dot
    for (let i = 0; i < total; i++) {
      const dotEl = dotRefs.current[i];
      if (!dotEl) continue;

      const isPast   = i + 1 < current;
      const isActive = i + 1 === current;
      const wasPast   = i + 1 < fromCurrent;
      const wasActive = i + 1 === fromCurrent;

      // Nothing changed for this dot
      if ((isPast && wasPast) || (isActive && wasActive)) continue;

      const dotPct = (i / (total - 1)) * 100;
      let delay = 0;

      // Only delay when moving forward and the line hasn't reached this dot yet
      if (isForward && fillDistance > 0 && dotPct > fromPct) {
        delay = ((dotPct - fromPct) / fillDistance) * DURATION_MS;
      }

      timeouts.push(setTimeout(() => {
        dotEl.classList.remove('past', 'active');
        if (isActive)    dotEl.classList.add('active');
        else if (isPast) dotEl.classList.add('past');
      }, delay));
    }

    // Persist for the next mount
    prevPct     = targetPct;
    prevCurrent = current;

    return () => timeouts.forEach(clearTimeout);
  }, [targetPct, current, total, fromPct, fromCurrent]);

  return (
    <div className="step-milestone">
      <div className="step-milestone-track">
        <div
          className="step-milestone-fill"
          ref={fillRef}
          style={{ width: `${fromPct}%` }}
        />
      </div>
      {Array.from({ length: total }).map((_, i) => {
        const initClass =
          i + 1 < fromCurrent ? 'past' :
          i + 1 === fromCurrent ? 'active' : '';
        return (
          <div
            key={i}
            ref={(el) => { dotRefs.current[i] = el; }}
            className={`step-milestone-dot${initClass ? ` ${initClass}` : ''}`}
          />
        );
      })}
    </div>
  );
}

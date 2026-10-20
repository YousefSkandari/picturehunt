import { useEffect, useState } from 'react';

/** The current time, refreshed every second. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** "h:mm:ss" (or "m:ss") from `now` until `iso`, or null once it has passed. */
export function formatCountdown(iso: string | undefined, now: number): string | null {
  if (!iso) return null;
  const left = Math.floor((new Date(iso).getTime() - now) / 1000);
  if (left <= 0) return null;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

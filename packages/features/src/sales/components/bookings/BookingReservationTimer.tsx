import { type ReactElement, useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface BookingReservationTimerProps {
  expiresAt?: string | null;
  status: string;
}

function calculateTimeRemaining(targetIso: string): {
  hours: number;
  minutes: number;
  isExpired: boolean;
} {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { hours: 0, minutes: 0, isExpired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, isExpired: false };
}

export function BookingReservationTimer({
  expiresAt,
  status,
}: BookingReservationTimerProps): ReactElement {
  const [remaining, setRemaining] = useState(() =>
    expiresAt ? calculateTimeRemaining(expiresAt) : null,
  );

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      setRemaining(calculateTimeRemaining(expiresAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || status !== 'REQUESTED') {
    return <></>;
  }

  if (remaining?.isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-semibold bg-danger/12 text-danger border border-danger/20">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        Hold Expired
      </span>
    );
  }

  const isUrgent = (remaining?.hours ?? 0) < 12;
  const badgeStyle = isUrgent
    ? 'bg-danger/12 text-danger border-danger/20 animate-pulse'
    : 'bg-warning/12 text-warning border-warning/20';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-semibold border ${badgeStyle}`}
      title="Reservation hold countdown. Deposit must be received before expiry."
    >
      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="tabular-nums">
        {remaining?.hours}h {remaining?.minutes}m hold remaining
      </span>
    </span>
  );
}

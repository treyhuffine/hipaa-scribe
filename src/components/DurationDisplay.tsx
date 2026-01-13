/**
 * DurationDisplay Component
 *
 * Displays recording duration that updates every second.
 * Isolated with its own state to prevent parent re-renders.
 */

'use client';

import { useState, useEffect } from 'react';

interface DurationDisplayProps {
  isActive: boolean;
}

export function DurationDisplay({ isActive }: DurationDisplayProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setSeconds(0);
      return;
    }

    // Local interval - doesn't affect parent component
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const formatMinutes = (secs: number): string => {
    const mins = Math.ceil(secs / 60);
    return `${mins} min`;
  };

  return (
    <div className="text-center">
      <p className="text-lg font-medium text-muted-foreground">
        {formatMinutes(seconds)} recorded
      </p>
    </div>
  );
}

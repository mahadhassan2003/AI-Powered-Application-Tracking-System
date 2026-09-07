import React from 'react';
import { Badge } from '@/components/ui/badge';

export interface ScoreRingProps {
  score?: number | null;
  className?: string;
}

export function ScoreRing({ score, className = '' }: ScoreRingProps) {
  const getScoreColor = (value: number) => {
    if (!value) return 'text-zinc-400 font-normal';
    if (value >= 80) return 'text-emerald-600 dark:text-emerald-400 font-bold';
    if (value >= 60) return 'text-yellow-600 dark:text-yellow-400 font-semibold';
    return 'text-orange-600 dark:text-orange-400 font-medium';
  };

  const getBarColor = (value: number) => {
    if (value >= 80) return 'bg-emerald-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  if (!score) {
    return (
      <Badge variant="outline" className={`bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700 font-normal ${className}`}>
        Analyzing...
      </Badge>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className={`text-lg ${getScoreColor(score)}`}>
        {Math.round(score)}%
      </div>
      <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${getBarColor(score)}`} 
          style={{ width: `${score}%` }} 
        />
      </div>
    </div>
  );
}

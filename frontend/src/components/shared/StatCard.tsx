import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className = '' }: StatCardProps) {
  return (
    <Card className={`bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="tracking-tight text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </p>
          {icon && (
            <div className="h-4 w-4 text-zinc-400">
              {icon}
            </div>
          )}
        </div>
        <div className="flex items-baseline justify-between mt-2">
          <h2 className="text-3xl font-bold tracking-tight">{value}</h2>
          
          {trend && (
            <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
              trend.isPositive !== false 
                ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50' 
                : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50'
            }`}>
              {trend.isPositive !== false ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {trend.value}%
              <span className="sr-only">{trend.label}</span>
            </div>
          )}
        </div>
        {trend && trend.label && (
          <p className="text-xs text-zinc-500 mt-2">{trend.label}</p>
        )}
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions: FilterOption[];
  className?: string;
}

export function FilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  className = ''
}: FilterToolbarProps) {
  return (
    <div className={`flex items-center gap-3 w-full md:w-auto ${className}`}>
      {/* Search Input */}
      <div className="relative flex-1 md:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10 w-full"
        />
      </div>
      
      {/* Dropdown Filter */}
      {statusOptions && statusOptions.length > 0 && (
        <div className="relative">
          <select
            className="h-10 pl-3 pr-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium focus:ring-2 focus:ring-blue-500 appearance-none"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
      )}
    </div>
  );
}

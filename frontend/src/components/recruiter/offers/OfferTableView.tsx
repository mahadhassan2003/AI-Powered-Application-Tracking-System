import React, { useMemo, useRef, useState } from 'react';
import { OfferResponse } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, Eye, DollarSign, AlertTriangle, Clock, FileSignature, Send, XCircle } from 'lucide-react';

interface OfferTableViewProps {
  offers: OfferResponse[];
  focusedIndex: number;
  onFocusChange: (idx: number) => void;
  onOpen: (offer: OfferResponse) => void;
  onSend: (id: number) => void;
  onWithdraw: (id: number) => void;
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (key: string) => void;
  isMutating: boolean;
}

type RiskLevel = 'critical' | 'warning' | 'info' | null;

function computeRisk(offer: OfferResponse): { level: RiskLevel; label: string } {
  if (['accepted', 'declined', 'expired', 'withdrawn', 'draft'].includes(offer.status)) {
    return { level: null, label: '' };
  }
  // Expiring within 48h
  if (offer.expires_at) {
    const hoursLeft = (new Date(offer.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft <= 0) return { level: 'critical', label: 'Expired' };
    if (hoursLeft <= 48) return { level: 'critical', label: `Expires in ${Math.ceil(hoursLeft)}h` };
    if (hoursLeft <= 168) return { level: 'warning', label: `Expires in ${Math.ceil(hoursLeft / 24)}d` };
  }
  // Viewed but no response for 5+ days
  if (offer.status === 'viewed' && offer.viewed_at && !offer.responded_at) {
    const daysSinceViewed = (Date.now() - new Date(offer.viewed_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceViewed >= 5) return { level: 'warning', label: `No response ${Math.floor(daysSinceViewed)}d` };
  }
  return { level: null, label: '' };
}

export function OfferTableView({
  offers,
  focusedIndex,
  onFocusChange,
  onOpen,
  onSend,
  onWithdraw,
  sortKey,
  sortDirection,
  onSortChange,
  isMutating
}: OfferTableViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  // Filter
  const filteredOffers = useMemo(() => {
    let result = offers;
    if (filterStatus !== 'all') result = result.filter(o => o.status === filterStatus);
    if (filterRisk === 'at_risk') result = result.filter(o => computeRisk(o).level !== null);
    return result;
  }, [offers, filterStatus, filterRisk]);

  // Sort
  const sortedOffers = useMemo(() => {
    const sorted = [...filteredOffers];
    sorted.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortKey) {
        case 'candidate_name': aVal = (a.candidate_name || '').toLowerCase(); bVal = (b.candidate_name || '').toLowerCase(); break;
        case 'position_title': aVal = (a.position_title || '').toLowerCase(); bVal = (b.position_title || '').toLowerCase(); break;
        case 'base_salary': aVal = a.base_salary + (a.signing_bonus || 0) + (a.stock_options || 0); bVal = b.base_salary + (b.signing_bonus || 0) + (b.stock_options || 0); break;
        case 'status': aVal = (a.status || '').toLowerCase(); bVal = (b.status || '').toLowerCase(); break;
        case 'sent_at': aVal = a.sent_at ? new Date(a.sent_at).getTime() : 0; bVal = b.sent_at ? new Date(b.sent_at).getTime() : 0; break;
        case 'expires_at': aVal = a.expires_at ? new Date(a.expires_at).getTime() : Infinity; bVal = b.expires_at ? new Date(b.expires_at).getTime() : Infinity; break;
        default: return 0;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredOffers, sortKey, sortDirection]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (sortedOffers.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); onFocusChange(Math.min(focusedIndex + 1, sortedOffers.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); onFocusChange(Math.max(focusedIndex - 1, 0)); }
    else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < sortedOffers.length) { e.preventDefault(); onOpen(sortedOffers[focusedIndex]); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300';
      case 'sent': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
      case 'viewed': return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'declined': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400';
      case 'expired': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
      case 'withdrawn': return 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-500';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200';
    }
  };

  const getRiskBadge = (risk: { level: RiskLevel; label: string }) => {
    if (!risk.level) return <span className="text-zinc-300 dark:text-zinc-700">—</span>;
    const cls = risk.level === 'critical'
      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 animate-pulse'
      : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
    return (
      <Badge variant="outline" className={`text-[10px] border ${cls}`}>
        <AlertTriangle className="w-3 h-3 mr-1" />{risk.label}
      </Badge>
    );
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />;
  };

  const uniqueStatuses = useMemo(() => [...new Set(offers.map(o => o.status))], [offers]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filter Bar */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 shrink-0">
        <Filter className="w-4 h-4 text-zinc-400" />
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={(v) => setFilterRisk(v ?? 'all')}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="All Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Offers</SelectItem>
            <SelectItem value="at_risk">At Risk Only</SelectItem>
          </SelectContent>
        </Select>
        {(filterStatus !== 'all' || filterRisk !== 'all') && (
          <button onClick={() => { setFilterStatus('all'); setFilterRisk('all'); }} className="text-xs text-blue-600 hover:text-blue-700 font-medium ml-1">Clear filters</button>
        )}
        <span className="ml-auto text-xs text-zinc-400">{sortedOffers.length} offer{sortedOffers.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto outline-none focus-within:ring-1 focus-within:ring-inset focus-within:ring-blue-500/20" tabIndex={0} ref={containerRef} onKeyDown={handleKeyDown}>
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('candidate_name')}>
                <div className="flex items-center gap-1.5">Candidate <SortIcon column="candidate_name" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('position_title')}>
                <div className="flex items-center gap-1.5">Job Title <SortIcon column="position_title" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('base_salary')}>
                <div className="flex items-center gap-1.5">Total Comp <SortIcon column="base_salary" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('status')}>
                <div className="flex items-center gap-1.5">Status <SortIcon column="status" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('sent_at')}>
                <div className="flex items-center gap-1.5">Sent <SortIcon column="sent_at" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 group" onClick={() => onSortChange('expires_at')}>
                <div className="flex items-center gap-1.5">Expires <SortIcon column="expires_at" /></div>
              </th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 bg-white dark:bg-zinc-950">
            {sortedOffers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-12 py-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                      <FileSignature className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No offers found</h3>
                    <p className="text-sm text-zinc-500">
                      {filterStatus !== 'all' || filterRisk !== 'all' ? 'No offers match your current filters.' : 'There are no offers in this view yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : null}
            {sortedOffers.map((offer, index) => {
              const isFocused = focusedIndex === index;
              const risk = computeRisk(offer);
              const totalComp = offer.base_salary + (offer.signing_bonus || 0) + (offer.stock_options || 0);

              return (
                <tr
                  key={offer.id}
                  className={`transition-all duration-150 group cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 ${isFocused ? 'ring-2 ring-inset ring-blue-500 shadow-[inset_4px_0_0_0_#3b82f6] bg-blue-50/30 dark:bg-blue-900/20' : ''}`}
                  onClick={() => { onFocusChange(index); onOpen(offer); }}
                >
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{offer.candidate_name || `#${offer.candidate_id}`}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{offer.position_title}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
                      {formatCurrency(totalComp, offer.currency)}
                    </div>
                    {(offer.signing_bonus > 0 || offer.stock_options > 0) && (
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        Base {formatCurrency(offer.base_salary, offer.currency)}
                        {offer.signing_bonus > 0 && ` + ${formatCurrency(offer.signing_bonus, offer.currency)} sign`}
                        {offer.stock_options > 0 && ` + ${formatCurrency(offer.stock_options, offer.currency)} equity`}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`capitalize border ${getStatusColor(offer.status)}`}>{offer.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {offer.sent_at ? new Date(offer.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {offer.expires_at ? new Date(offer.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">{getRiskBadge(risk)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-blue-600" title="View details" onClick={() => { onFocusChange(index); onOpen(offer); }}>
                        <Eye className="w-4 h-4" />
                      </button>
                      {offer.status === 'draft' && (
                        <button className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-500 hover:text-blue-600" title="Send offer" disabled={isMutating} onClick={() => onSend(offer.id)}>
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {['sent', 'viewed'].includes(offer.status) && (
                        <button className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-500 hover:text-red-600" title="Withdraw" disabled={isMutating} onClick={() => onWithdraw(offer.id)}>
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

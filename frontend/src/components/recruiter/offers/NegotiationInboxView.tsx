import React from 'react';
import { OfferResponse, NegotiationResponse } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, MessageSquare, ArrowUpRight, ArrowDownRight, DollarSign, Clock, UserRound, Briefcase, Loader2 } from 'lucide-react';

export interface OfferWithNegotiations {
  offer: OfferResponse;
  negotiations: NegotiationResponse[];
  isLoading: boolean;
}

interface NegotiationInboxViewProps {
  items: OfferWithNegotiations[];
  onAcceptNegotiation: (offerId: number, negotiationId: number) => void;
  onDeclineNegotiation: (offerId: number, negotiationId: number) => void;
  onOpen: (offer: OfferResponse) => void;
  isMutating: boolean;
}

export function NegotiationInboxView({
  items,
  onAcceptNegotiation,
  onDeclineNegotiation,
  onOpen,
  isMutating
}: NegotiationInboxViewProps) {
  // Filter to only items with pending negotiations where candidate initiated
  const pendingItems = items.filter(item => {
    if (item.isLoading) return true; // Show loading placeholders
    return item.negotiations.some(n => n.status === 'pending' && n.initiated_by === 'candidate');
  });

  if (pendingItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/30 m-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No Pending Negotiations</h3>
        <p className="text-zinc-500 text-sm mt-1">All negotiations have been addressed. Great work!</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {pendingItems.map(({ offer, negotiations, isLoading }) => {
        if (isLoading) {
          return (
            <Card key={offer.id} className="p-6 animate-pulse">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-3" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded w-1/2" />
            </Card>
          );
        }

        const pendingNegs = negotiations.filter(n => n.status === 'pending' && n.initiated_by === 'candidate');
        if (pendingNegs.length === 0) return null;

        // Show latest pending negotiation
        const latestNeg = pendingNegs[pendingNegs.length - 1];
        const salaryDelta = latestNeg.proposed_salary ? latestNeg.proposed_salary - offer.base_salary : 0;
        const salaryDeltaPct = offer.base_salary > 0 ? (salaryDelta / offer.base_salary) * 100 : 0;
        const isIncrease = salaryDelta > 0;

        return (
          <Card
            key={offer.id}
            className="overflow-hidden border-violet-200 dark:border-violet-500/20 bg-violet-50/20 dark:bg-violet-900/5 cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => onOpen(offer)}
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <UserRound className="w-4 h-4 text-zinc-400" />
                      {offer.candidate_name || `Candidate #${offer.candidate_id}`}
                    </h3>
                    <p className="text-sm text-zinc-500 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" /> {offer.position_title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-500/20 dark:text-violet-400">
                    Round {latestNeg.round_number}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400">
                    <Clock className="w-3 h-3 mr-1" /> Awaiting your response
                  </Badge>
                </div>
              </div>

              {/* Salary Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div className="bg-white/60 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Current Offer</p>
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-zinc-400" />
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: offer.currency, maximumFractionDigits: 0 }).format(offer.base_salary)}
                  </p>
                </div>
                <div className="bg-white/80 dark:bg-zinc-900/80 p-4 rounded-lg border border-violet-200 dark:border-violet-500/30 shadow-sm ring-1 ring-violet-500/10">
                  <p className="text-[10px] uppercase text-violet-600 font-bold mb-1">Candidate Asks</p>
                  <p className="text-base font-bold text-violet-900 dark:text-violet-100 flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-violet-500" />
                    {latestNeg.proposed_salary
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: offer.currency, maximumFractionDigits: 0 }).format(latestNeg.proposed_salary)
                      : 'No salary change'}
                  </p>
                </div>
                {latestNeg.proposed_salary && (
                  <div className={`p-4 rounded-lg border flex flex-col items-center justify-center ${isIncrease ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-800/30' : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'}`}>
                    <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Delta</p>
                    <p className={`text-base font-bold flex items-center gap-1 ${isIncrease ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isIncrease ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {salaryDeltaPct >= 0 ? '+' : ''}{salaryDeltaPct.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Benefits Changes */}
              {(latestNeg.proposed_benefits || latestNeg.proposed_signing_bonus || latestNeg.proposed_stock_options) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {latestNeg.proposed_signing_bonus != null && (
                    <Badge variant="secondary" className="text-xs">Signing: ${latestNeg.proposed_signing_bonus.toLocaleString()}</Badge>
                  )}
                  {latestNeg.proposed_stock_options != null && (
                    <Badge variant="secondary" className="text-xs">Equity: ${latestNeg.proposed_stock_options.toLocaleString()}</Badge>
                  )}
                  {latestNeg.proposed_benefits && (
                    <Badge variant="secondary" className="text-xs truncate max-w-[200px]">{latestNeg.proposed_benefits}</Badge>
                  )}
                </div>
              )}

              {/* Reasoning */}
              {latestNeg.reasoning && (
                <div className="mb-5 bg-white/40 dark:bg-zinc-900/30 p-3 rounded-md italic text-sm text-zinc-600 dark:text-zinc-400 border-l-2 border-violet-400">
                  &ldquo;{latestNeg.reasoning}&rdquo;
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-violet-200/50 dark:border-violet-500/10" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                  disabled={isMutating}
                  onClick={() => onDeclineNegotiation(offer.id, latestNeg.id)}
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Decline Terms
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isMutating}
                  onClick={() => onAcceptNegotiation(offer.id, latestNeg.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Accept Terms
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

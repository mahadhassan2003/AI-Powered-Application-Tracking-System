import React from 'react';
import { OfferResponse } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Send, Eye, Copy, Trash2, FileSignature, Briefcase, UserRound, Calendar } from 'lucide-react';

interface OfferDraftViewProps {
  drafts: OfferResponse[];
  onOpen: (offer: OfferResponse) => void;
  onSend: (id: number) => void;
  onDuplicate: (offer: OfferResponse) => void;
  onCreateNew: () => void;
  isMutating: boolean;
}

export function OfferDraftView({
  drafts,
  onOpen,
  onSend,
  onDuplicate,
  onCreateNew,
  isMutating
}: OfferDraftViewProps) {
  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/30 m-4">
        <FileSignature className="w-12 h-12 text-zinc-300 mb-4" />
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">No Draft Offers</h3>
        <p className="text-zinc-500 text-sm mb-6 max-w-sm text-center">When a candidate reaches the offer stage, use the AI Copilot to draft a competitive proposal.</p>
        <Button onClick={onCreateNew} className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200">
          <FileSignature className="w-4 h-4 mr-2" /> Draft New Offer
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-zinc-500">{drafts.length} draft{drafts.length !== 1 ? 's' : ''} pending review</p>
        <Button size="sm" onClick={onCreateNew} className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200">
          <FileSignature className="w-4 h-4 mr-2" /> New Draft
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {drafts.map((draft) => {
          const totalComp = draft.base_salary + (draft.signing_bonus || 0) + (draft.stock_options || 0);
          return (
            <Card key={draft.id} className="overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm cursor-pointer group" onClick={() => onOpen(draft)}>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <UserRound className="w-4 h-4 text-zinc-400" />
                      {draft.candidate_name || `Candidate #${draft.candidate_id}`}
                    </h3>
                    <p className="text-sm text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3.5 h-3.5" /> {draft.position_title}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
                    Draft
                  </Badge>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-zinc-500 font-bold">Total Comp</span>
                    <span className="font-bold text-lg text-zinc-900 dark:text-white flex items-center">
                      <DollarSign className="w-4 h-4 text-zinc-400" />
                      {formatCurrency(totalComp, draft.currency)}
                    </span>
                  </div>
                  {(draft.signing_bonus > 0 || draft.stock_options > 0) && (
                    <p className="text-[10px] text-zinc-400 mt-1 text-right">
                      Base {formatCurrency(draft.base_salary, draft.currency)}
                      {draft.signing_bonus > 0 && ` + ${formatCurrency(draft.signing_bonus, draft.currency)} sign`}
                      {draft.stock_options > 0 && ` + ${formatCurrency(draft.stock_options, draft.currency)} equity`}
                    </p>
                  )}
                </div>

                <div className="flex items-center text-xs text-zinc-500 gap-2 mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  Start: {new Date(draft.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>

                <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => onOpen(draft)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-zinc-500" onClick={() => onDuplicate(draft)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" disabled={isMutating} onClick={() => onSend(draft.id)}>
                    <Send className="w-3.5 h-3.5 mr-1" /> Send
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

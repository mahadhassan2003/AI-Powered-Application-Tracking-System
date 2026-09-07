import React, { useState, useEffect } from 'react';
import { OfferResponse, NegotiationResponse } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, DollarSign, Calendar, Briefcase, MapPin, FileText, Award, ArrowUpRight, ArrowDownRight, Send, XCircle, Copy, Mail, UserRound, Clock, CheckCircle2, CircleDot, MessageSquare, Loader2 } from 'lucide-react';

interface OfferSideDrawerProps {
  offer: OfferResponse | null;
  negotiations: NegotiationResponse[];
  negotiationsLoading: boolean;
  open: boolean;
  onClose: () => void;
  onSend: (id: number) => void;
  onWithdraw: (id: number) => void;
  onResendEmail: (id: number) => void;
  onDuplicateAsDraft: (offer: OfferResponse) => void;
  onAcceptNegotiation: (offerId: number, negotiationId: number) => void;
  onDeclineNegotiation: (offerId: number, negotiationId: number) => void;
  isMutating: boolean;
}

export function OfferSideDrawer({
  offer,
  negotiations,
  negotiationsLoading,
  open,
  onClose,
  onSend,
  onWithdraw,
  onResendEmail,
  onDuplicateAsDraft,
  onAcceptNegotiation,
  onDeclineNegotiation,
  isMutating
}: OfferSideDrawerProps) {
  if (!open || !offer) return null;

  const totalComp = offer.base_salary + (offer.signing_bonus || 0) + (offer.stock_options || 0);
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: offer.currency, maximumFractionDigits: 0 }).format(amount);

  const isActive = ['draft', 'sent', 'viewed'].includes(offer.status);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      case 'sent': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'viewed': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'declined': return 'bg-red-50 text-red-700 border-red-200';
      case 'expired': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'withdrawn': return 'bg-zinc-100 text-zinc-500 border-zinc-200';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200';
    }
  };

  // Timeline events
  const timelineEvents: { label: string; date: string | null; icon: React.ReactNode; color: string }[] = [
    { label: 'Created', date: offer.created_at, icon: <FileText className="w-3.5 h-3.5" />, color: 'text-zinc-500' },
    { label: 'Sent', date: offer.sent_at, icon: <Send className="w-3.5 h-3.5" />, color: 'text-blue-500' },
    { label: 'Viewed', date: offer.viewed_at, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-indigo-500' },
    { label: 'Responded', date: offer.responded_at, icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'text-emerald-500' },
  ];

  return (
    <>
      <div className={`absolute inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`absolute top-0 right-0 h-full w-full sm:w-[520px] bg-white dark:bg-zinc-950 shadow-2xl z-50 border-l border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-[100%]'}`}>

        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div>
            <Badge variant="outline" className={`mb-2 capitalize border ${getStatusColor(offer.status)}`}>
              {offer.status}
            </Badge>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <UserRound className="w-5 h-5 text-zinc-400" />
              {offer.candidate_name || `Candidate #${offer.candidate_id}`}
            </h2>
            <p className="text-zinc-500 font-medium flex items-center gap-1.5 mt-1">
              <Briefcase className="w-4 h-4" /> {offer.position_title}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">

            {/* ── Package Breakdown ── */}
            <section>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">Compensation Package</h3>
              <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-900/50 dark:to-zinc-800/30 rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-800">
                <div className="text-center mb-4">
                  <p className="text-[10px] uppercase text-zinc-500 font-bold">Total Compensation</p>
                  <p className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">{formatCurrency(totalComp)}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{offer.currency} · {offer.employment_type?.replace('_', ' ')}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white dark:bg-zinc-950 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] uppercase text-zinc-500 font-bold">Base</p>
                    <p className="font-bold text-sm">{formatCurrency(offer.base_salary)}</p>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] uppercase text-zinc-500 font-bold">Signing</p>
                    <p className="font-bold text-sm">{formatCurrency(offer.signing_bonus || 0)}</p>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] uppercase text-zinc-500 font-bold">Equity</p>
                    <p className="font-bold text-sm">{formatCurrency(offer.stock_options || 0)}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Details ── */}
            <section>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Start Date</p>
                    <p className="font-medium">{new Date(offer.start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                  </div>
                </div>
                {offer.expires_at && (
                  <div className="flex items-start gap-2 text-sm">
                    <Clock className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Expires</p>
                      <p className="font-medium">{new Date(offer.expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                    </div>
                  </div>
                )}
                {offer.location && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Location</p>
                      <p className="font-medium">{offer.location}</p>
                    </div>
                  </div>
                )}
              </div>
              {offer.benefits_summary && (
                <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-100 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-400">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1"><Award className="w-3 h-3" /> Benefits</p>
                  <p className="whitespace-pre-wrap">{offer.benefits_summary}</p>
                </div>
              )}
            </section>

            {/* ── Timeline ── */}
            <section>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">Timeline</h3>
              <div className="space-y-0">
                {timelineEvents.map((evt, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    {i < timelineEvents.length - 1 && (
                      <div className="absolute left-[9px] top-6 w-px h-full bg-zinc-200 dark:bg-zinc-800" />
                    )}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 ${evt.date ? 'bg-white dark:bg-zinc-900 border-2 border-blue-400' : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'}`}>
                      {evt.date ? <CircleDot className="w-3 h-3 text-blue-500" /> : <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />}
                    </div>
                    <div className="pb-5">
                      <p className={`text-sm font-medium ${evt.date ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>{evt.label}</p>
                      <p className="text-xs text-zinc-500">
                        {evt.date ? new Date(evt.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Negotiation History ── */}
            <section>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                Negotiation History {negotiations.length > 0 && <span className="text-zinc-400 ml-1">({negotiations.length} round{negotiations.length !== 1 ? 's' : ''})</span>}
              </h3>
              {negotiationsLoading ? (
                <div className="flex items-center justify-center py-8 text-zinc-400 gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : negotiations.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">No negotiations yet.</p>
              ) : (
                <div className="space-y-3">
                  {negotiations.map((neg) => {
                    const delta = neg.proposed_salary ? neg.proposed_salary - offer.base_salary : 0;
                    const isUp = delta > 0;
                    return (
                      <div key={neg.id} className={`p-4 rounded-lg border text-sm ${neg.status === 'pending' ? 'border-violet-200 bg-violet-50/30 dark:border-violet-500/20 dark:bg-violet-900/10' : 'border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize text-[10px]">{neg.initiated_by}</Badge>
                            <span className="text-zinc-500 text-xs">Round {neg.round_number}</span>
                          </div>
                          <Badge variant={neg.status === 'pending' ? 'default' : 'secondary'} className="capitalize text-[10px]">{neg.status}</Badge>
                        </div>
                        {neg.proposed_salary && (
                          <p className="font-bold flex items-center gap-1 mb-1">
                            {isUp ? <ArrowUpRight className="w-4 h-4 text-red-500" /> : <ArrowDownRight className="w-4 h-4 text-emerald-500" />}
                            {formatCurrency(neg.proposed_salary)}
                            <span className={`text-xs ml-1 ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>
                              ({delta >= 0 ? '+' : ''}{formatCurrency(delta)})
                            </span>
                          </p>
                        )}
                        {neg.reasoning && <p className="italic text-zinc-500 text-xs mt-1">&ldquo;{neg.reasoning}&rdquo;</p>}

                        {neg.status === 'pending' && neg.initiated_by === 'candidate' && (
                          <div className="flex gap-2 mt-3 pt-2 border-t border-violet-100 dark:border-violet-500/10">
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 h-7 text-xs" disabled={isMutating} onClick={() => onDeclineNegotiation(offer.id, neg.id)}>
                              Decline
                            </Button>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs" disabled={isMutating} onClick={() => onAcceptNegotiation(offer.id, neg.id)}>
                              Accept Terms
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
          {offer.status === 'draft' ? (
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isMutating} onClick={() => onSend(offer.id)}>
                <Send className="w-4 h-4 mr-1.5" /> Send Offer
              </Button>
            </div>
          ) : isActive ? (
            <div className="flex justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-red-600 border-red-200" disabled={isMutating} onClick={() => onWithdraw(offer.id)}>
                  <XCircle className="w-4 h-4 mr-1.5" /> Withdraw
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={isMutating} onClick={() => onResendEmail(offer.id)}>
                  <Mail className="w-4 h-4 mr-1.5" /> Resend Email
                </Button>
                <Button variant="outline" size="sm" disabled={isMutating} onClick={() => onDuplicateAsDraft(offer)}>
                  <Copy className="w-4 h-4 mr-1.5" /> Duplicate as Draft
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => onDuplicateAsDraft(offer)}>
                <Copy className="w-4 h-4 mr-1.5" /> Duplicate as Draft
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
            </div>
          )}
        </div>

      </div>
    </>
  );
}

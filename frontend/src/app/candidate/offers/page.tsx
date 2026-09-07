'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Handshake, DollarSign, CalendarDays, Building2, Clock, 
  CheckCircle2, XCircle, FileText
} from 'lucide-react';
import type { OfferResponse } from '@/types/api';

export default function CandidateOffersPage() {
  const { data: offers, isLoading } = useQuery<OfferResponse[]>({
    queryKey: ['my-offers'],
    queryFn: () => clientApi.get('/offers').then((data: any) => data || [])
  });

  const statusStyle = (status: string) => {
    switch(status) {
      case 'sent': case 'viewed': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400';
      case 'accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'declined': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400';
      case 'expired': return 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400';
      default: return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="animate-pulse text-zinc-400 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading offers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-12 px-4 md:px-6 w-full">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">My Offers</h1>
        <p className="text-zinc-500 text-sm">Review and respond to your job offers.</p>
      </div>

      {!offers || offers.length === 0 ? (
        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-12 text-center text-zinc-400">
            <Handshake className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <p className="text-sm font-medium">No offers received yet.</p>
            <p className="text-xs mt-1">Once a recruiter extends an offer, it will appear here for your review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <Card key={offer.id} className="bg-white dark:bg-zinc-900 hover:shadow-md transition-shadow">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Offer Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-bold truncate">{offer.position_title}</h3>
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] md:text-xs font-semibold rounded-full border capitalize mt-0.5 ${statusStyle(offer.status)}`}>
                          {offer.status}
                        </span>
                      </div>
                    </div>

                    {/* Compensation Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-[10px] uppercase text-zinc-400 font-bold mb-0.5">Base Salary</p>
                        <p className="text-sm md:text-base font-black flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          {offer.base_salary?.toLocaleString() || '—'}
                        </p>
                        <p className="text-[10px] text-zinc-400">{offer.currency || 'USD'}/yr</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-[10px] uppercase text-zinc-400 font-bold mb-0.5">Sign-On Bonus</p>
                        <p className="text-sm md:text-base font-black">
                          ${offer.signing_bonus?.toLocaleString() || '0'}
                        </p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-[10px] uppercase text-zinc-400 font-bold mb-0.5">Start Date</p>
                        <p className="text-sm font-bold flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                          {offer.start_date ? new Date(offer.start_date).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-[10px] uppercase text-zinc-400 font-bold mb-0.5">Expires</p>
                        <p className="text-sm font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {offer.expires_at ? new Date(offer.expires_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Benefits */}
                    {offer.benefits_summary && (
                      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500">{offer.benefits_summary}</p>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions (for pending offers) */}
                  {(offer.status === 'sent' || offer.status === 'viewed') && (
                    <div className="flex md:flex-col gap-2 shrink-0">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 md:flex-none">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 flex-1 md:flex-none">
                        <XCircle className="w-4 h-4 mr-1" /> Decline
                      </Button>
                    </div>
                  )}
                </div>

                {offer.custom_message && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Message from Recruiter:</p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed whitespace-pre-wrap">{offer.custom_message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

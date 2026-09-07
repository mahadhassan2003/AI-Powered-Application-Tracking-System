'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, FileSignature, Inbox, History, Package, BrainCircuit, DollarSign, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

import type { OfferResponse, NegotiationResponse, OfferAnalytics, ApplicationResponse } from '@/types/api';
import type { OfferCreate } from '@/types/payloads';
import { OfferTableView } from '@/components/recruiter/offers/OfferTableView';
import { NegotiationInboxView, OfferWithNegotiations } from '@/components/recruiter/offers/NegotiationInboxView';
import { OfferDraftView } from '@/components/recruiter/offers/OfferDraftView';
import { OfferSideDrawer } from '@/components/recruiter/offers/OfferSideDrawer';
import { OfferInsightsBar } from '@/components/recruiter/offers/OfferInsightsBar';

// ── Isolated negotiation query helper (swappable for bulk endpoint later) ──
async function fetchNegotiationsForOffers(offerIds: number[]): Promise<Map<number, NegotiationResponse[]>> {
  const map = new Map<number, NegotiationResponse[]>();
  if (offerIds.length === 0) return map;
  const results = await Promise.allSettled(
    offerIds.map(async (id) => {
      const negs = await clientApi.get(`/offers/${id}/negotiations`) as unknown as NegotiationResponse[];
      return { id, negs };
    })
  );
  for (const result of results) {
    if (result.status === 'fulfilled') {
      map.set(result.value.id, result.value.negs);
    }
  }
  return map;
}

function OfferOperationsConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const currentTab = searchParams.get('tab') || 'active';

  // Local State
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [drawerOffer, setDrawerOffer] = useState<OfferResponse | null>(null);
  const [sortKey, setSortKey] = useState('expires_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isDrafting, setIsDrafting] = useState(false);

  // Form State (preserved from original page)
  const [appId, setAppId] = useState('');
  const [title, setTitle] = useState('');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [signingBonus, setSigningBonus] = useState('');
  const [stockOptions, setStockOptions] = useState('');
  const [benefits, setBenefits] = useState('');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [expiryDays, setExpiryDays] = useState('7');
  const [customMsg, setCustomMsg] = useState('');
  const [marketAnalysis, setMarketAnalysis] = useState<null | { status: string; message: string }>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Data Queries ──
  const { data: offers, isLoading, error } = useQuery<OfferResponse[]>({
    queryKey: ['recruiter-offers'],
    queryFn: () => clientApi.get('/offers'),
    refetchInterval: 30000,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<OfferAnalytics>({
    queryKey: ['offer-analytics'],
    queryFn: () => clientApi.get('/offers/analytics/summary'),
    refetchInterval: 60000,
  });

  const { data: allApplications } = useQuery<ApplicationResponse[]>({
    queryKey: ['recruiter-all-apps'],
    queryFn: () => clientApi.get('/applications/recruiter/all-applications'),
  });

  const eligibleCandidates = (allApplications || []).filter(
    (app) => typeof app.status === 'string' && app.status.toLowerCase() === 'offer'
  );

  const allOffers = offers || [];

  // ── Derived Arrays ──
  const activeOffers = useMemo(() => allOffers.filter((o) => ['sent', 'viewed'].includes(o.status)), [allOffers]);
  const draftOffers = useMemo(() => allOffers.filter((o) => o.status === 'draft'), [allOffers]);
  const historyOffers = useMemo(() => allOffers.filter((o) => ['accepted', 'declined', 'expired', 'withdrawn'].includes(o.status)), [allOffers]);

  // Offers that could have negotiations (sent or viewed)
  const negotiableOfferIds = useMemo(() => activeOffers.map((o) => o.id), [activeOffers]);

  // ── Negotiation query (isolated helper) ──
  const { data: negotiationMap, isLoading: negsLoading } = useQuery({
    queryKey: ['offer-negotiations', negotiableOfferIds],
    queryFn: () => fetchNegotiationsForOffers(negotiableOfferIds),
    enabled: negotiableOfferIds.length > 0,
    refetchInterval: 30000,
  });

  // Build negotiation inbox items
  const negotiationItems: OfferWithNegotiations[] = useMemo(() => {
    return activeOffers.map((offer) => ({
      offer,
      negotiations: negotiationMap?.get(offer.id) || [],
      isLoading: negsLoading,
    })).filter(item => item.isLoading || item.negotiations.some(n => n.status === 'pending'));
  }, [activeOffers, negotiationMap, negsLoading]);

  // Drawer negotiations
  const drawerNegotiations = drawerOffer ? (negotiationMap?.get(drawerOffer.id) || []) : [];

  // Stats for insights bar
  const expiringThisWeek = useMemo(() => {
    const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return activeOffers.filter((o) => o.expires_at && new Date(o.expires_at).getTime() <= weekFromNow).length;
  }, [activeOffers]);

  const pendingNegotiationCount = useMemo(() => {
    let count = 0;
    negotiationMap?.forEach((negs) => {
      count += negs.filter((n) => n.status === 'pending' && n.initiated_by === 'candidate').length;
    });
    return count;
  }, [negotiationMap]);

  // ── Tab dataset ──
  let activeDataset = activeOffers;
  if (currentTab === 'history') activeDataset = historyOffers;

  // ── Optimistic helper ──
  const optimisticStatusUpdate = (offerId: number, newStatus: string) => {
    queryClient.setQueryData<OfferResponse[]>(['recruiter-offers'], (old) => {
      if (!old) return old;
      return old.map((o) => (o.id === offerId ? { ...o, status: newStatus } : o));
    });
  };

  // ── Mutations ──
  const createOffer = useMutation({
    mutationFn: (data: OfferCreate) => clientApi.post('/offers/create', data),
    onSuccess: () => {
      toast.success('Offer drafted successfully!');
      queryClient.invalidateQueries({ queryKey: ['recruiter-offers'] });
      setIsDrafting(false);
      resetDraftForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to draft offer'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => clientApi.post(`/offers/${id}/send`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['recruiter-offers'] });
      const previous = queryClient.getQueryData<OfferResponse[]>(['recruiter-offers']);
      optimisticStatusUpdate(id, 'sent');
      setDrawerOffer(null);
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['recruiter-offers'], context.previous);
      toast.error('Failed to send offer');
    },
    onSuccess: () => toast.success('Offer dispatched to candidate!'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['recruiter-offers'] }),
  });

  const withdrawMutation = useMutation({
    mutationFn: (id: number) => clientApi.post(`/offers/${id}/withdraw`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['recruiter-offers'] });
      const previous = queryClient.getQueryData<OfferResponse[]>(['recruiter-offers']);
      optimisticStatusUpdate(id, 'withdrawn');
      setDrawerOffer(null);
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['recruiter-offers'], context.previous);
      toast.error('Failed to withdraw offer');
    },
    onSuccess: () => toast.success('Offer withdrawn'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['recruiter-offers'] }),
  });

  const acceptNegMutation = useMutation({
    mutationFn: ({ offerId, negId }: { offerId: number; negId: number }) =>
      clientApi.post(`/offers/${offerId}/negotiations/${negId}/accept`),
    onSuccess: () => {
      toast.success('Negotiation terms accepted — offer moved to Draft for re-sending');
      queryClient.invalidateQueries({ queryKey: ['recruiter-offers'] });
      queryClient.invalidateQueries({ queryKey: ['offer-negotiations'] });
      setDrawerOffer(null);
    },
    onError: () => toast.error('Failed to accept negotiation'),
  });

  const declineNegMutation = useMutation({
    mutationFn: ({ offerId, negId }: { offerId: number; negId: number }) =>
      clientApi.post(`/offers/${offerId}/negotiations/${negId}/decline`),
    onSuccess: () => {
      toast.success('Negotiation declined');
      queryClient.invalidateQueries({ queryKey: ['offer-negotiations'] });
      setDrawerOffer(null);
    },
    onError: () => toast.error('Failed to decline negotiation'),
  });

  // ── Helpers ──
  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
    setFocusedIndex(-1);
    setDrawerOffer(null);
  };

  const handleSortChange = (key: string) => {
    if (sortKey === key) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('asc'); }
  };

  const handleCandidateSelect = (selectedAppId: string | null) => {
    if (!selectedAppId) return;
    setAppId(selectedAppId);
    const selectedApp = eligibleCandidates.find((app) => app.id.toString() === selectedAppId);
    if (selectedApp) setTitle(selectedApp.job_title);
  };

  const resetDraftForm = () => {
    setAppId(''); setTitle(''); setSalary(''); setCurrency('USD');
    setLocation(''); setStartDate(''); setSigningBonus(''); setStockOptions('');
    setBenefits(''); setEmploymentType('full_time'); setExpiryDays('7');
    setCustomMsg(''); setMarketAnalysis(null);
  };

  const handleDuplicateAsDraft = (offer: OfferResponse) => {
    toast.info('Duplicating offer as new draft… Edit and send when ready.');
    setTitle(offer.position_title);
    setSalary(offer.base_salary.toString());
    setCurrency(offer.currency);
    setLocation(offer.location || '');
    setSigningBonus(offer.signing_bonus ? offer.signing_bonus.toString() : '');
    setStockOptions(offer.stock_options ? offer.stock_options.toString() : '');
    setBenefits(offer.benefits_summary || '');
    setEmploymentType(offer.employment_type || 'full_time');
    setCustomMsg(offer.custom_message || '');
    setIsDrafting(true);
    setDrawerOffer(null);
  };

  const handleResendEmail = (id: number) => {
    // Resend re-triggers the send email flow
    sendMutation.mutate(id);
  };

  // AI Features (preserved from original page)
  const handleAssessSalary = async () => {
    if (!title || !salary || !location) { toast.error('Need Title, Salary, and Location'); return; }
    setIsAnalyzing(true);
    try {
      const res: any = await clientApi.post('/offers/ai/assess', { position_title: title, base_salary: parseFloat(salary), currency, location });
      setMarketAnalysis(res);
      toast.success('AI completed market analysis');
    } catch { toast.error('Failed to analyze salary'); }
    setIsAnalyzing(false);
  };

  const handleGenerateDraft = async () => {
    if (!title || !salary) { toast.error('Need Title and Salary to generate draft'); return; }
    setIsGenerating(true);
    try {
      const candidate = eligibleCandidates.find((a) => a.id.toString() === appId);
      const res: any = await clientApi.post('/offers/ai/generate', {
        candidate_name: candidate?.candidate_name || 'Candidate',
        position_title: title,
        base_salary: parseFloat(salary),
        currency,
        signing_bonus: signingBonus ? parseFloat(signingBonus) : 0,
        stock_options: stockOptions ? parseFloat(stockOptions) : 0,
        benefits_summary: benefits || 'Standard benefits package',
        employment_type: employmentType,
        start_date: startDate ? startDate : 'a future date to be determined',
        expires_in_days: parseInt(expiryDays) || 7,
      });
      setCustomMsg(res.draft);
      toast.success('Draft generated by AI');
    } catch { toast.error('Failed to generate draft'); }
    setIsGenerating(false);
  };

  const submitDraft = () => {
    if (!appId || !title || !salary || !startDate) return toast.error('Fill required fields');
    createOffer.mutate({
      application_id: parseInt(appId),
      position_title: title,
      base_salary: parseFloat(salary),
      currency,
      employment_type: employmentType,
      location,
      signing_bonus: signingBonus ? parseFloat(signingBonus) : 0,
      stock_options: stockOptions ? parseFloat(stockOptions) : 0,
      benefits_summary: benefits || undefined,
      start_date: new Date(startDate).toISOString(),
      custom_message: customMsg || undefined,
      expires_in_days: parseInt(expiryDays) || 7,
    });
  };

  const isMutating = sendMutation.isPending || withdrawMutation.isPending || acceptNegMutation.isPending || declineNegMutation.isPending;

  // ── Loading / Error ──
  if (isLoading) return <div className="p-24 text-center text-zinc-500 animate-pulse font-medium text-lg flex items-center justify-center gap-2"><BrainCircuit className="w-6 h-6" /> Powering up Offer Console...</div>;
  if (error) return <div className="p-24 text-center text-red-500 font-medium">Failed to load offers.</div>;

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col pt-8 bg-zinc-50/50 dark:bg-zinc-950 relative">
      {/* Header */}
      <div className="px-8 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-transparent flex items-end justify-between shrink-0">
        <div>
          <Badge variant="outline" className="mb-2 uppercase text-[10px] tracking-wider font-bold bg-white dark:bg-zinc-900 border-zinc-200/50 shadow-sm">
            Operations Console
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Offers</h1>
          <p className="text-zinc-500 mt-1.5 font-medium">Package management, negotiations, and risk monitoring.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
          <button onClick={() => handleTabChange('active')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${currentTab === 'active' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            <Package className="w-4 h-4" /> Active
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{activeOffers.length}</Badge>
          </button>
          <button onClick={() => handleTabChange('negotiations')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${currentTab === 'negotiations' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-violet-600/70 hover:text-violet-700 dark:text-violet-500/70 dark:hover:text-violet-500'}`}>
            <Inbox className="w-4 h-4" /> Negotiations
            {pendingNegotiationCount > 0 && <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-pulse" />}
          </button>
          <button onClick={() => handleTabChange('drafts')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${currentTab === 'drafts' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            <FileSignature className="w-4 h-4" /> Drafts
            {draftOffers.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{draftOffers.length}</Badge>}
          </button>
          <button onClick={() => handleTabChange('history')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${currentTab === 'history' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            <History className="w-4 h-4" /> History
          </button>
        </div>
      </div>

      {/* Insights Bar */}
      <OfferInsightsBar analytics={analytics || null} isLoading={analyticsLoading} pendingNegotiations={pendingNegotiationCount} expiringThisWeek={expiringThisWeek} />

      {/* Main Content */}
      {currentTab === 'negotiations' ? (
        <div className="flex-1 overflow-auto">
          <NegotiationInboxView
            items={negotiationItems}
            onAcceptNegotiation={(offerId, negId) => acceptNegMutation.mutate({ offerId, negId })}
            onDeclineNegotiation={(offerId, negId) => declineNegMutation.mutate({ offerId, negId })}
            onOpen={setDrawerOffer}
            isMutating={isMutating}
          />
        </div>
      ) : currentTab === 'drafts' ? (
        <div className="flex-1 overflow-auto">
          <OfferDraftView
            drafts={draftOffers}
            onOpen={setDrawerOffer}
            onSend={(id) => sendMutation.mutate(id)}
            onDuplicate={handleDuplicateAsDraft}
            onCreateNew={() => { resetDraftForm(); setIsDrafting(true); }}
            isMutating={isMutating}
          />
        </div>
      ) : (
        <OfferTableView
          offers={activeDataset}
          focusedIndex={focusedIndex}
          onFocusChange={setFocusedIndex}
          onOpen={setDrawerOffer}
          onSend={(id) => sendMutation.mutate(id)}
          onWithdraw={(id) => withdrawMutation.mutate(id)}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          isMutating={isMutating}
        />
      )}

      {/* Side Drawer */}
      <OfferSideDrawer
        offer={drawerOffer}
        negotiations={drawerNegotiations}
        negotiationsLoading={negsLoading}
        open={!!drawerOffer}
        onClose={() => setDrawerOffer(null)}
        onSend={(id) => sendMutation.mutate(id)}
        onWithdraw={(id) => withdrawMutation.mutate(id)}
        onResendEmail={handleResendEmail}
        onDuplicateAsDraft={handleDuplicateAsDraft}
        onAcceptNegotiation={(offerId, negId) => acceptNegMutation.mutate({ offerId, negId })}
        onDeclineNegotiation={(offerId, negId) => declineNegMutation.mutate({ offerId, negId })}
        isMutating={isMutating}
      />

      {/* ── Draft New Offer Dialog (AI Copilot — v2 upgraded) ── */}
      <Dialog open={isDrafting} onOpenChange={setIsDrafting}>
        <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center">
              <BrainCircuit className="w-6 h-6 mr-2 text-primary" /> Intelligent Offer Drafter
            </DialogTitle>
            <p className="text-sm text-zinc-500">Build a competitive compensation package with AI-assisted market analysis and letter generation.</p>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-6 py-4 flex-1 min-h-0 overflow-y-auto">
            {/* Left: Offer Fields (3 cols) */}
            <div className="col-span-3 space-y-5">
              {/* Candidate Selector */}
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Candidate <span className="text-red-500">*</span></Label>
                <Select value={appId} onValueChange={(val) => { if (val) handleCandidateSelect(val); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select candidate from offer pipeline...">
                      {appId && eligibleCandidates.find((a) => a.id.toString() === appId)
                        ? `${eligibleCandidates.find((a) => a.id.toString() === appId)!.candidate_name} — ${eligibleCandidates.find((a) => a.id.toString() === appId)!.job_title}`
                        : 'Select candidate from offer pipeline...'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleCandidates.length === 0 ? (
                      <SelectItem value="empty" disabled>No candidates in Offer stage</SelectItem>
                    ) : (
                      eligibleCandidates.map((app) => (
                        <SelectItem key={app.id} value={app.id.toString()}>{app.candidate_name} — {app.job_title}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Row: Title + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Job Title <span className="text-red-500">*</span></Label>
                  <Input placeholder="Senior AI Engineer" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Location</Label>
                  <Input placeholder="San Francisco, CA" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>

              {/* Compensation Section */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Compensation Package</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-[11px] text-zinc-500">Base Salary <span className="text-red-500">*</span></Label>
                    <div className="flex relative">
                      <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                      <Input type="number" className="pl-7 h-9 text-sm" placeholder="150,000" value={salary} onChange={(e) => setSalary(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[11px] text-zinc-500">Signing Bonus</Label>
                    <div className="flex relative">
                      <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                      <Input type="number" className="pl-7 h-9 text-sm" placeholder="10,000" value={signingBonus} onChange={(e) => setSigningBonus(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[11px] text-zinc-500">Stock / Equity</Label>
                    <div className="flex relative">
                      <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                      <Input type="number" className="pl-7 h-9 text-sm" placeholder="25,000" value={stockOptions} onChange={(e) => setStockOptions(e.target.value)} />
                    </div>
                  </div>
                </div>
                {/* Total Comp Preview */}
                {salary && (
                  <div className="text-right text-xs text-zinc-500 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                    Total Comp: <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
                        (parseFloat(salary) || 0) + (parseFloat(signingBonus) || 0) + (parseFloat(stockOptions) || 0)
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Row: Employment, Currency, Start, Expiry */}
              <div className="grid grid-cols-4 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-[11px] text-zinc-500">Type</Label>
                  <Select value={employmentType} onValueChange={(v) => setEmploymentType(v ?? 'full_time')}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px] text-zinc-500">Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v ?? 'USD')}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="PKR">PKR (₨)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px] text-zinc-500">Start Date <span className="text-red-500">*</span></Label>
                  <Input type="date" className="h-9 text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px] text-zinc-500">Expires In</Label>
                  <Select value={expiryDays} onValueChange={(v) => setExpiryDays(v ?? '7')}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Benefits */}
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Benefits Summary</Label>
                <Textarea className="text-sm resize-none h-16" placeholder="e.g. Unlimited PTO, 401k matching, health + dental + vision, $2,000 annual learning budget…" value={benefits} onChange={(e) => setBenefits(e.target.value)} />
              </div>
            </div>

            {/* Right: AI Copilot (2 cols) */}
            <div className="col-span-2 flex flex-col bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <h3 className="font-semibold text-sm flex items-center text-zinc-700 dark:text-zinc-300 mb-3">
                <Sparkles className="w-4 h-4 mr-2" /> AI Market Copilot
              </h3>

              {/* Market Rate Check */}
              <div className="rounded-lg bg-white dark:bg-zinc-950 p-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex justify-between items-center mb-3">
                <div className="text-xs text-zinc-500">Market Rate Check</div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAssessSalary} disabled={isAnalyzing}>
                  {isAnalyzing ? 'Analyzing...' : 'Assess Salary'}
                </Button>
              </div>
              {marketAnalysis && (
                <div className={`p-3 rounded-lg text-xs flex items-start space-x-2 mb-3 ${marketAnalysis.status === 'below_market' ? 'bg-red-50 text-red-700 border border-red-100' : marketAnalysis.status === 'above_market' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><strong>{marketAnalysis.status.replace('_', ' ').toUpperCase()}:</strong> {marketAnalysis.message}</span>
                </div>
              )}

              {/* AI Draft Letter */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs">AI-Generated Offer Letter</Label>
                  <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={handleGenerateDraft} disabled={isGenerating}>
                    <BrainCircuit className="w-3 h-3 mr-1" /> {isGenerating ? 'Drafting...' : 'Auto-Draft'}
                  </Button>
                </div>
                <Textarea className="flex-1 text-xs resize-none min-h-[180px]" placeholder="Click Auto-Draft to generate a personalized offer letter using your package details above. You can edit it after generation." value={customMsg} onChange={(e) => setCustomMsg(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t pt-4 mt-2">
            <Button variant="ghost" onClick={() => setIsDrafting(false)}>Cancel</Button>
            <Button onClick={submitDraft} disabled={createOffer.isPending} className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200">
              {createOffer.isPending ? 'Saving...' : 'Save to Pipeline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return (
    <React.Suspense fallback={<div className="p-24 text-center text-zinc-500 animate-pulse">Loading Operations Console...</div>}>
      <OfferOperationsConsole />
    </React.Suspense>
  );
}

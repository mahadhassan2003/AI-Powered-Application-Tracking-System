'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientApi from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Settings, Send, History, Wand2, RefreshCcw, Save, Trash2, Calendar, FileText, Share, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { EmailTemplate, ApplicationResponse, EmailCampaignResponse } from '@/types/api';

export default function EmailOperationsConsole() {
  const queryClient = useQueryClient();
  
  // -- Queries --
  const { data: smtpStatus } = useQuery<{ configured: boolean; smtp_email: string; smtp_server: string; smtp_port: string }>({
    queryKey: ['smtp-status'],
    queryFn: () => clientApi.get('/emails/smtp-status'),
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['email-templates'],
    queryFn: () => clientApi.get('/emails/templates'),
  });

  const { data: applications = [], isLoading: appsLoading } = useQuery<ApplicationResponse[]>({
    queryKey: ['recruiter-all-applications'],
    queryFn: () => clientApi.get('/applications/recruiter/all-applications'),
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<EmailCampaignResponse[]>({
    queryKey: ['recruiter-campaigns'],
    queryFn: () => clientApi.get('/emails/campaigns'),
  });

  // -- Mutations --
  const saveTemplateMutation = useMutation({
    mutationFn: (data: { campaign_name: string; subject: string; body_content: string; category: string }) => 
      clientApi.post('/emails/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template saved successfully');
      setShowSaveDialog(false);
      setTemplateName('');
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => clientApi.delete(`/emails/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted');
    }
  });

  const dispatchCampaignMutation = useMutation({
    mutationFn: (data: { template_id: number; application_ids: number[]; campaign_name: string }) => 
      clientApi.post('/emails/campaigns/send', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-campaigns'] });
      toast.success('Campaign dispatched successfully!');
      setSendCampaignDrawerOpen(false);
      setSelectedApps(new Set());
    }
  });

  const updateSmtpMutation = useMutation({
    mutationFn: (data: any) => clientApi.post('/emails/smtp-update', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtp-status'] });
      toast.success('SMTP Configuration Saved');
      setShowSmtp(false);
    }
  });

  const testSmtpMutation = useMutation({
    mutationFn: (data: any) => clientApi.post('/emails/smtp-test', data),
    onSuccess: (data: any) => {
      // clientApi returns response.data directly due to interceptor
      if (data.status === 'success') {
        toast.success('SMTP Connection Successful!');
      } else {
        toast.error(`Connection Failed: ${data.message || 'Unknown error'}`);
      }
    },
    onError: (err: any) => {
      // Handle both backend-formatted errors and raw axios errors
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
      toast.error(`Connection Error: ${msg}`);
    }
  });

  const generateAiMutation = useMutation({
    mutationFn: (data: { topic: string; tone: string }) => clientApi.post('/emails/ai/generate', data),
    onSuccess: (data: any) => {
      setDraftSubject(data.subject);
      setDraftBody(data.body_content);
    }
  });

  // -- State --
  const [activeTab, setActiveTab] = useState('compose');
  const [showSmtp, setShowSmtp] = useState(false);
  const [smtpForm, setSmtpForm] = useState({ 
    smtp_email: '', 
    smtp_server: 'smtp.gmail.com', 
    smtp_port: '587', 
    smtp_password: '' 
  });

  // Compose State
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('outreach');

  // Audience State
  const [audienceSearch, setAudienceSearch] = useState('');
  const [selectedApps, setSelectedApps] = useState<Set<number>>(new Set());
  const [sendCampaignDrawerOpen, setSendCampaignDrawerOpen] = useState(false);
  const [selectedTemplateForCampaign, setSelectedTemplateForCampaign] = useState<string>('');
  const [customCampaignName, setCustomCampaignName] = useState('');

  // Smtp check effect
  useEffect(() => {
    if (smtpStatus) {
      setSmtpForm({
        smtp_email: smtpStatus.smtp_email || '',
        smtp_server: smtpStatus.smtp_server || 'smtp.gmail.com',
        smtp_port: smtpStatus.smtp_port || '587',
        smtp_password: smtpStatus.configured ? '****************' : '' // Use standard stars for ASCII compatibility
      });
    }
  }, [smtpStatus]);

  // Handlers
  const handleGenerate = () => {
    if (!topic) return;
    generateAiMutation.mutate({ topic, tone });
  };

  const handleSaveTemplate = () => {
    if (!templateName || !draftSubject || !draftBody) return;
    saveTemplateMutation.mutate({
      campaign_name: templateName,
      subject: draftSubject,
      body_content: draftBody,
      category: templateCategory,
    });
  };

  const loadTemplateToDraft = (t: EmailTemplate) => {
    setDraftSubject(t.subject);
    setDraftBody(t.body_content);
    setTemplateCategory(t.category || 'outreach');
    setActiveTab('compose');
  };

  const toggleSelectApp = (id: number) => {
    const newSet = new Set(selectedApps);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedApps(newSet);
  };

  const filteredApps = applications.filter(a => 
    !audienceSearch || 
    a.candidate_name?.toLowerCase().includes(audienceSearch.toLowerCase()) || 
    a.job_title?.toLowerCase().includes(audienceSearch.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedApps.size === filteredApps.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(filteredApps.map(a => a.id)));
    }
  };

  const handleDispatch = () => {
    if (!selectedTemplateForCampaign || selectedApps.size === 0) return;
    dispatchCampaignMutation.mutate({
      template_id: parseInt(selectedTemplateForCampaign),
      application_ids: Array.from(selectedApps),
      campaign_name: customCampaignName || `Campaign ${new Date().toISOString().split('T')[0]}`
    });
  };

  return (
    <div className="w-full px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Email Operations Console</h1>
          <p className="text-zinc-500 mt-2">Design AI templates and orchestrate bulk email sequences.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setShowSmtp(true)}>
            <Settings className="w-4 h-4" />
            <span className={smtpStatus?.configured ? "text-emerald-600" : "text-amber-600"}>
              {smtpStatus?.configured ? 'SMTP Active' : 'SMTP Missing'}
            </span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8 border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-zinc-950 dark:border-zinc-800">
        <div className="border-b dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2 py-2">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="compose" className="gap-2"><FileText className="w-4 h-4"/> Compose</TabsTrigger>
            <TabsTrigger value="audience" className="gap-2"><Users className="w-4 h-4"/> Audience</TabsTrigger>
            <TabsTrigger value="templates" className="gap-2"><Save className="w-4 h-4"/> Templates</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="w-4 h-4"/> History</TabsTrigger>
          </TabsList>
        </div>

        <div className="p-6">
          {/* COMPOSE TAB */}
          <TabsContent value="compose" className="m-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
               {/* AI Assistant */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Wand2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">AI Composer</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-700 dark:text-zinc-300">What's the goal?</Label>
                    <Textarea 
                      placeholder="e.g. Schedule a follow-up interview for the Engineering role, highlighting our new remote policy."
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      className="min-h-[100px] resize-none overflow-hidden" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-zinc-700 dark:text-zinc-300">Tone</Label>
                    <Select value={tone} onValueChange={(val) => setTone(val || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly & Warm</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="persuasive">Persuasive Pitch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md transition-all"
                    onClick={handleGenerate}
                    disabled={!topic || generateAiMutation.isPending}
                  >
                    {generateAiMutation.isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {generateAiMutation.isPending ? 'Generating...' : 'Generate Draft'}
                  </Button>

                  <div className="text-xs text-zinc-500 pt-2 border-t dark:border-zinc-800">
                    <p><strong>Supported Placeholders:</strong></p>
                    <p className="mt-1 font-mono">{`{{candidate_name}}`}</p>
                    <p className="font-mono">{`{{job_title}}`}</p>
                    <p className="font-mono">{`{{company_name}}`}</p>
                    <p className="font-mono">{`{{portal_link}}`}</p>
                  </div>
                </div>
              </div>

               {/* Draft Canvas */}
               <div className="flex flex-col h-full border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-zinc-950">
                <div className="flex px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 justify-between items-center">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Template Draft Canvas</span>
                  <Button size="sm" variant="outline" className="gap-2 h-8" onClick={() => setShowSaveDialog(true)} disabled={!draftSubject && !draftBody}>
                    <Save className="w-4 h-4"/> Save Template
                  </Button>
                </div>
                
                <div className="p-4 space-y-4 flex-1">
                  <div className="space-y-1.5">
                    <Label>Subject Line</Label>
                    <Input 
                      value={draftSubject}
                      onChange={e => setDraftSubject(e.target.value)}
                      placeholder="Email Subject"
                      className="font-medium text-lg border-zinc-300 dark:border-zinc-700 focus-visible:ring-blue-500 rounded-lg shadow-sm"
                    />
                  </div>
                  
                  <div className="space-y-1.5 h-full flex flex-col">
                    <Label>Template Body</Label>
                    <Textarea 
                      value={draftBody}
                      onChange={e => setDraftBody(e.target.value)}
                      placeholder="Write your email template here..."
                      className="flex-1 min-h-[300px] resize-y font-mono text-sm leading-relaxed border-zinc-300 dark:border-zinc-700 focus-visible:ring-blue-500 p-4 rounded-lg shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* AUDIENCE TAB */}
          <TabsContent value="audience" className="m-0 space-y-4">
            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border dark:border-zinc-800">
               <div>
                 <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                   <Users className="w-5 h-5 text-blue-600"/> Candidate Target Audience
                 </h2>
                 <p className="text-zinc-500 text-sm mt-1">Select candidates to fire off an outbound sequence.</p>
               </div>
               {selectedApps.size > 0 && (
                 <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2" onClick={() => setSendCampaignDrawerOpen(true)}>
                   <Send className="w-4 h-4"/> Next: Setup Sequence ({selectedApps.size} Selected)
                 </Button>
               )}
            </div>

            <div className="mb-4">
              <Input placeholder="Filter candidates by name or job..." value={audienceSearch} onChange={(e) => setAudienceSearch(e.target.value)} className="max-w-md"/>
            </div>

            <div className="border dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 border-b dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <Checkbox checked={filteredApps.length > 0 && selectedApps.size === filteredApps.length} onCheckedChange={toggleSelectAll} />
                      </th>
                      <th className="px-4 py-3 font-medium">Candidate</th>
                      <th className="px-4 py-3 font-medium">Job Applied</th>
                      <th className="px-4 py-3 font-medium">Stage</th>
                      <th className="px-4 py-3 font-medium">Match %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-zinc-800">
                    {filteredApps.map(app => (
                       <tr key={app.id} className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer ${selectedApps.has(app.id) ? 'bg-blue-50/80 dark:bg-blue-900/20' : ''}`} onClick={() => toggleSelectApp(app.id)}>
                         <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <Checkbox checked={selectedApps.has(app.id)} onCheckedChange={() => toggleSelectApp(app.id)} />
                         </td>
                         <td className="px-4 py-3">
                           <div className="font-medium text-zinc-900 dark:text-zinc-100">{app.candidate_name}</div>
                           <div className="text-zinc-500 text-xs">{app.candidate_email}</div>
                         </td>
                         <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{app.job_title}</td>
                         <td className="px-4 py-3">
                           <Badge variant="secondary" className="capitalize">{app.status}</Badge>
                         </td>
                         <td className="px-4 py-3 font-medium">{app.match_score || 0}%</td>
                       </tr>
                    ))}
                    {filteredApps.length === 0 && (
                      <tr><td colSpan={5} className="py-12 text-center text-zinc-500">No candidates match search</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="m-0">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {templates.map(t => (
                 <div key={t.id} className="group border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-zinc-950 flex flex-col h-full cursor-pointer" onClick={() => loadTemplateToDraft(t)}>
                   <div className="p-5 flex-1 relative">
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant="outline" className="capitalize text-xs text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">{t.category}</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4" onClick={(e) => { e.stopPropagation(); deleteTemplateMutation.mutate(t.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mb-2 truncate pr-6">{t.campaign_name}</h3>
                      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 truncate">Subj: {t.subject}</div>
                      <p className="text-sm text-zinc-500 line-clamp-3 mt-3">{t.body_content}</p>
                   </div>
                   <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center text-xs text-zinc-500">
                     <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> {new Date(t.created_at).toLocaleDateString()}</div>
                     <span className="group-hover:text-blue-600 transition-colors font-medium flex items-center gap-1">Load Template &rarr;</span>
                   </div>
                 </div>
               ))}
               {templates.length === 0 && (
                 <div className="col-span-full py-16 text-center border-2 border-dashed rounded-xl dark:border-zinc-800">
                   <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                   <p className="text-zinc-500">No templates saved yet.</p>
                 </div>
               )}
             </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="m-0">
             <div className="border dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 border-b dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">Campaign Name</th>
                      <th className="px-6 py-4 font-medium">Template Base</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium text-center">Audience Size</th>
                      <th className="px-6 py-4 font-medium text-emerald-600 text-center">Sent</th>
                      <th className="px-6 py-4 font-medium text-red-600 text-center">Failed</th>
                      <th className="px-6 py-4 font-medium">Date Dispatched</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-zinc-800">
                    {campaigns.map(c => (
                       <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                         <td className="px-6 py-4 font-semibold">{c.campaign_name}</td>
                         <td className="px-6 py-4 text-zinc-500">{c.template_name || 'N/A'}</td>
                         <td className="px-6 py-4">
                            <Badge variant={c.status === 'completed' ? 'default' : c.status === 'pending' ? 'outline' : 'secondary'} className="capitalize">{c.status}</Badge>
                         </td>
                         <td className="px-6 py-4 text-center font-medium bg-zinc-50/50 dark:bg-zinc-900/20">{c.audience_count}</td>
                         <td className="px-6 py-4 text-center text-emerald-600 font-bold bg-emerald-50/30 dark:bg-emerald-900/10">{c.sent_count}</td>
                         <td className="px-6 py-4 text-center text-red-600 font-bold bg-red-50/30 dark:bg-red-900/10">{c.failed_count}</td>
                         <td className="px-6 py-4 text-zinc-500"><div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5"/>{new Date(c.created_at).toLocaleString()}</div></td>
                       </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr><td colSpan={7} className="py-16 text-center text-zinc-500">No campaigns launched yet.</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* DIALOGS */}
      
      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
            <DialogDescription>Store this template in your gallery for future campaigns.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input placeholder="e.g. Senior Eng Outreach Sequence 1" value={templateName} onChange={e => setTemplateName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category Use-Case</Label>
              <Select value={templateCategory} onValueChange={(val) => setTemplateCategory(val || "")}>
                <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outreach">Cold Outreach</SelectItem>
                  <SelectItem value="reminder">Interview Reminder</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="rejection">Rejection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
              {saveTemplateMutation.isPending ? 'Saving...' : 'Save to Gallery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Configure SMTP Dialog */}
      <Dialog open={showSmtp} onOpenChange={setShowSmtp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Custom SMTP</DialogTitle>
            <DialogDescription>Set up outbound delivery parameters so campaigns fire from your domain.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1"><Label>SMTP Server</Label><Input value={smtpForm.smtp_server} onChange={e => setSmtpForm({...smtpForm, smtp_server: e.target.value})} placeholder="smtp.gmail.com" /></div>
            <div className="space-y-1"><Label>SMTP Port</Label><Input value={smtpForm.smtp_port} onChange={e => setSmtpForm({...smtpForm, smtp_port: e.target.value})} placeholder="587" /></div>
            <div className="space-y-1"><Label>SMTP Email</Label><Input value={smtpForm.smtp_email} onChange={e => setSmtpForm({...smtpForm, smtp_email: e.target.value})} placeholder="recruiter@company.com" /></div>
            <div className="space-y-1"><Label>App Password</Label><Input type="password" value={smtpForm.smtp_password} onChange={e => setSmtpForm({...smtpForm, smtp_password: e.target.value})} placeholder="xxxx xxxx xxxx xxxx" /></div>
          </div>
          <DialogFooter className="flex justify-between items-center w-full">
            <Button 
              variant="outline" 
              className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={() => testSmtpMutation.mutate(smtpForm)}
              disabled={testSmtpMutation.isPending || !smtpForm.smtp_email}
            >
              {testSmtpMutation.isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              Test Connection
            </Button>
            <Button 
              onClick={() => updateSmtpMutation.mutate(smtpForm)} 
              disabled={updateSmtpMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateSmtpMutation.isPending ? 'Saving...' : 'Save Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Campaign Modal (Slide in drawer fake) */}
      <Dialog open={sendCampaignDrawerOpen} onOpenChange={setSendCampaignDrawerOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
             <DialogTitle>Finalize Outbound Sequence</DialogTitle>
             <DialogDescription>Dispatch an automation to <strong>{selectedApps.size}</strong> selected candidates safely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
             <div className="bg-blue-50 dark:bg-blue-950 p-4 border border-blue-100 dark:border-blue-900 rounded-lg flex items-center gap-4">
                <Share className="w-8 h-8 text-blue-500" />
                <div>
                   <h4 className="font-semibold text-blue-900 dark:text-blue-100">Audience Confirmed</h4>
                   <p className="text-sm text-blue-700 dark:text-blue-300">You selected {selectedApps.size} candidates to receive this campaign. Placeholders like {'{{candidate_name}}'} will be dynamically injected per email.</p>
                </div>
             </div>
             <div className="space-y-2">
                 <Label>Internal Campaign Name</Label>
                 <Input 
                   placeholder="e.g. Q4 Growth Followups" 
                   value={customCampaignName}
                   onChange={e => setCustomCampaignName(e.target.value)}
                 />
             </div>
             <div className="space-y-2">
                 <Label>Select Base Template</Label>
                 <Select value={selectedTemplateForCampaign} onValueChange={(val) => setSelectedTemplateForCampaign(val || "")}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Choose from gallery..." /></SelectTrigger>
                    <SelectContent>
                       {templates.map(t => (
                          <SelectItem key={t.id.toString()} value={t.id.toString()}>
                            <div className="flex justify-between w-full"><span>{t.campaign_name}</span> <span className="text-zinc-400 capitalize bg-zinc-100 px-1.5 rounded">{t.category}</span></div>
                          </SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendCampaignDrawerOpen(false)}>Back to list</Button>
            <Button onClick={handleDispatch} disabled={!selectedTemplateForCampaign || dispatchCampaignMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg">
               {dispatchCampaignMutation.isPending ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/> }
               {dispatchCampaignMutation.isPending ? 'Queuing Delivery...' : 'Launch Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}

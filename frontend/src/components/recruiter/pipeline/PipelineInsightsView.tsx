import React, { useMemo } from 'react';
import { ApplicationResponse } from '@/types/api';
import { StatCard } from '@/components/shared/StatCard';
import { Users, CheckCircle2, TrendingUp, Target, XCircle, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PIPELINE_STAGES } from './PipelineKanbanView';

interface PipelineInsightsViewProps {
  applications: ApplicationResponse[];
}

export function PipelineInsightsView({ applications }: PipelineInsightsViewProps) {
  const metrics = useMemo(() => {
    const total = applications.length;
    
    // Average Score
    const scoredApps = applications.filter(a => (a.match_score || 0) > 0);
    const avgScore = scoredApps.length > 0 
      ? Math.round(scoredApps.reduce((acc, a) => acc + (a.match_score || 0), 0) / scoredApps.length)
      : 0;

    // Conversion to Interview
    const interviewCount = applications.filter(a => a.status === 'interview' || a.status === 'offer' || a.status === 'hired').length;
    const interviewRate = total > 0 ? Math.round((interviewCount / total) * 100) : 0;

    // Offers & Hires
    const offers = applications.filter(a => a.status === 'offer' || a.status === 'hired').length;
    const hired = applications.filter(a => a.status === 'hired').length;
    const acceptRate = offers > 0 ? Math.round((hired / offers) * 100) : 0;

    const rejected = applications.filter(a => a.status === 'rejected').length;

    // Stage Distribution map
    const distribution = PIPELINE_STAGES.map(stage => ({
      ...stage,
      count: applications.filter(a => a.status === stage.id).length
    }));

    return { total, avgScore, interviewRate, offers, acceptRate, rejected, distribution };
  }, [applications]);

  return (
    <div className="flex-1 overflow-auto p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div>
          <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Pipeline Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Candidates" 
              value={metrics.total.toString()}
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard 
              title="Avg Match Score" 
              value={`${metrics.avgScore}%`}
              icon={<Target className="w-4 h-4" />}
              trend={metrics.avgScore > 0 ? { value: metrics.avgScore, label: 'Average', isPositive: metrics.avgScore >= 70 } : undefined}
            />
            <StatCard 
              title="Interview Rate" 
              value={`${metrics.interviewRate}%`}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatCard 
              title="Offer Accept Rate" 
              value={metrics.offers > 0 ? `${metrics.acceptRate}%` : 'N/A'}
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-6">Stage Distribution</h3>
            <div className="space-y-4">
              {metrics.distribution.map(stage => {
                const percentage = metrics.total > 0 ? (stage.count / metrics.total) * 100 : 0;
                return (
                  <div key={stage.id} className="group">
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{stage.label}</span>
                      <span className="text-zinc-500 font-medium">{stage.count} ({Math.round(percentage)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${stage.color.split(' ')[0]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-100 dark:border-blue-900/40">
            <h3 className="font-semibold text-lg mb-4 text-blue-900 dark:text-blue-100">AI Recommendations</h3>
            <div className="space-y-3">
               <div className="bg-white/60 dark:bg-zinc-900/60 p-4 rounded-xl border border-blue-100/50 dark:border-blue-800/30">
                 <p className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                   <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                   {metrics.avgScore >= 75 
                     ? "This job has an exceptionally strong candidate pool. Consider compressing the interview timeline to secure top talent before competitors."
                     : "The candidate pool is relatively weak. You might want to review the job description or expand the search parameters."}
                 </p>
               </div>
               <div className="bg-white/60 dark:bg-zinc-900/60 p-4 rounded-xl border border-blue-100/50 dark:border-blue-800/30 text-sm text-indigo-800 dark:text-indigo-300">
                  <div className="font-semibold mb-1">Funnel Health</div>
                  {metrics.interviewRate < 10 && metrics.total > 20 
                    ? "Your screening conversion rate is low (<10%). Review pending candidates soon." 
                    : "The funnel flow looks healthy. Candidates are moving through stages consistently."}
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

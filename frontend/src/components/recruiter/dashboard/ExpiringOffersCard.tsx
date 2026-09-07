import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ExternalLink, AlertCircle } from 'lucide-react';
import type { OfferResponse } from '@/types/api';

interface Props {
  expiringSoon: OfferResponse[];    // expires within 7 days
  expiringCritical: OfferResponse[]; // expires within 2 days
  viewedNoResponse: OfferResponse[];
}

export function ExpiringOffersCard({ expiringSoon, expiringCritical, viewedNoResponse }: Props) {
  const hasContent = expiringSoon.length > 0 || viewedNoResponse.length > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-500" /> Expiring Offers
          </CardTitle>
          <CardDescription>{expiringSoon.length} offer{expiringSoon.length !== 1 ? 's' : ''} expiring within 7 days</CardDescription>
        </div>
        <Link href="/recruiter/offers">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">Open Console <ExternalLink className="w-3 h-3" /></Button>
        </Link>
      </CardHeader>
      <CardContent>
        {!hasContent ? (
          <p className="text-sm text-zinc-400 italic py-4 text-center">No offers expiring soon.</p>
        ) : (
          <div className="space-y-2.5">
            {/* Critical — 2 days or less */}
            {expiringCritical.length > 0 && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                <div className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Expiring in ≤2 days ({expiringCritical.length})
                </div>
                {expiringCritical.slice(0, 3).map(o => (
                  <div key={o.id} className="flex justify-between items-center py-1.5 text-sm">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{o.candidate_name}</span>
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">
                      {o.expires_at ? new Date(o.expires_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Viewed but no response */}
            {viewedNoResponse.length > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                  Viewed — No Response ({viewedNoResponse.length})
                </div>
                {viewedNoResponse.slice(0, 3).map(o => (
                  <div key={o.id} className="flex justify-between items-center py-1.5 text-sm">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{o.candidate_name}</span>
                    <Badge variant="outline" className="text-[10px]">{o.position_title}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Remaining expiring soon */}
            {expiringSoon.filter(o => {
              const criticalIds = new Set(expiringCritical.map(c => c.id));
              return !criticalIds.has(o.id);
            }).slice(0, 4).map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <div>
                  <div className="text-sm font-semibold">{o.candidate_name}</div>
                  <div className="text-xs text-zinc-500">{o.position_title}</div>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  Expires {o.expires_at ? new Date(o.expires_at).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

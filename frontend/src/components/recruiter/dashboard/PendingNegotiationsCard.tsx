import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HandshakeIcon, ExternalLink } from 'lucide-react';
import type { OfferResponse } from '@/types/api';

interface Props {
  pendingOffers: OfferResponse[];
}

export function PendingNegotiationsCard({ pendingOffers }: Props) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <HandshakeIcon className="w-4 h-4 text-rose-500" /> Pending Negotiations
          </CardTitle>
          <CardDescription>{pendingOffers.length} offer{pendingOffers.length !== 1 ? 's' : ''} awaiting response</CardDescription>
        </div>
        <Link href="/recruiter/offers">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">Open Console <ExternalLink className="w-3 h-3" /></Button>
        </Link>
      </CardHeader>
      <CardContent>
        {pendingOffers.length === 0 ? (
          <p className="text-sm text-zinc-400 italic py-4 text-center">No pending negotiations.</p>
        ) : (
          <div className="space-y-2.5">
            {pendingOffers.slice(0, 5).map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 text-xs font-bold">
                    {o.candidate_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{o.candidate_name}</div>
                    <div className="text-xs text-zinc-500">{o.position_title}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="capitalize text-[10px]">{o.status?.replace('_', ' ')}</Badge>
                  <div className="text-xs text-zinc-400 mt-0.5">{o.currency} {o.base_salary?.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

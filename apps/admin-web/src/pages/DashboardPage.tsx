/**
 * Operational dashboard.
 *
 * Rule PRIV-06: aggregates only. The API deliberately does not return personal
 * data here, and this page does not try to reconstruct any.
 */
import { useEffect, useState } from 'react';
import type { AdminDashboardView } from '@rescrap/shared';
import { session } from '../lib/session';
import { formatMoney, lotStateLabel } from '../lib/format';
import { Card, DemoBoundary, DemoTag, Empty, ErrorNotice, Loading, Stat } from '../components/ui';

export function DashboardPage() {
  const [data, setData] = useState<AdminDashboardView | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let live = true;
    session.client
      .dashboard()
      .then((envelope) => {
        if (live) {
          setData(envelope.data);
        }
      })
      .catch((err: unknown) => {
        if (live) {
          setError(err);
        }
      });
    return () => {
      live = false;
    };
  }, []);

  if (error) {
    return <ErrorNotice error={error} />;
  }
  if (!data) {
    return <Loading label="Loading operations overview..." />;
  }

  const states = Object.entries(data.lotsByState).filter(([, count]) => count > 0);

  return (
    <DemoBoundary isDemo={data.demo}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total lots" value={String(data.totalLots)} hint="Across every lifecycle state" />
          <Stat
            label="Verification queue"
            value={String(data.verificationQueueDepth)}
            hint="Recyclers awaiting a decision"
            tone={data.verificationQueueDepth > 0 ? 'text-amber-700' : 'text-stone-900'}
          />
          <Stat
            label="Open disputes"
            value={String(data.openDisputes)}
            tone={data.openDisputes > 0 ? 'text-rose-700' : 'text-stone-900'}
            hint="Needs operator attention"
          />
          <Stat
            label="Exceptions"
            value={String(data.exceptions)}
            tone={data.exceptions > 0 ? 'text-amber-700' : 'text-stone-900'}
            hint="Anomaly flags raised"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Confirmed payments"
            value={formatMoney(data.confirmedPayments)}
            hint="Simulated. No money moves."
          />
        </div>

        <Card
          title="Lots by lifecycle state"
          subtitle="One Lot object, counted at each state. Nothing here is duplicated per role."
          action={<DemoTag label="AGGREGATE ONLY" />}
        >
          {states.length === 0 ? (
            <Empty>No lots have been created yet.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {states.map(([state, count]) => {
                const share = data.totalLots === 0 ? 0 : (count / data.totalLots) * 100;
                return (
                  <li key={state} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 text-sm text-stone-700">{lotStateLabel(state)}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                      <span
                        className="block h-full rounded-full bg-emerald-600"
                        style={{ width: `${Math.max(share, 1)}%` }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-stone-900">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </DemoBoundary>
  );
}

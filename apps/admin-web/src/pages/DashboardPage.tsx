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
      <div className="flex flex-col gap-5 text-[#F5EFE6]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
            Live Operational Ledger &bull; Central Control
          </span>
          <h2 className="text-2xl font-black text-white mt-0.5">Operational Overview</h2>
          <p className="text-xs text-stone-400 mt-1">
            Aggregated metrics across informal collectors, authorized recyclers &amp; logistics
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total lots" value={String(data.totalLots)} hint="Across every lifecycle state" />
          <Stat
            label="Verification queue"
            value={String(data.verificationQueueDepth)}
            hint="Recyclers awaiting decision"
            tone={data.verificationQueueDepth > 0 ? 'text-amber-400' : 'text-white'}
          />
          <Stat
            label="Open disputes"
            value={String(data.openDisputes)}
            tone={data.openDisputes > 0 ? 'text-rose-400' : 'text-white'}
            hint="Weight mismatch or mediation"
          />
          <Stat
            label="Exceptions"
            value={String(data.exceptions)}
            tone={data.exceptions > 0 ? 'text-amber-400' : 'text-white'}
            hint="Anomaly flags raised"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <Stat
            label="Confirmed payments"
            value={formatMoney(data.confirmedPayments)}
            hint="Simulated. Instant UPI to informal collectors."
            tone="text-[#4FD68C]"
          />
        </div>

        <Card
          title="Lots by lifecycle state"
          subtitle="One shared Lot object, counted at each state. Never duplicated per role."
          action={<DemoTag label="AGGREGATE ONLY" />}
        >
          {states.length === 0 ? (
            <Empty>No lots have been created yet.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {states.map(([state, count]) => {
                const share = data.totalLots === 0 ? 0 : (count / data.totalLots) * 100;
                return (
                  <li key={state} className="flex items-center gap-3">
                    <span className="w-48 shrink-0 text-xs font-mono font-medium text-stone-300">{lotStateLabel(state)}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#0C1A14] border border-[#1E3A2B]">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-[#1E8E53] to-[#2FBF71]"
                        style={{ width: `${Math.max(share, 1)}%` }}
                      />
                    </span>
                    <span className="w-12 shrink-0 text-right text-xs font-mono font-bold tabular-nums text-white">
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

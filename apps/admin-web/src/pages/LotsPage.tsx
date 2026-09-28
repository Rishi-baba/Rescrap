/**
 * Transaction monitoring.
 *
 * This is the single most load-bearing screen for the product thesis: it shows
 * that the Collector app, the Recycler app and the Admin console are three
 * projections of ONE lot, not three disconnected record sets (rule D-01).
 *
 * Rule TXN-01: one lot yields at most one transaction. The column exists so
 * an operator can see that invariant holding, not to find duplicates.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminLotView } from '@rescrap/shared';
import { session } from '../lib/session';
import { formatDateTime, formatMoney, formatWeight } from '../lib/format';
import {
  Badge,
  Card,
  DemoBoundary,
  DemoTag,
  Empty,
  ErrorNotice,
  Loading,
  LotStatePill,
  SeverityPill,
  Td,
  Table,
} from '../components/ui';

type Filter = 'all' | 'needs-attention' | 'in-flight' | 'settled';

const FILTERS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'needs-attention', label: 'Needs attention' },
  { id: 'in-flight', label: 'In flight' },
  { id: 'settled', label: 'Settled' },
];

const IN_FLIGHT = new Set([
  'SUBMITTED',
  'MATCHING',
  'OFFERED',
  'SOLD',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'RECEIVED',
]);

const SETTLED = new Set(['COMPLETED']);

export function LotsPage() {
  const [lots, setLots] = useState<AdminLotView[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const envelope = await session.client.adminLots();
      setLots(envelope.data);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!lots) {
      return [];
    }
    const needle = query.trim().toLowerCase();
    return lots.filter((lot) => {
      if (filter === 'needs-attention' && !(lot.requiresReview || lot.anomalyFlags.length > 0)) {
        return false;
      }
      if (filter === 'in-flight' && !IN_FLIGHT.has(lot.state)) {
        return false;
      }
      if (filter === 'settled' && !SETTLED.has(lot.state)) {
        return false;
      }
      if (needle.length > 0 && !lot.id.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
  }, [lots, filter, query]);

  if (error && !lots) {
    return <ErrorNotice error={error} />;
  }
  if (!lots) {
    return <Loading label="Loading transaction monitoring..." />;
  }

  const attention = lots.filter((lot) => lot.requiresReview || lot.anomalyFlags.length > 0).length;

  return (
    <DemoBoundary isDemo={lots.every((lot) => lot.demo)}>
      <div className="flex flex-col gap-4 text-[#F5EFE6]">
        {error ? <ErrorNotice error={error} /> : null}

        <Card
          title="Transaction monitoring"
          subtitle="One row per Lot. The Collector, Recycler and Admin views are projections of this same record."
          action={<DemoTag label="NO REAL MONEY" />}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border ${
                    filter === option.id
                      ? 'bg-[#1E8E53] text-[#07130D] border-[#2FBF71] font-bold shadow-md'
                      : 'border-[#1E3A2B] bg-[#0C1A14] text-stone-400 hover:text-white hover:bg-[#163324]'
                  }`}
                >
                  {option.label}
                  {option.id === 'needs-attention' && attention > 0 ? ` (${attention})` : ''}
                </button>
              ))}
            </div>
            <label className="text-xs text-stone-400">
              <span className="sr-only">Search by lot id</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search lot id..."
                className="w-48 rounded-xl border border-[#1E3A2B] bg-[#0C1A14] px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:border-[#2FBF71] focus:ring-1 focus:ring-[#2FBF71] focus:outline-none font-mono"
              />
            </label>
          </div>

          {visible.length === 0 ? (
            <Empty>No lots match this filter.</Empty>
          ) : (
            <Table
              head={[
                'Lot',
                'State',
                'Weight',
                'Estimate',
                'Offers',
                'Handover',
                'Payment',
                'Transaction',
                'Flags',
                'Updated',
              ]}
            >
              {visible.map((lot) => (
                <tr key={lot.id} className="hover:bg-[#163324]/40 transition-colors">
                  <Td>
                    <span className="font-mono text-xs font-bold text-white">{lot.id}</span>
                    <p className="mt-0.5 text-[11px] text-stone-400 font-mono">
                      {lot.items.length} item{lot.items.length === 1 ? '' : 's'}
                    </p>
                  </Td>
                  <Td>
                    <LotStatePill state={lot.state} />
                  </Td>
                  <Td className="tabular-nums font-mono text-white text-xs">{formatWeight(lot.totalWeightKg)}</Td>
                  <Td className="tabular-nums font-mono text-[#4FD68C] text-xs font-bold">{formatMoney(lot.estimatedValue)}</Td>
                  <Td className="tabular-nums font-mono text-stone-300 text-xs">{lot.offerCount}</Td>
                  <Td className="text-xs text-stone-400 font-mono">{lot.handoverState ?? '-'}</Td>
                  <Td>
                    {lot.paymentState ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          lot.paymentState === 'CONFIRMED'
                            ? 'bg-[#163324] text-[#4FD68C] border-[#2FBF71]/30'
                            : lot.paymentState === 'DISPUTED'
                              ? 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                              : 'bg-amber-950/40 text-amber-300 border-amber-600/40'
                        }`}
                      >
                        {lot.paymentState}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-500 font-mono">-</span>
                    )}
                  </Td>
                  <Td className="text-xs text-stone-400 font-mono">{lot.transactionStatus ?? '-'}</Td>
                  <Td>
                    {lot.anomalyFlags.length === 0 && !lot.requiresReview ? (
                      <span className="text-xs text-stone-500 font-mono">Clear</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {lot.requiresReview ? (
                          <Badge tone="bg-amber-950/40 text-amber-300 border-amber-600/40">Weight review</Badge>
                        ) : null}
                        {lot.anomalyFlags.map((flag) => (
                          <span
                            key={`${lot.id}-${flag.code}`}
                            title={flag.message}
                            className="inline-flex items-center gap-1"
                          >
                            <SeverityPill severity={flag.severity} />
                            <span className="font-mono text-[10px] text-stone-400">{flag.code}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td className="text-xs whitespace-nowrap text-stone-400 font-mono">
                    {formatDateTime(lot.updatedAt)}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <p className="text-xs text-stone-400 font-mono">
          Showing {visible.length} of {lots.length} lots. A completed lot produces exactly one
          transaction; no screen can create a second.
        </p>
      </div>
    </DemoBoundary>
  );
}

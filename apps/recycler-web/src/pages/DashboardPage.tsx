import React, { useEffect, useState } from 'react';
import { Button, LoadingState, ErrorState, PriceDisplay } from '@rescrap/design-system';
import { recyclerSession } from '../lib/session.js';
import type { RecyclerDashboardData } from '../lib/api.js';

interface DashboardPageProps {
  onNavigate: (screen: 'available-lots' | 'deals' | 'offers') => void;
}

const getMaterialImage = (name: string, category: string): string => {
  const lower = `${name} ${category}`.toLowerCase();
  if (lower.includes('copper') || lower.includes('wire')) return '/assets/mat-copper.jpg';
  if (lower.includes('phone') || lower.includes('mobile')) return '/assets/mat-phones.jpg';
  if (lower.includes('aluminium') || lower.includes('heatsink') || lower.includes('metal')) return '/assets/mat-aluminium.jpg';
  return '/assets/mat-motherboard.jpg';
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<RecyclerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await recyclerSession.client.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (isLoading) return <LoadingState label="Loading operational dashboard..." className="text-stone-300 py-12" />;
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;
  if (!data) return null;

  const completedCount = data.completedThisMonthCount ?? (data as any).completedCount ?? 0;
  const acceptancePercent = data.acceptanceRatePercent ?? (data as any).acceptanceRate ?? 0;
  const recentMatchingLots = data.recentMatchingLots ?? [];
  const pendingActions = data.pendingActions ?? [];

  const metrics = [
    {
      title: 'New Matching Lots',
      value: data.newLotsCount ?? 0,
      rationale: 'Should I bid now?',
      onClick: () => onNavigate('available-lots'),
      color: 'border-[#2FBF71]',
      badgeTone: 'text-[#4FD68C] bg-[#163324]',
    },
    {
      title: 'Pending Offers',
      value: data.pendingOffersCount ?? 0,
      rationale: 'What needs my action?',
      onClick: () => onNavigate('offers'),
      color: 'border-blue-500/60',
      badgeTone: 'text-blue-300 bg-blue-950/40',
    },
    {
      title: 'Active Deals',
      value: data.activeDealsCount ?? 0,
      rationale: 'What needs scheduling?',
      onClick: () => onNavigate('deals'),
      color: 'border-amber-500/60',
      badgeTone: 'text-amber-300 bg-amber-950/40',
    },
    {
      title: 'Upcoming Pickups',
      value: data.upcomingPickupsCount ?? 0,
      rationale: 'What needs logistics?',
      onClick: () => onNavigate('deals'),
      color: 'border-teal-500/60',
      badgeTone: 'text-teal-300 bg-teal-950/40',
    },
    {
      title: 'Completed (Month)',
      value: completedCount,
      rationale: 'Is this channel working?',
      onClick: () => onNavigate('deals'),
      color: 'border-stone-500/60',
      badgeTone: 'text-stone-300 bg-stone-900/60',
    },
    {
      title: 'Acceptance Rate',
      value: `${acceptancePercent}%`,
      rationale: 'Should I adjust pricing?',
      onClick: () => onNavigate('offers'),
      color: 'border-[#2FBF71]',
      badgeTone: 'text-[#4FD68C] bg-[#163324]',
    },
  ];

  return (
    <div className="flex flex-col gap-6 text-[#F5EFE6]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
            Live Operations &bull; Hadapsar Aggregation Cluster
          </span>
          <h2 className="text-2xl font-black text-white mt-0.5">Operations Overview</h2>
          <p className="text-xs text-stone-400 mt-1">
            Real-time informal supply matching and active transaction logistics
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => onNavigate('available-lots')}>
          Browse Open Lots &rarr;
        </Button>
      </div>

      {/* 6 Metric Cards with Decision Support Rationale (FD-11) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <div
            key={m.title}
            onClick={m.onClick}
            className={`p-4 rounded-2xl bg-[#12231B] border border-[#1E3A2B] hover:border-[#2FBF71]/50 cursor-pointer hover:shadow-xl transition-all ${m.color}`}
          >
            <span className="text-[10px] font-mono font-bold text-stone-400 block uppercase tracking-wider">
              {m.title}
            </span>
            <div className="text-2xl font-black text-white my-1 font-mono">{m.value}</div>
            <span className="text-[10px] text-stone-400 italic block mt-1 line-clamp-1">
              &ldquo;{m.rationale}&rdquo;
            </span>
          </div>
        ))}
      </div>

      {/* Main split: New Lots vs Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-3xl bg-[#12231B] border border-[#1E3A2B] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#1E3A2B] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Recently Submitted Lots</h3>
                <p className="text-xs text-stone-400">Available for bidding from local informal collectors</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('available-lots')}
                className="text-xs font-semibold text-[#4FD68C] hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <span>&rarr;</span>
              </button>
            </div>

            {recentMatchingLots.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                No new scrap lots currently open.
              </div>
            ) : (
              <div className="divide-y divide-[#1E3A2B]/60">
                {recentMatchingLots.slice(0, 5).map((lot) => {
                  const img = getMaterialImage(lot.materialName, lot.categoryName);
                  return (
                    <div
                      key={lot.id}
                      onClick={() => onNavigate('available-lots')}
                      className="p-4 flex items-center justify-between hover:bg-[#163324]/40 cursor-pointer transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={img}
                          alt={lot.materialName}
                          className="w-14 h-14 rounded-xl object-cover border border-[#1E3A2B] shrink-0"
                        />
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">
                              {lot.materialName}
                            </span>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0C1A14] text-[#4FD68C] border border-[#1E3A2B] shrink-0">
                              {lot.categoryName}
                            </span>
                            <span className="text-[10px] font-mono text-stone-500 hidden sm:inline">({lot.id})</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-stone-400">
                            <span>Weight: <strong className="text-white font-mono">{lot.declaredWeightKg} kg</strong></span>
                            <span>&bull;</span>
                            <span>Condition: <strong className="text-stone-300">{lot.condition}</strong></span>
                            <span>&bull;</span>
                            <span className="truncate">Area: {lot.collectionArea}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <PriceDisplay paise={lot.estimatedValuePaise} isEstimate size="sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="rounded-3xl bg-[#12231B] border border-[#1E3A2B] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#1E3A2B] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Pending Actions</h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                pendingActions.length > 0
                  ? 'bg-amber-950/40 text-amber-300 border-amber-600/40'
                  : 'bg-[#163324] text-[#4FD68C] border-[#2FBF71]/30'
              }`}>
                {pendingActions.length} Actions
              </span>
            </div>

            {pendingActions.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                All active deals are up to date!
              </div>
            ) : (
              <div className="divide-y divide-[#1E3A2B]/60">
                {pendingActions.map((action) => (
                  <div key={action.id} className="p-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {action.title}
                      </span>
                      <span className="text-[9px] uppercase font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40">
                        Required
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-stone-400 font-mono">Lot {action.lotId}</span>
                      <button
                        type="button"
                        onClick={() => onNavigate('deals')}
                        className="px-3 py-1 rounded-lg bg-[#163324] hover:bg-[#1E4330] border border-[#2FBF71]/30 text-xs font-bold text-[#4FD68C] transition-colors"
                      >
                        Resolve &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, Badge, Button, LoadingState, ErrorState, PriceDisplay } from '@rescrap/design-system';
import { recyclerSession } from '../lib/session.js';
import type { RecyclerDashboardData } from '../lib/api.js';

interface DashboardPageProps {
  onNavigate: (screen: 'available-lots' | 'deals' | 'offers') => void;
}

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

  if (isLoading) return <LoadingState label="Loading operational dashboard..." />;
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
      color: 'border-l-4 border-l-emerald-500',
    },
    {
      title: 'Pending Offers',
      value: data.pendingOffersCount ?? 0,
      rationale: 'What needs my action?',
      onClick: () => onNavigate('offers'),
      color: 'border-l-4 border-l-blue-500',
    },
    {
      title: 'Active Deals',
      value: data.activeDealsCount ?? 0,
      rationale: 'What needs scheduling?',
      onClick: () => onNavigate('deals'),
      color: 'border-l-4 border-l-amber-500',
    },
    {
      title: 'Upcoming Pickups',
      value: data.upcomingPickupsCount ?? 0,
      rationale: 'What needs logistics?',
      onClick: () => onNavigate('deals'),
      color: 'border-l-4 border-l-purple-500',
    },
    {
      title: 'Completed (Month)',
      value: completedCount,
      rationale: 'Is this channel working?',
      onClick: () => onNavigate('deals'),
      color: 'border-l-4 border-l-stone-500',
    },
    {
      title: 'Acceptance Rate',
      value: `${acceptancePercent}%`,
      rationale: 'Should I adjust pricing?',
      onClick: () => onNavigate('offers'),
      color: 'border-l-4 border-l-teal-500',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Operations Overview</h2>
          <p className="text-xs text-stone-500">
            Real-time supply matching and active transaction logistics
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => onNavigate('available-lots')}>
          Browse Open Lots
        </Button>
      </div>

      {/* 6 Metric Cards with Decision Support Rationale (FD-11) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <Card
            key={m.title}
            variant="default"
            onClick={m.onClick}
            className={`p-3.5 cursor-pointer hover:shadow-md transition-shadow ${m.color}`}
          >
            <span className="text-[11px] font-semibold text-stone-500 block uppercase tracking-wider">
              {m.title}
            </span>
            <div className="text-2xl font-black text-stone-900 my-1 font-mono">{m.value}</div>
            <span className="text-[10px] text-stone-400 italic block mt-1">
              Supports: &ldquo;{m.rationale}&rdquo;
            </span>
          </Card>
        ))}
      </div>

      {/* Main split: New Lots vs Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Recently Submitted Lots</h3>
                <p className="text-xs text-stone-500">Available for bidding from local informal collectors</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('available-lots')}>
                View All &rarr;
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              {recentMatchingLots.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500">
                  No new scrap lots currently open.
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {recentMatchingLots.slice(0, 5).map((lot) => (
                    <div
                      key={lot.id}
                      onClick={() => onNavigate('available-lots')}
                      className="p-4 flex items-center justify-between hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-stone-900">
                            {lot.materialName}
                          </span>
                          <Badge tone="neutral">{lot.categoryName}</Badge>
                          <span className="text-xs font-mono text-stone-400">({lot.id})</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-stone-500">
                          <span>Weight: <strong className="text-stone-700">{lot.declaredWeightKg} kg</strong></span>
                          <span>&bull;</span>
                          <span>Condition: {lot.condition}</span>
                          <span>&bull;</span>
                          <span>Area: {lot.collectionArea}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <PriceDisplay paise={lot.estimatedValuePaise} isEstimate size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-stone-900">Pending Actions</h3>
              <Badge tone={pendingActions.length > 0 ? 'warning' : 'neutral'}>
                {pendingActions.length} Actions
              </Badge>
            </CardHeader>
            <CardBody className="p-0">
              {pendingActions.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500">
                  All active deals are up to date!
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {pendingActions.map((action) => (
                    <div key={action.id} className="p-3.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-800">
                          {action.title}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Required
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-stone-400 font-mono">Lot {action.lotId}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigate('deals')}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Card, StatusPill, Button, LoadingState, ErrorState, PriceDisplay } from '@rescrap/design-system';
import { recyclerSession } from '../lib/session.js';
import type { RecyclerOfferItem } from '../lib/api.js';

export const OffersPage: React.FC = () => {
  const [offers, setOffers] = useState<readonly RecyclerOfferItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'SUPERSEDED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOffers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await recyclerSession.client.listMyOffers();
      setOffers(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load submitted offers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOffers();
  }, []);

  const filtered = offers.filter((o) => {
    if (activeTab === 'ALL') return true;
    return o.status === activeTab;
  });

  const getStatusProps = (status: RecyclerOfferItem['status']) => {
    switch (status) {
      case 'ACCEPTED':
        return { status: 'success' as const, label: 'Accepted by Collector' };
      case 'PENDING':
        return { status: 'warning' as const, label: 'Awaiting Response' };
      case 'SUPERSEDED':
      case 'REJECTED':
        return { status: 'danger' as const, label: 'Outbid / Declined' };
      case 'EXPIRED':
        return { status: 'neutral' as const, label: 'Expired' };
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Submitted Offers</h2>
          <p className="text-xs text-stone-500">
            Track binding purchase bids transmitted to informal collectors
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOffers}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-6">
        {[
          { id: 'ALL', label: 'All Offers', count: offers.length },
          { id: 'PENDING', label: 'Pending', count: offers.filter((o) => o.status === 'PENDING').length },
          { id: 'ACCEPTED', label: 'Accepted Deals', count: offers.filter((o) => o.status === 'ACCEPTED').length },
          { id: 'SUPERSEDED', label: 'Declined / Outbid', count: offers.filter((o) => o.status === 'SUPERSEDED' || o.status === 'REJECTED').length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-bold">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Offers Table */}
      {isLoading ? (
        <LoadingState label="Loading offer records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadOffers} />
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm font-semibold text-stone-700">No offers found in this view.</p>
          <p className="text-xs text-stone-500 mt-1">
            Browse available scrap lots to submit competitive bids.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm text-stone-700 divide-y divide-stone-200">
            <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-500 tracking-wider">
              <tr>
                <th className="px-4 py-3">Offer ID</th>
                <th className="px-4 py-3">Target Lot</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3 text-right">Offered Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filtered.map((offer) => {
                const s = getStatusProps(offer.status);
                return (
                  <tr key={offer.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">{offer.id}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-700">
                      {offer.lotId}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-900">{offer.materialName}</td>
                    <td className="px-4 py-3 text-right">
                      <PriceDisplay paise={offer.amountPaise} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={s.status} label={s.label} />
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(offer.validUntil).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(offer.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

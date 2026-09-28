import React, { useEffect, useState } from 'react';
import { Button, LoadingState, ErrorState, PriceDisplay } from '@rescrap/design-system';
import { recyclerSession } from '../lib/session.js';
import type { RecyclerOfferItem } from '../lib/api.js';

const getMaterialImage = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('copper') || lower.includes('wire')) return '/assets/mat-copper.jpg';
  if (lower.includes('phone') || lower.includes('mobile')) return '/assets/mat-phones.jpg';
  if (lower.includes('aluminium') || lower.includes('heatsink')) return '/assets/mat-aluminium.jpg';
  return '/assets/mat-motherboard.jpg';
};

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

  return (
    <div className="flex flex-col gap-6 text-[#F5EFE6]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
            Offer Portfolio &bull; Legally Binding Bids
          </span>
          <h2 className="text-2xl font-black text-white mt-0.5">Submitted Offers</h2>
          <p className="text-xs text-stone-400 mt-1">
            Track purchase bids transmitted directly to informal collectors
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOffers}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1E3A2B] gap-3 pb-2 overflow-x-auto">
        {[
          { id: 'ALL', label: 'All Offers', count: offers.length },
          { id: 'PENDING', label: 'Pending Response', count: offers.filter((o) => o.status === 'PENDING').length },
          { id: 'ACCEPTED', label: 'Accepted Deals', count: offers.filter((o) => o.status === 'ACCEPTED').length },
          { id: 'SUPERSEDED', label: 'Declined / Outbid', count: offers.filter((o) => o.status === 'SUPERSEDED' || o.status === 'REJECTED').length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
              activeTab === tab.id
                ? 'bg-[#163324] border-[#2FBF71]/50 text-white font-bold'
                : 'border-transparent text-stone-400 hover:text-white hover:bg-[#12231B]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === tab.id ? 'bg-[#2FBF71] text-[#07130D]' : 'bg-[#0C1A14] text-stone-400 border border-[#1E3A2B]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Offers Table */}
      {isLoading ? (
        <LoadingState label="Loading offer records..." className="py-16 text-stone-300" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadOffers} />
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#12231B] border border-[#1E3A2B]">
          <p className="text-sm font-semibold text-white">No offers found in this view.</p>
          <p className="text-xs text-stone-400 mt-1">
            Browse available scrap lots to submit competitive bids.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#1E3A2B] bg-[#12231B] shadow-xl">
          <table className="w-full text-left text-sm text-stone-300 divide-y divide-[#1E3A2B]">
            <thead className="bg-[#0C1A14] text-[10px] uppercase font-mono font-bold text-stone-400 tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Material</th>
                <th className="px-5 py-3.5">Lot ID</th>
                <th className="px-5 py-3.5 text-right">Offer Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Valid Until</th>
                <th className="px-5 py-3.5">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3A2B]/60 bg-[#12231B]">
              {filtered.map((offer) => {
                const img = getMaterialImage(offer.materialName);
                return (
                  <tr key={offer.id} className="hover:bg-[#163324]/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={img}
                          alt={offer.materialName}
                          className="w-11 h-11 rounded-xl object-cover border border-[#1E3A2B] shrink-0"
                        />
                        <span className="font-bold text-white text-sm">{offer.materialName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-stone-400">{offer.lotId}</td>
                    <td className="px-5 py-4 text-right">
                      <PriceDisplay paise={offer.amountPaise} size="sm" />
                    </td>
                    <td className="px-5 py-4">
                      {offer.status === 'ACCEPTED' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#163324] text-[#4FD68C] border border-[#2FBF71]/40">
                          ACCEPTED BY COLLECTOR
                        </span>
                      ) : offer.status === 'PENDING' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-950/40 text-amber-300 border border-amber-600/40">
                          AWAITING RESPONSE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-stone-900 text-stone-400 border border-stone-800">
                          {offer.status}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-stone-400">
                      {new Date(offer.validUntil).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-400 max-w-xs truncate">
                      {offer.justification ?? 'Standard fair valuation'}
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

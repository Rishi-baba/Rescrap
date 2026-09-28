import React, { useEffect, useState } from 'react';
import {
  Button,
  Input,
  LoadingState,
  ErrorState,
  PriceDisplay,
  Modal,
} from '@rescrap/design-system';
import { recyclerSession } from '../lib/session.js';
import type { RecyclerLotItem, RecyclerProfileData } from '../lib/api.js';

const getMaterialImage = (name: string, category: string): string => {
  const lower = `${name} ${category}`.toLowerCase();
  if (lower.includes('copper') || lower.includes('wire')) return '/assets/mat-copper.jpg';
  if (lower.includes('phone') || lower.includes('mobile')) return '/assets/mat-phones.jpg';
  if (lower.includes('aluminium') || lower.includes('heatsink') || lower.includes('metal')) return '/assets/mat-aluminium.jpg';
  return '/assets/mat-motherboard.jpg';
};

export const AvailableLotsPage: React.FC = () => {
  const [lots, setLots] = useState<readonly RecyclerLotItem[]>([]);
  const [profile, setProfile] = useState<RecyclerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedLot, setSelectedLot] = useState<RecyclerLotItem | null>(null);

  // Offer Form State
  const [offerRupees, setOfferRupees] = useState<string>('');
  const [validDays, setValidDays] = useState<number>(3);
  const [justification, setJustification] = useState<string>('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [lotsRes, profileRes] = await Promise.all([
        recyclerSession.client.getAvailableLots({
          materialCategoryId: selectedCategory === 'all' ? undefined : selectedCategory,
          area: selectedArea === 'all' ? undefined : selectedArea,
        }),
        recyclerSession.client.getProfile().catch(() => null),
      ]);
      setLots(lotsRes.data);
      if (profileRes) setProfile(profileRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load available lots');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [selectedCategory, selectedArea]);

  const handleOpenLot = (lot: RecyclerLotItem) => {
    setSelectedLot(lot);
    // Prepopulate offer with estimated value in rupees
    setOfferRupees(String(Math.round(lot.estimatedValuePaise / 100)));
    setValidDays(3);
    setJustification('');
    setOfferSuccess(null);
    setOfferError(null);
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot || !offerRupees) return;

    const amountRupees = Number.parseFloat(offerRupees);
    if (Number.isNaN(amountRupees) || amountRupees <= 0) {
      setOfferError('Please enter a valid offer amount');
      return;
    }

    const amountPaise = Math.round(amountRupees * 100);
    const validUntil = new Date(Date.now() + validDays * 86_400_000).toISOString();
    const idempotencyKey = `off_${selectedLot.id}_${Date.now()}`;

    setIsSubmittingOffer(true);
    setOfferError(null);
    try {
      await recyclerSession.client.makeOffer({
        lotId: selectedLot.id,
        amount: amountPaise,
        validUntil,
        justification: justification.trim() || undefined,
        idempotencyKey,
      });
      setOfferSuccess(`Offer of INR ${amountRupees.toLocaleString('en-IN')} submitted successfully!`);
      void loadData();
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'Failed to submit offer');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const isVerified = profile?.verificationStatus === 'VERIFIED';

  return (
    <div className="flex flex-col gap-6 text-[#F5EFE6]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
            Supply Matching &bull; Verified Formal Flow
          </span>
          <h2 className="text-2xl font-black text-white mt-0.5">Available Scrap Lots</h2>
          <p className="text-xs text-stone-400 mt-1">
            Open supply matching authorized materials in Pune &amp; Maharashtra Region
          </p>
        </div>
        {!isVerified && profile ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs">
            <span className="font-semibold">Bidding restricted:</span>
            <span>Facility status is {profile.verificationStatus}</span>
          </div>
        ) : null}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#12231B] border border-[#1E3A2B] shadow-sm flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold">
          Stream:
        </span>
        {['all', 'Computing', 'Mobile & Telecom', 'Components', 'Batteries'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              selectedCategory === cat
                ? 'bg-[#1E8E53] text-[#07130D] border-[#2FBF71] font-bold shadow-md'
                : 'bg-[#0C1A14] text-stone-400 hover:text-white border-[#1E3A2B]'
            }`}
          >
            {cat === 'all' ? 'All Materials' : cat}
          </button>
        ))}

        <div className="h-4 w-px bg-[#1E3A2B] mx-1 hidden sm:block" />

        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold">
          Area:
        </span>
        {['all', 'Pune - Hadapsar', 'Mumbai Metro', 'Tier 2 / Rural'].map((area) => (
          <button
            key={area}
            type="button"
            onClick={() => setSelectedArea(area)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              selectedArea === area
                ? 'bg-[#1E8E53] text-[#07130D] border-[#2FBF71] font-bold shadow-md'
                : 'bg-[#0C1A14] text-stone-400 hover:text-white border-[#1E3A2B]'
            }`}
          >
            {area === 'all' ? 'All Areas' : area}
          </button>
        ))}
      </div>

      {/* Lots Table */}
      {isLoading ? (
        <LoadingState label="Searching open lots..." className="py-16 text-stone-300" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : lots.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#12231B] border border-[#1E3A2B]">
          <p className="text-sm font-semibold text-white">No scrap lots match current filters.</p>
          <p className="text-xs text-stone-400 mt-1">Try switching to &ldquo;All Materials&rdquo; or clearing area filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#1E3A2B] bg-[#12231B] shadow-xl">
          <table className="w-full text-left text-sm text-stone-300 divide-y divide-[#1E3A2B]">
            <thead className="bg-[#0C1A14] text-[10px] uppercase font-mono font-bold text-stone-400 tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Material</th>
                <th className="px-5 py-3.5">Lot ID</th>
                <th className="px-5 py-3.5">Weight</th>
                <th className="px-5 py-3.5">Condition</th>
                <th className="px-5 py-3.5">Area</th>
                <th className="px-5 py-3.5 text-right">Est. Value</th>
                <th className="px-5 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3A2B]/60 bg-[#12231B]">
              {lots.map((lot) => {
                const img = getMaterialImage(lot.materialName, lot.categoryName);
                return (
                  <tr
                    key={lot.id}
                    onClick={() => handleOpenLot(lot)}
                    className="hover:bg-[#163324]/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={img}
                          alt={lot.materialName}
                          className="w-12 h-12 rounded-xl object-cover border border-[#1E3A2B] shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white text-sm">{lot.materialName}</div>
                          <span className="text-[10px] font-mono text-[#4FD68C]">{lot.categoryName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-stone-400">{lot.id}</td>
                    <td className="px-5 py-4 tabular-nums font-mono font-bold text-white">
                      {lot.declaredWeightKg} kg
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <span className="px-2 py-0.5 rounded bg-[#0C1A14] border border-[#1E3A2B] font-mono text-stone-300 text-[11px]">
                        {lot.condition}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-400">{lot.collectionArea}</td>
                    <td className="px-5 py-4 text-right">
                      <PriceDisplay paise={lot.estimatedValuePaise} isEstimate size="sm" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLot(lot);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#163324] hover:bg-[#1E8E53] hover:text-[#07130D] border border-[#2FBF71]/40 text-xs font-bold text-[#4FD68C] transition-all"
                      >
                        Inspect &amp; Bid
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lot Detail & Offer Modal (Screen B-05) */}
      {selectedLot ? (
        <Modal
          isOpen={Boolean(selectedLot)}
          onClose={() => setSelectedLot(null)}
          title={`Lot Details — ${selectedLot.materialName}`}
          description={`ID: ${selectedLot.id} • Submitted by informal collector`}
          maxWidth="lg"
        >
          <div className="flex flex-col gap-5 text-[#F5EFE6]">
            {/* Real material photo banner */}
            <div className="relative h-44 rounded-2xl overflow-hidden border border-[#1E3A2B]">
              <img
                src={getMaterialImage(selectedLot.materialName, selectedLot.categoryName)}
                alt={selectedLot.materialName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C1A14] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-sm font-bold text-white">{selectedLot.materialName}</span>
                <span className="text-[10px] font-mono uppercase bg-[#163324] text-[#4FD68C] px-2.5 py-1 rounded-md border border-[#2FBF71]/40">
                  {selectedLot.categoryName}
                </span>
              </div>
            </div>

            {/* Lot Summary Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#0C1A14] border border-[#1E3A2B] text-xs">
              <div>
                <span className="text-stone-400 block mb-0.5 uppercase tracking-wider text-[10px] font-mono">
                  Declared Weight
                </span>
                <span className="font-bold text-white text-base font-mono">
                  {selectedLot.declaredWeightKg} kg
                </span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5 uppercase tracking-wider text-[10px] font-mono">
                  Condition &amp; Area
                </span>
                <span className="text-stone-200 font-medium">
                  {selectedLot.condition} &bull; {selectedLot.collectionArea}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5 uppercase tracking-wider text-[10px] font-mono">
                  Approx. Benchmark Value
                </span>
                <PriceDisplay paise={selectedLot.estimatedValuePaise} isEstimate size="sm" />
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5 uppercase tracking-wider text-[10px] font-mono">
                  Compliance Stream
                </span>
                <span className="text-[#4FD68C] font-mono">CPCB Schedule I Compliant</span>
              </div>
            </div>

            {/* Make Offer Form */}
            <div className="border-t border-[#1E3A2B] pt-4">
              <h3 className="text-sm font-bold text-white mb-2">Submit Formal Purchase Offer</h3>

              {!isVerified ? (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-xs text-amber-300">
                  <strong>Verification Required:</strong> Your facility profile is currently{' '}
                  <span className="font-mono">{profile?.verificationStatus ?? 'UNVERIFIED'}</span>. Only{' '}
                  <strong>VERIFIED</strong> recyclers can submit binding bids.
                </div>
              ) : offerSuccess ? (
                <div className="p-4 rounded-xl bg-[#163324] border border-[#2FBF71]/40 text-xs text-[#4FD68C] flex flex-col gap-2">
                  <span className="font-bold text-sm text-white">Offer Transmitted!</span>
                  <span>{offerSuccess}</span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedLot(null)} className="w-fit mt-1">
                    Close
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitOffer} className="flex flex-col gap-3">
                  {offerError ? (
                    <div className="p-2.5 rounded-lg bg-rose-950/40 text-xs text-rose-300 border border-rose-800/40">
                      {offerError}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Total Offer Amount (INR ₹)"
                      type="number"
                      step="1"
                      min="1"
                      value={offerRupees}
                      onChange={(e) => setOfferRupees(e.target.value)}
                      placeholder="e.g. 1500"
                      isNumericTabular
                      required
                    />
                    <Input
                      label="Offer Validity (Days)"
                      type="number"
                      min="1"
                      max="14"
                      value={String(validDays)}
                      onChange={(e) => setValidDays(Number(e.target.value))}
                      required
                    />
                  </div>

                  <Input
                    label="Offer Note / Justification (if differing from market rate)"
                    type="text"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="e.g. Verified tier-1 recycler pickup included"
                    helperText="Required if bidding significantly above or below estimated value"
                  />

                  <div className="flex justify-end gap-2 mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedLot(null)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSubmittingOffer}
                      disabled={!isVerified}
                    >
                      Confirm &amp; Transmit Offer
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

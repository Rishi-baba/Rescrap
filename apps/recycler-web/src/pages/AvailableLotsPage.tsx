import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Input,
  FilterChip,
  LoadingState,
  ErrorState,
  PriceDisplay,
  Modal,
} from '@rescrap/design-system';
import { recyclerSession } from '../lib/session.js';
import type { RecyclerLotItem, RecyclerProfileData } from '../lib/api.js';

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
      // Reload lots
      void loadData();
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'Failed to submit offer');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const isVerified = profile?.verificationStatus === 'VERIFIED';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Available Scrap Lots</h2>
          <p className="text-xs text-stone-500">
            Open supply matching authorized materials in your region
          </p>
        </div>
        {!isVerified && profile ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <span className="font-semibold">Bidding restricted:</span>
            <span>Facility status is {profile.verificationStatus}</span>
          </div>
        ) : null}
      </div>

      {/* Filter Bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-stone-500 uppercase">Categories:</span>
          {['all', 'Computing', 'Mobile & Telecom', 'Components', 'Batteries'].map((cat) => (
            <FilterChip
              key={cat}
              label={cat === 'all' ? 'All Materials' : cat}
              active={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            />
          ))}

          <div className="h-4 w-px bg-stone-200 mx-1" />

          <span className="text-xs font-semibold text-stone-500 uppercase">Area:</span>
          {['all', 'Pune - Hadapsar', 'Mumbai Metro', 'Tier 2 / Rural'].map((area) => (
            <FilterChip
              key={area}
              label={area === 'all' ? 'All Areas' : area}
              active={selectedArea === area}
              onClick={() => setSelectedArea(area)}
            />
          ))}
        </div>
      </Card>

      {/* Lots Data Table */}
      {isLoading ? (
        <LoadingState label="Searching open lots..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : lots.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm font-semibold text-stone-700">No scrap lots match current filters.</p>
          <p className="text-xs text-stone-500 mt-1">Try switching to &ldquo;All Materials&rdquo; or clearing area filters.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm text-stone-700 divide-y divide-stone-200">
            <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-500 tracking-wider">
              <tr>
                <th className="px-4 py-3">Lot ID</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3 text-right">Est. Value</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {lots.map((lot) => (
                <tr
                  key={lot.id}
                  onClick={() => handleOpenLot(lot)}
                  className="hover:bg-stone-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">{lot.id}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{lot.materialName}</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-stone-800">
                    {lot.declaredWeightKg} kg
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">{lot.condition}</td>
                  <td className="px-4 py-3 text-xs text-stone-600">{lot.collectionArea}</td>
                  <td className="px-4 py-3 text-right">
                    <PriceDisplay paise={lot.estimatedValuePaise} isEstimate size="sm" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="outline" size="sm" onClick={() => handleOpenLot(lot)}>
                      View &amp; Offer
                    </Button>
                  </td>
                </tr>
              ))}
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
          <div className="flex flex-col gap-5">
            {/* Lot Summary Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs">
              <div>
                <span className="text-stone-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">
                  Material &amp; Category
                </span>
                <span className="font-bold text-stone-900 text-sm">{selectedLot.materialName}</span>
                <span className="text-stone-500 block">{selectedLot.categoryName}</span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">
                  Declared Weight
                </span>
                <span className="font-bold text-stone-900 text-sm font-mono">
                  {selectedLot.declaredWeightKg} kg
                </span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">
                  Condition &amp; Area
                </span>
                <span className="text-stone-700 font-medium">
                  {selectedLot.condition} • {selectedLot.collectionArea}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">
                  Approx. Valuation
                </span>
                <PriceDisplay paise={selectedLot.estimatedValuePaise} isEstimate size="sm" />
              </div>
            </div>

            {/* Photo preview / demo tag */}
            <div>
              <span className="text-xs font-semibold text-stone-700 block mb-1.5">Evidence Photos</span>
              <div className="flex items-center gap-3">
                <div className="h-24 w-32 rounded-lg bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-400 text-xs font-mono relative overflow-hidden">
                  <span>Photo 1 (Demo)</span>
                  <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1 rounded">
                    DEMO
                  </span>
                </div>
              </div>
            </div>

            {/* Make Offer Form */}
            <div className="border-t border-stone-200 pt-4">
              <h3 className="text-sm font-bold text-stone-900 mb-2">Submit Formal Purchase Offer</h3>
              
              {!isVerified ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <strong>Verification Required:</strong> Your facility profile is currently{' '}
                  <span className="font-mono">{profile?.verificationStatus ?? 'UNVERIFIED'}</span>. Only{' '}
                  <strong>VERIFIED</strong> recyclers can submit binding bids.
                </div>
              ) : offerSuccess ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex flex-col gap-2">
                  <span className="font-bold text-sm">Offer Submitted!</span>
                  <span>{offerSuccess}</span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedLot(null)} className="w-fit mt-1">
                    Close
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitOffer} className="flex flex-col gap-3">
                  {offerError ? (
                    <div className="p-2.5 rounded bg-red-50 text-xs text-red-700 border border-red-200">
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

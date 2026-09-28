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
import type { RecyclerDealItem } from '../lib/api.js';

const getMaterialImage = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('copper') || lower.includes('wire')) return '/assets/mat-copper.jpg';
  if (lower.includes('phone') || lower.includes('mobile')) return '/assets/mat-phones.jpg';
  if (lower.includes('aluminium') || lower.includes('heatsink')) return '/assets/mat-aluminium.jpg';
  return '/assets/mat-motherboard.jpg';
};

export const DealsPage: React.FC = () => {
  const [deals, setDeals] = useState<readonly RecyclerDealItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scheduling Modal State (B-07)
  const [schedulingDeal, setSchedulingDeal] = useState<RecyclerDealItem | null>(null);
  const [pickupDate, setPickupDate] = useState<string>('');
  const [teamNotes, setTeamNotes] = useState<string>('Logistics Van 3 — Pune Central');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Handover Execution Modal State (B-08)
  const [executingDeal, setExecutingDeal] = useState<RecyclerDealItem | null>(null);
  const [measuredWeight, setMeasuredWeight] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const loadDeals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await recyclerSession.client.listMyOffers();
      const acceptedOffers = res.data.filter((o) => o.status === 'ACCEPTED');

      const dealItems: RecyclerDealItem[] = acceptedOffers.map((o) => ({
        id: `deal_${o.id}`,
        lotId: o.lotId,
        materialName: o.materialName,
        collectorArea: 'Pune - Hadapsar',
        agreedAmountPaise: o.amountPaise,
        status: 'OFFER_ACCEPTED',
        declaredWeightKg: 12,
      }));
      setDeals(dealItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load active transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDeals();
  }, []);

  const handleOpenSchedule = (deal: RecyclerDealItem) => {
    setSchedulingDeal(deal);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
    setPickupDate(tomorrow);
    setScheduleError(null);
  };

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingDeal || !pickupDate) return;

    setIsScheduling(true);
    setScheduleError(null);
    try {
      await recyclerSession.client.schedulePickup({
        lotId: schedulingDeal.lotId,
        scheduledFor: new Date(pickupDate).toISOString(),
        teamNotes,
        idempotencyKey: `sched_${schedulingDeal.lotId}_${Date.now()}`,
      });
      setSchedulingDeal(null);
      void loadDeals();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to schedule pickup');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleOpenHandover = (deal: RecyclerDealItem) => {
    setExecutingDeal(deal);
    setMeasuredWeight(String(deal.declaredWeightKg));
    setExecutionError(null);
  };

  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executingDeal || !measuredWeight) return;

    const finalWeightKg = Number.parseFloat(measuredWeight);
    if (Number.isNaN(finalWeightKg) || finalWeightKg <= 0) {
      setExecutionError('Please enter a valid weighed weight');
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);
    try {
      await recyclerSession.client.executeHandover({
        handoverId: executingDeal.handoverId ?? `handover_${executingDeal.lotId}`,
        finalWeightKg,
        photoKeys: ['demo://photo/handover-verified.jpg'],
        location: { lat: 18.5089, lng: 73.853 },
        idempotencyKey: `exec_${executingDeal.lotId}_${Date.now()}`,
      });
      setExecutingDeal(null);
      void loadDeals();
    } catch (err) {
      setExecutionError(err instanceof Error ? err.message : 'Handover execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const calculatedDiscrepancy =
    executingDeal && measuredWeight
      ? Math.abs(
          ((Number.parseFloat(measuredWeight) - executingDeal.declaredWeightKg) /
            executingDeal.declaredWeightKg) *
            100,
        )
      : 0;

  return (
    <div className="flex flex-col gap-6 text-[#F5EFE6]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
            Custody Transfer &bull; Chain of Custody
          </span>
          <h2 className="text-2xl font-black text-white mt-0.5">Active Deals &amp; Logistics</h2>
          <p className="text-xs text-stone-400 mt-1">
            Coordinate pickup scheduling and physical custody transfer on ONE shared Lot
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDeals}>
          Refresh Deals
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading active deals..." className="py-16 text-stone-300" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDeals} />
      ) : deals.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#12231B] border border-[#1E3A2B]">
          <p className="text-sm font-semibold text-white">No active deals right now.</p>
          <p className="text-xs text-stone-400 mt-1">
            When a collector accepts one of your bids, it will appear here for pickup scheduling.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#1E3A2B] bg-[#12231B] shadow-xl">
          <table className="w-full text-left text-sm text-stone-300 divide-y divide-[#1E3A2B]">
            <thead className="bg-[#0C1A14] text-[10px] uppercase font-mono font-bold text-stone-400 tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Material</th>
                <th className="px-5 py-3.5">Deal ID</th>
                <th className="px-5 py-3.5">Lot ID</th>
                <th className="px-5 py-3.5">Collector Area</th>
                <th className="px-5 py-3.5 text-right">Agreed Value</th>
                <th className="px-5 py-3.5">Stage</th>
                <th className="px-5 py-3.5 text-center">Logistics Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3A2B]/60 bg-[#12231B]">
              {deals.map((deal) => {
                const img = getMaterialImage(deal.materialName);
                return (
                  <tr key={deal.id} className="hover:bg-[#163324]/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={img}
                          alt={deal.materialName}
                          className="w-11 h-11 rounded-xl object-cover border border-[#1E3A2B] shrink-0"
                        />
                        <span className="font-bold text-white text-sm">{deal.materialName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-stone-400">{deal.id}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#4FD68C]">{deal.lotId}</td>
                    <td className="px-5 py-4 text-xs text-stone-300">{deal.collectorArea}</td>
                    <td className="px-5 py-4 text-right">
                      <PriceDisplay paise={deal.agreedAmountPaise} size="sm" />
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#163324] text-[#4FD68C] border border-[#2FBF71]/40">
                        OFFER ACCEPTED
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenSchedule(deal)}
                          className="px-3 py-1.5 rounded-xl bg-[#1E8E53] hover:bg-[#2FBF71] text-[#07130D] text-xs font-bold transition-all shadow-sm"
                        >
                          Schedule Pickup
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenHandover(deal)}
                          className="px-3 py-1.5 rounded-xl bg-[#163324] hover:bg-[#1E4330] border border-[#2FBF71]/40 text-[#4FD68C] text-xs font-bold transition-all"
                        >
                          Weigh &amp; Transfer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Pickup Modal */}
      {schedulingDeal ? (
        <Modal
          isOpen={Boolean(schedulingDeal)}
          onClose={() => setSchedulingDeal(null)}
          title="Schedule Logistics Pickup"
          description={`Lot: ${schedulingDeal.lotId} • Collector Area: ${schedulingDeal.collectorArea}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmSchedule} className="flex flex-col gap-4 text-[#F5EFE6]">
            {scheduleError ? (
              <div className="p-2.5 rounded-lg bg-rose-950/40 text-xs text-rose-300 border border-rose-800/40">
                {scheduleError}
              </div>
            ) : null}

            <Input
              label="Scheduled Date & Time"
              type="datetime-local"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              required
            />

            <Input
              label="Assigned Team & Vehicle Notes"
              type="text"
              value={teamNotes}
              onChange={(e) => setTeamNotes(e.target.value)}
              helperText="e.g. Van 3 equipped with calibrated 150kg platform scale"
              required
            />

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSchedulingDeal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isScheduling}>
                Confirm Dispatch Schedule
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Handover & Scale Modal */}
      {executingDeal ? (
        <Modal
          isOpen={Boolean(executingDeal)}
          onClose={() => setExecutingDeal(null)}
          title="On-Site Weighing & Custody Transfer"
          description={`Executing physical transfer for Lot: ${executingDeal.lotId}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmHandover} className="flex flex-col gap-4 text-[#F5EFE6]">
            {executionError ? (
              <div className="p-2.5 rounded-lg bg-rose-950/40 text-xs text-rose-300 border border-rose-800/40">
                {executionError}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#0C1A14] border border-[#1E3A2B] text-xs">
              <div>
                <span className="text-stone-400 block mb-0.5 text-[10px] font-mono">Declared Weight</span>
                <span className="font-mono font-bold text-white text-base">
                  {executingDeal.declaredWeightKg} kg
                </span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5 text-[10px] font-mono">Weight Difference</span>
                <span className={`font-mono font-bold text-sm ${calculatedDiscrepancy > 10 ? 'text-amber-400' : 'text-[#4FD68C]'}`}>
                  {calculatedDiscrepancy.toFixed(1)}% {calculatedDiscrepancy > 10 ? '(Tolerance Alert)' : '(Within 10% Safe)'}
                </span>
              </div>
            </div>

            <Input
              label="Final Scale Reading (kg)"
              type="number"
              step="0.1"
              min="0.1"
              value={measuredWeight}
              onChange={(e) => setMeasuredWeight(e.target.value)}
              placeholder="e.g. 12.5"
              isNumericTabular
              required
            />

            <div className="p-3 rounded-xl bg-[#0C1A14] border border-[#1E3A2B] text-xs text-stone-300">
              <span className="text-[10px] font-mono uppercase text-[#4FD68C] block mb-1">
                Simulated Digital Attestation
              </span>
              Digital signature hash will be permanently anchored to the lot passport upon collector verification.
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setExecutingDeal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isExecuting}>
                Execute Custody Transfer
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

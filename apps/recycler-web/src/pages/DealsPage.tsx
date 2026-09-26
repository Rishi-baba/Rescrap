import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  StatusPill,
  Input,
  LoadingState,
  ErrorState,
  PriceDisplay,
  Modal,
} from '@rescrap/design-system';
import { recyclerSession } from '../lib/session.js';
import type { RecyclerDealItem } from '../lib/api.js';

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
      // In the mock/service layer, we fetch offers and lots that are in active transaction states
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

  // Discrepancy calculation for Handover Execution
  const calculatedDiscrepancy =
    executingDeal && measuredWeight
      ? Math.abs(
          ((Number.parseFloat(measuredWeight) - executingDeal.declaredWeightKg) /
            executingDeal.declaredWeightKg) *
            100,
        )
      : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Active Deals &amp; Logistics</h2>
          <p className="text-xs text-stone-500">
            Coordinate pickup scheduling and physical custody transfer on ONE shared Lot
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDeals}>
          Refresh Deals
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading active deals..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDeals} />
      ) : deals.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm font-semibold text-stone-700">No active deals right now.</p>
          <p className="text-xs text-stone-500 mt-1">
            When a collector accepts one of your bids, it will appear here for pickup scheduling.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm text-stone-700 divide-y divide-stone-200">
            <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-500 tracking-wider">
              <tr>
                <th className="px-4 py-3">Deal ID</th>
                <th className="px-4 py-3">Lot ID</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Collector Area</th>
                <th className="px-4 py-3 text-right">Agreed Value</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 text-center">Logistics Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">{deal.id}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-700">
                    {deal.lotId}
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{deal.materialName}</td>
                  <td className="px-4 py-3 text-xs text-stone-600">{deal.collectorArea}</td>
                  <td className="px-4 py-3 text-right">
                    <PriceDisplay paise={deal.agreedAmountPaise} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status="info" label="Accepted — Ready for Pickup" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenSchedule(deal)}
                      >
                        Schedule Pickup
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenHandover(deal)}
                      >
                        Execute Handover
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pickup Scheduling Modal (B-07) */}
      {schedulingDeal ? (
        <Modal
          isOpen={Boolean(schedulingDeal)}
          onClose={() => setSchedulingDeal(null)}
          title={`Schedule Pickup — Lot ${schedulingDeal.lotId}`}
          description={`Material: ${schedulingDeal.materialName} • Location: ${schedulingDeal.collectorArea}`}
        >
          <form onSubmit={handleConfirmSchedule} className="flex flex-col gap-4">
            {scheduleError ? (
              <div className="p-2.5 rounded bg-red-50 text-xs text-red-700 border border-red-200">
                {scheduleError}
              </div>
            ) : null}

            <Input
              label="Pickup Date & Time Window"
              type="datetime-local"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              required
            />

            <Input
              label="Assigned Vehicle / Logistics Team"
              type="text"
              value={teamNotes}
              onChange={(e) => setTeamNotes(e.target.value)}
              helperText="Note: Scheduling releases collector contact details for logistics team (SB-4)"
              required
            />

            <div className="flex justify-end gap-2 mt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setSchedulingDeal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isScheduling}>
                Confirm Logistics Schedule
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Handover Execution Modal (B-08) */}
      {executingDeal ? (
        <Modal
          isOpen={Boolean(executingDeal)}
          onClose={() => setExecutingDeal(null)}
          title={`Execute Physical Handover — Lot ${executingDeal.lotId}`}
          description="Weigh material and record custody transfer proof on location"
        >
          <form onSubmit={handleConfirmHandover} className="flex flex-col gap-4">
            {executionError ? (
              <div className="p-2.5 rounded bg-red-50 text-xs text-red-700 border border-red-200">
                {executionError}
              </div>
            ) : null}

            <div className="p-3 bg-stone-50 rounded-lg text-xs flex justify-between items-center">
              <span className="text-stone-500">Declared Collector Weight:</span>
              <strong className="text-stone-900 font-mono text-sm">
                {executingDeal.declaredWeightKg} kg
              </strong>
            </div>

            <Input
              label="Calibrated Scale Measured Weight (kg)"
              type="number"
              step="0.1"
              min="0.1"
              value={measuredWeight}
              onChange={(e) => setMeasuredWeight(e.target.value)}
              isNumericTabular
              required
            />

            {/* Tolerance & Discrepancy Warning (HAND-04) */}
            {calculatedDiscrepancy > 10 ? (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex flex-col gap-1">
                <span className="font-bold flex items-center gap-1">
                  Discrepancy Warning ({calculatedDiscrepancy.toFixed(1)}% shift)
                </span>
                <span>
                  The measured weight differs by more than 10% from the declared amount. Rule HAND-04
                  requires the collector to explicitly acknowledge this discrepancy before payment clears.
                </span>
              </div>
            ) : null}

            <div className="p-3 border border-stone-200 rounded-lg text-xs">
              <span className="font-semibold block text-stone-700 mb-1">Custody Evidence Proof</span>
              <span className="text-stone-500 block">
                GPS Location: <code className="text-emerald-700">18.5089° N, 73.8530° E</code>
              </span>
              <span className="text-stone-500 block">
                Scale Photo: <span className="font-mono text-stone-600">scale_capture_01.jpg (DEMO)</span>
              </span>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setExecutingDeal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isExecuting}>
                Record &amp; Confirm Handover
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

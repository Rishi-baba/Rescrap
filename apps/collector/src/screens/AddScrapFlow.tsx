import React, { useState } from 'react';
import { offlineDb, type LocalScrapLot } from '../lib/offline-db.js';
import { processOutbox } from '../lib/sync.js';
import { collectorSession } from '../lib/session.js';
import { useI18n } from '../lib/i18n.js';
import { PriceDisplay } from '@rescrap/design-system';

interface AddScrapFlowProps {
  onCancel: () => void;
  onComplete: (lotId: string) => void;
}

type Step = 'photo' | 'material' | 'weight' | 'review';

export const AddScrapFlow: React.FC<AddScrapFlowProps> = ({ onCancel, onComplete }) => {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('photo');

  // Form State
  const [photoData, setPhotoData] = useState<string>('demo://photo/scrap-captured.jpg');
  const [selectedMaterial, setSelectedMaterial] = useState<{
    id: string;
    name: string;
    category: string;
    ratePaise: number;
    icon: string;
  }>({
    id: 'mat_laptop',
    name: 'Laptop / Computer Scrap',
    category: 'Computing',
    ratePaise: 14000, // ₹140/kg
    icon: '💻',
  });
  const [weightKg, setWeightKg] = useState<number>(12);
  const [condition, setCondition] = useState<'GOOD' | 'FAIR' | 'POOR'>('GOOD');
  const [sourceType, setSourceType] = useState<string>('HOUSEHOLD');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Materials Catalogue with icons
  const materials = [
    { id: 'mat_laptop', name: 'Laptops & PCs', category: 'Computing', ratePaise: 14000, icon: '💻' },
    { id: 'mat_phone', name: 'Smartphones & Mobiles', category: 'Mobile & Telecom', ratePaise: 35000, icon: '📱' },
    { id: 'mat_pcb', name: 'Circuit Boards (PCBs)', category: 'Components', ratePaise: 22000, icon: '🔌' },
    { id: 'mat_copper', name: 'Copper Wire & Cables', category: 'Metals & Wire', ratePaise: 62000, icon: '⚡' },
    { id: 'mat_battery', name: 'Lithium Batteries', category: 'Batteries', ratePaise: 18000, icon: '🔋' },
    { id: 'mat_crt', name: 'Monitors & Screens', category: 'Displays', ratePaise: 8000, icon: '🖥️' },
  ];

  // Valuation Formula calculation
  const conditionMultipliers = { GOOD: 1.0, FAIR: 0.85, POOR: 0.6 };
  const effectiveRate = Math.round(selectedMaterial.ratePaise * conditionMultipliers[condition]);
  const estimatedPaise = Math.round(effectiveRate * weightKg);

  const handleWeightStepper = (delta: number) => {
    setWeightKg((prev) => Math.max(1, prev + delta));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const newLotId = `lot_${Math.random().toString(36).slice(2, 8)}`;
    const idempotencyKey = `create_${newLotId}_${Date.now()}`;

    // 1. Save locally to offline database immediately (FD-06)
    const localLot: LocalScrapLot = {
      id: newLotId,
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      categoryName: selectedMaterial.category,
      declaredWeightKg: weightKg,
      condition,
      sourceType,
      photoDataUrl: photoData,
      estimatedValuePaise: estimatedPaise,
      collectionArea: 'Pune - Hadapsar',
      createdAt: new Date().toISOString(),
      syncStatus: 'SAVED_LOCALLY',
      lifecycleState: 'SUBMITTED',
    };
    offlineDb.saveLot(localLot);

    // 2. Queue in outbox
    offlineDb.enqueue({
      id: `op_${Date.now()}`,
      operation: 'SUBMIT_LOT',
      lotId: newLotId,
      payload: {
        items: [
          {
            materialId: selectedMaterial.id,
            materialConfirmed: true,
            declaredWeightKg: weightKg,
            condition,
            sourceType,
            photoKeys: ['demo://photo/lot-item.jpg'],
          },
        ],
        collectionArea: 'Pune - Hadapsar',
        idempotencyKey,
      },
      idempotencyKey,
    });

    // 3. Trigger sync in background (non-blocking)
    void processOutbox(collectorSession.client);

    setIsSubmitting(false);
    onComplete(newLotId);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between max-w-md mx-auto p-4 pb-20">
      <div>
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
          <button
            type="button"
            onClick={step === 'photo' ? onCancel : () => setStep(step === 'review' ? 'weight' : step === 'weight' ? 'material' : 'photo')}
            className="text-stone-500 font-semibold text-xs flex items-center gap-1"
          >
            <span>&larr; Back</span>
          </button>
          <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">
            Add Scrap &bull; {step.toUpperCase()}
          </span>
          <button type="button" onClick={onCancel} className="text-xs text-stone-400 font-semibold">
            Cancel
          </button>
        </div>

        {/* STEP 1: Photo Capture (A-07) */}
        {step === 'photo' ? (
          <div className="flex flex-col gap-4 text-center">
            <h2 className="text-xl font-extrabold text-stone-900">Take a Photo of the Material</h2>
            <p className="text-xs text-stone-500">
              Clear photos help our assistive engine verify the e-waste category.
            </p>

            <div className="w-full aspect-4/3 rounded-2xl bg-stone-900 text-white flex flex-col items-center justify-center relative overflow-hidden shadow-inner p-4">
              <span className="text-6xl mb-2">📸</span>
              <span className="text-xs text-emerald-300 font-mono">
                {photoData ? 'Photo Ready: captured' : 'Camera Ready (Simulated)'}
              </span>
              <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 px-2 py-0.5 rounded text-stone-300">
                Offline Capable
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setPhotoData(`demo://photo/scrap-${Date.now()}.jpg`);
                setStep('material');
              }}
              className="w-full min-h-[56px] bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-lg rounded-xl shadow-md flex items-center justify-center gap-2 mt-4"
            >
              <span>{t('collector', 'takePhoto') || 'Use Captured Photo'}</span>
              <span>&rarr;</span>
            </button>
          </div>
        ) : null}

        {/* STEP 2: Material Identification (A-08) */}
        {step === 'material' ? (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                  Assistive AI Suggestion &bull; 85% Confidence
                </span>
                <span className="text-xs text-stone-800 font-bold block">
                  Looks like: Laptop / Computer Scrap
                </span>
              </div>
            </div>

            <h2 className="text-base font-bold text-stone-900 mt-1">
              Select or Confirm Material / सामग्री चुनें
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              {materials.map((mat) => {
                const isSelected = selectedMaterial.id === mat.id;
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => setSelectedMaterial(mat)}
                    className={`min-h-[72px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm ring-2 ring-emerald-600'
                        : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{mat.icon}</span>
                      <span className="text-[11px] font-bold text-emerald-800 font-mono">
                        Around ₹{Math.round(mat.ratePaise / 100).toLocaleString('en-IN')}/kg
                      </span>
                    </div>
                    <span className="text-xs font-bold leading-tight mt-1">{mat.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep('weight')}
              className="w-full min-h-[56px] bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-lg rounded-xl shadow-md flex items-center justify-center gap-2 mt-4"
            >
              <span>Confirm Material</span>
              <span>&rarr;</span>
            </button>
          </div>
        ) : null}

        {/* STEP 3: Weight & Condition (A-09) */}
        {step === 'weight' ? (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-stone-900">Estimated Weight</h2>
              <p className="text-xs text-stone-500">Approximate weight. Recycler will weigh officially.</p>
            </div>

            {/* Stepper with Large Numeric Display (40/700 tabular) */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleWeightStepper(-1)}
                className="w-14 h-14 rounded-full bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-2xl font-bold text-stone-800 flex items-center justify-center shadow-xs"
              >
                &minus;
              </button>

              <div className="text-center">
                <span className="text-5xl font-black text-stone-900 font-mono tracking-tight">
                  {weightKg}
                </span>
                <span className="text-lg font-bold text-stone-500 ml-1">kg</span>
              </div>

              <button
                type="button"
                onClick={() => handleWeightStepper(1)}
                className="w-14 h-14 rounded-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-2xl font-bold text-white flex items-center justify-center shadow-xs"
              >
                &#43;
              </button>
            </div>

            {/* Condition Selector */}
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase block mb-2">
                Physical Condition
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['GOOD', 'FAIR', 'POOR'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={`min-h-[48px] py-2 px-3 rounded-xl border text-xs font-bold uppercase transition-all ${
                      condition === c
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Selector */}
            <div className="mt-3">
              <label className="text-xs font-bold text-stone-700 uppercase block mb-2">
                Scrap Source / स्रोत
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'HOUSEHOLD', label: 'Household' },
                  { id: 'COMMERCIAL', label: 'Shop / Retail' },
                  { id: 'INSTITUTIONAL', label: 'Office' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSourceType(s.id)}
                    className={`min-h-[44px] py-1.5 px-2 rounded-xl border text-xs font-semibold transition-all ${
                      sourceType === s.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                        : 'border-stone-200 bg-white text-stone-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep('review')}
              className="w-full min-h-[56px] bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-lg rounded-xl shadow-md flex items-center justify-center gap-2 mt-4"
            >
              <span>Calculate Value</span>
              <span>&rarr;</span>
            </button>
          </div>
        ) : null}

        {/* STEP 4: Review & Valuation (A-10) */}
        {step === 'review' ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-extrabold text-stone-900 text-center">
              Fair Value Review &amp; Estimate
            </h2>

            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col gap-4">
              <div className="text-center py-2 border-b border-stone-100">
                <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block">
                  {t('collector', 'approximateValue') || 'Approximate Value / अनुमानित मूल्य'}
                </span>
                <div className="mt-2 flex justify-center">
                  <PriceDisplay paise={estimatedPaise} isEstimate size="lg" />
                </div>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium inline-block mt-2">
                  Estimate only &bull; Based on Today&apos;s Rates
                </span>
              </div>

              <div className="flex flex-col gap-2 text-xs text-stone-700">
                <div className="flex justify-between">
                  <span className="text-stone-500">Material:</span>
                  <strong>{selectedMaterial.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Weight:</span>
                  <strong>{weightKg} kg</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Reference Rate:</span>
                  <span className="font-mono font-bold">Around ₹{Math.round(selectedMaterial.ratePaise / 100).toLocaleString('en-IN')}/kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Condition Factor:</span>
                  <span>{condition} (x{conditionMultipliers[condition]})</span>
                </div>
                <div className="flex justify-between border-t border-stone-100 pt-2 text-[11px] text-stone-400">
                  <span>Area:</span>
                  <span>Pune - Hadapsar</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full min-h-[56px] bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-lg rounded-xl shadow-lg flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <span>Submitting to local store...</span>
              ) : (
                <>
                  <span>{t('collector', 'submitScrap') || 'Send Scrap / जमा करें'}</span>
                  <span>&rarr;</span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

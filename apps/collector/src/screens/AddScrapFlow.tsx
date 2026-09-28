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
  const [photoData, setPhotoData] = useState<string>('/assets/mat-motherboard.jpg');
  const [selectedMaterial, setSelectedMaterial] = useState<{
    id: string;
    name: string;
    category: string;
    ratePaise: number;
    image: string;
  }>({
    id: 'mat_motherboard',
    name: 'Printed Circuit Boards',
    category: 'Components',
    ratePaise: 24000,
    image: '/assets/mat-motherboard.jpg',
  });
  const [weightKg, setWeightKg] = useState<number>(12);
  const [condition, setCondition] = useState<'GOOD' | 'FAIR' | 'POOR'>('GOOD');
  const [sourceType, setSourceType] = useState<string>('HOUSEHOLD');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Materials Catalogue with authentic photography
  const materials = [
    { id: 'mat_motherboard', name: 'Circuit Boards (PCBs)', category: 'Components', ratePaise: 24000, image: '/assets/mat-motherboard.jpg' },
    { id: 'mat_copper', name: 'Copper Wire & Cables', category: 'Metals & Wire', ratePaise: 65000, image: '/assets/mat-copper.jpg' },
    { id: 'mat_aluminium', name: 'Aluminium Heat Sinks', category: 'Metals', ratePaise: 16000, image: '/assets/mat-aluminium.jpg' },
    { id: 'mat_phones', name: 'Smartphones & Mobiles', category: 'Mobile & Telecom', ratePaise: 11000, image: '/assets/mat-phones.jpg' },
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
    <div className="min-h-screen bg-[#0C1A14] text-stone-100 flex flex-col justify-between max-w-md mx-auto p-4 pb-24">
      <div>
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[#1C3326] pb-3 mb-4">
          <button
            type="button"
            onClick={step === 'photo' ? onCancel : () => setStep(step === 'review' ? 'weight' : step === 'weight' ? 'material' : 'photo')}
            className="text-stone-400 hover:text-stone-200 font-semibold text-xs flex items-center gap-1.5"
          >
            <span>&larr;</span>
            <span>Back</span>
          </button>
          <span className="text-[11px] font-black uppercase text-[#2FBF71] tracking-wider px-2 py-0.5 rounded-full bg-[#183627] border border-[#26533D]">
            Add Scrap &bull; {step.toUpperCase()}
          </span>
          <button type="button" onClick={onCancel} className="text-xs text-stone-400 hover:text-stone-200 font-semibold">
            Cancel
          </button>
        </div>

        {/* STEP 1: Photo Capture (A-07) */}
        {step === 'photo' ? (
          <div className="flex flex-col gap-4 text-center">
            <h2 className="text-xl font-black text-white">Capture Material Photo</h2>
            <p className="text-xs text-stone-400 font-medium">
              Clear photos help our assistive engine identify the e-waste category accurately.
            </p>

            <div className="w-full aspect-4/3 rounded-2xl bg-[#12231B] border-2 border-dashed border-[#234533] flex flex-col items-center justify-center relative overflow-hidden shadow-inner p-2 group">
              <img
                src={photoData}
                alt="Captured scrap preview"
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-3 text-left">
                <span className="text-[10px] uppercase font-bold text-[#4FD68C] tracking-wider bg-black/60 px-2 py-0.5 rounded-full border border-white/10 w-fit">
                  Lens Focus Ready
                </span>
                <div className="flex justify-between items-center text-stone-200 text-xs font-mono">
                  <span>Photo Ready</span>
                  <span className="text-[10px] text-stone-300">Offline Capable</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPhotoData('/assets/mat-motherboard.jpg');
                setStep('material');
              }}
              className="w-full min-h-[56px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:from-[#249E5D] hover:to-[#35CD7C] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.99]"
            >
              <span>{t('collector', 'takePhoto') || 'Use Captured Photo / फोटो चुनें'}</span>
              <span>&rarr;</span>
            </button>
          </div>
        ) : null}

        {/* STEP 2: Material Identification (A-08) */}
        {step === 'material' ? (
          <div className="flex flex-col gap-4">
            <div className="p-3.5 bg-[#14291F] border border-[#234533] rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#183B29] text-[#4FD68C] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#4FD68C] tracking-wider block">
                  AI Classification &bull; 92% Confidence
                </span>
                <span className="text-xs text-white font-bold block mt-0.5">
                  Detected: Circuit Boards (PCBs)
                </span>
              </div>
            </div>

            <h2 className="text-sm font-bold text-white mt-1">
              Confirm Material / सामग्री चुनें
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              {materials.map((mat) => {
                const isSelected = selectedMaterial.id === mat.id;
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => setSelectedMaterial(mat)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2FBF71] bg-[#173124] shadow-md ring-2 ring-[#2FBF71]'
                        : 'border-[#1E3A2B] bg-[#12231B] hover:bg-[#162C21]'
                    }`}
                  >
                    <div className="w-full aspect-4/3 rounded-xl overflow-hidden mb-2 bg-stone-900 border border-[#234533]">
                      <img src={mat.image} alt={mat.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white leading-tight block truncate">
                        {mat.name}
                      </span>
                      <span className="text-[11px] font-extrabold text-[#4FD68C] font-mono mt-0.5 block">
                        Around ₹{Math.round(mat.ratePaise / 100).toLocaleString('en-IN')}/kg
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep('weight')}
              className="w-full min-h-[56px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:from-[#249E5D] hover:to-[#35CD7C] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.99]"
            >
              <span>Confirm Material / पुष्टि करें</span>
              <span>&rarr;</span>
            </button>
          </div>
        ) : null}

        {/* STEP 3: Weight & Condition (A-09) */}
        {step === 'weight' ? (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h2 className="text-xl font-black text-white">Estimated Weight</h2>
              <p className="text-xs text-stone-400 font-medium">Approximate weight. Recycler will weigh officially.</p>
            </div>

            {/* Tactile Stepper with Tabular Numeric Display */}
            <div className="p-6 rounded-2xl bg-[#12231B] border border-[#1E3A2B] shadow-md flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleWeightStepper(-1)}
                className="w-14 h-14 rounded-full bg-[#183627] hover:bg-[#1E4331] active:bg-[#25523C] text-2xl font-black text-white flex items-center justify-center transition-colors border border-[#2B5E43]"
              >
                &minus;
              </button>

              <div className="text-center">
                <span className="text-5xl font-black text-white font-mono tracking-tight">
                  {weightKg}
                </span>
                <span className="text-lg font-bold text-stone-400 ml-1">kg</span>
              </div>

              <button
                type="button"
                onClick={() => handleWeightStepper(1)}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#1E8E53] to-[#2FBF71] active:scale-95 text-2xl font-black text-white flex items-center justify-center shadow-lg transition-transform"
              >
                &#43;
              </button>
            </div>

            {/* Condition Selector */}
            <div>
              <label className="text-xs font-bold text-stone-300 uppercase block mb-2 tracking-wider">
                Physical Condition
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['GOOD', 'FAIR', 'POOR'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={`min-h-[48px] py-2 px-3 rounded-2xl border text-xs font-bold uppercase transition-all ${
                      condition === c
                        ? 'border-[#2FBF71] bg-[#183627] text-[#4FD68C] shadow-sm'
                        : 'border-[#1E3A2B] bg-[#12231B] text-stone-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Selector */}
            <div>
              <label className="text-xs font-bold text-stone-300 uppercase block mb-2 tracking-wider">
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
                    className={`min-h-[44px] py-1.5 px-2 rounded-2xl border text-xs font-semibold transition-all ${
                      sourceType === s.id
                        ? 'border-[#2FBF71] bg-[#183627] text-[#4FD68C] font-bold shadow-sm'
                        : 'border-[#1E3A2B] bg-[#12231B] text-stone-300'
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
              className="w-full min-h-[56px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:from-[#249E5D] hover:to-[#35CD7C] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.99]"
            >
              <span>Calculate Value / मूल्य जांचें</span>
              <span>&rarr;</span>
            </button>
          </div>
        ) : null}

        {/* STEP 4: Review & Valuation (A-10) */}
        {step === 'review' ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-black text-white text-center">
              Fair Value Review &amp; Estimate
            </h2>

            {/* Warm Parchment Review Card */}
            <div className="p-5 rounded-2xl bg-[#F5EFE6] text-stone-900 border border-[#E8DFC8]/90 shadow-xl flex flex-col gap-4">
              <div className="text-center py-2 border-b border-stone-200">
                <span className="text-xs text-stone-600 font-bold uppercase tracking-wider block">
                  {t('collector', 'approximateValue') || 'Approximate Value / अनुमानित मूल्य'}
                </span>
                <div className="mt-2 flex justify-center text-stone-900 font-black">
                  <PriceDisplay paise={estimatedPaise} isEstimate size="lg" />
                </div>
                <span className="text-[10px] text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300 font-semibold inline-block mt-2">
                  Estimate only &bull; Based on Today&apos;s Rates
                </span>
              </div>

              <div className="flex flex-col gap-2.5 text-xs text-stone-800">
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Material:</span>
                  <strong className="text-stone-950">{selectedMaterial.name}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Weight:</span>
                  <strong className="font-mono text-stone-950">{weightKg} kg</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Reference Rate:</span>
                  <span className="font-mono font-bold text-stone-950">
                    Around ₹{Math.round(selectedMaterial.ratePaise / 100).toLocaleString('en-IN')}/kg
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Condition Factor:</span>
                  <span className="font-semibold">{condition} (x{conditionMultipliers[condition]})</span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-2 text-[11px] text-stone-500">
                  <span>Area:</span>
                  <span>Pune - Hadapsar</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full min-h-[56px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:from-[#249E5D] hover:to-[#35CD7C] text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.99]"
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

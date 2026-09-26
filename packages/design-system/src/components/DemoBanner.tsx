import React from 'react';

export interface RealityDeclarations {
  recyclers?: string;
  recyclerAuthorization?: string;
  payments?: string;
  prices?: string;
  materialClassification?: string;
  valuation?: string;
  otpDelivery?: string;
  dataStore?: string;
  [key: string]: string | undefined;
}

export interface DemoBannerProps {
  reality?: RealityDeclarations;
  className?: string;
}

const DEFAULT_LABELS: ReadonlyArray<[keyof RealityDeclarations, string]> = [
  ['recyclers', 'Recyclers'],
  ['prices', 'Prices'],
  ['payments', 'Payments'],
  ['materialClassification', 'Material ID'],
  ['dataStore', 'Storage'],
];

export const DemoBanner: React.FC<DemoBannerProps> = ({ reality, className = '' }) => {
  return (
    <aside
      className={`border-b-2 border-amber-400 bg-amber-50 px-4 py-2 text-amber-950 text-xs ${className}`}
      role="note"
      aria-label="Demo environment notification"
    >
      <div className="flex items-center gap-2">
        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold uppercase tracking-wider text-[10px]">
          Demo
        </span>
        <span className="font-bold tracking-wide uppercase">
          Demonstration Environment &mdash; Not a Live Operation
        </span>
      </div>
      {reality ? (
        <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-stone-700">
          {DEFAULT_LABELS.map(([key, label]) => {
            const val = reality[key];
            if (!val) return null;
            return (
              <div key={key} className="flex gap-1 items-baseline">
                <dt className="font-semibold text-amber-900">{label}:</dt>
                <dd>{val}</dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="mt-1 text-amber-800">
          ReScrap demonstration build. Simulated payments, demo reference prices, and fictional entities.
        </p>
      )}
    </aside>
  );
};

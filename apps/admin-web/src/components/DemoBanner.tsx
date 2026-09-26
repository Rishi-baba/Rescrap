/**
 * The permanent demo banner (rule HON-01).
 *
 * Not dismissible and not a one-time toast. Every recycler in this system is
 * fictional, every price is a demo figure, and no payment is real. An operator
 * must never be able to forget that while looking at a real-looking chart.
 */
import type { RealityMap } from '../lib/api';

const LABELS: ReadonlyArray<[keyof RealityMap, string]> = [
  ['recyclers', 'Recycler partners'],
  ['prices', 'Prices'],
  ['payments', 'Payments'],
  ['materialClassification', 'Material ID'],
  ['dataStore', 'Storage'],
];

export function DemoBanner(props: { reality?: RealityMap }) {
  return (
    <div className="border-b-2 border-amber-400 bg-amber-50 px-4 py-2 text-amber-950">
      <p className="text-xs font-bold tracking-wide uppercase">
        Demo environment &mdash; not a live operation
      </p>
      {props.reality ? (
        <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {LABELS.map(([key, label]) => (
            <div key={key} className="flex gap-1">
              <dt className="font-semibold">{label}:</dt>
              <dd>{props.reality?.[key]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-1 text-xs">ReScrap is a demonstration build.</p>
      )}
    </div>
  );
}

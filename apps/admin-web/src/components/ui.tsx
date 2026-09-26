/**
 * Small UI primitives.
 *
 * Every table that renders demo records is rendered inside a <DemoBoundary>,
 * which refuses to paint unless the payload said `demo: true`. That is the
 * UI half of rule HON-01: the server marks it, the client refuses to hide it.
 */
import type { ReactNode } from 'react';
import { lotStateLabel, lotStateTone, severityTone } from '../lib/format';

export function Card(props: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-stone-900 uppercase">{props.title}</h2>
          {props.subtitle ? <p className="mt-0.5 text-xs text-stone-500">{props.subtitle}</p> : null}
        </div>
        {props.action}
      </header>
      <div className="px-4 py-3">{props.children}</div>
    </section>
  );
}

export function Stat(props: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{props.label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${props.tone ?? 'text-stone-900'}`}>
        {props.value}
      </p>
      {props.hint ? <p className="mt-0.5 text-xs text-stone-500">{props.hint}</p> : null}
    </div>
  );
}

export function Badge(props: { children: ReactNode; tone?: string; title?: string }) {
  return (
    <span
      title={props.title}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${props.tone ?? 'bg-stone-100 text-stone-700'}`}
    >
      {props.children}
    </span>
  );
}

export function LotStatePill(props: { state: string }) {
  return (
    <Badge tone={lotStateTone(props.state)} title={`State code: ${props.state}`}>
      {lotStateLabel(props.state)}
    </Badge>
  );
}

export function SeverityPill(props: { severity: string }) {
  return <Badge tone={severityTone(props.severity)}>{props.severity}</Badge>;
}

/** The demo marker. Shown next to anything derived from fictional data. */
export function DemoTag(props: { label?: string }) {
  return (
    <Badge tone="bg-amber-100 text-amber-900 border border-amber-300" title="Fictional demo data">
      {props.label ?? 'DEMO'}
    </Badge>
  );
}

export function ErrorNotice(props: { error: unknown }) {
  const message =
    props.error instanceof Error ? props.error.message : 'Something went wrong. Please try again.';
  return (
    <div role="alert" className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
      {message}
    </div>
  );
}

export function Empty(props: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-stone-300 px-3 py-6 text-center text-sm text-stone-500">
      {props.children}
    </p>
  );
}

export function Loading(props: { label?: string }) {
  return (
    <p className="px-1 py-6 text-center text-sm text-stone-500" role="status">
      {props.label ?? 'Loading...'}
    </p>
  );
}

export function Table(props: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200">
            {props.head.map((cell) => (
              <th
                key={cell}
                scope="col"
                className="px-2 py-2 text-xs font-semibold tracking-wide text-stone-500 uppercase whitespace-nowrap"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">{props.children}</tbody>
      </table>
    </div>
  );
}

export function Td(props: { children: ReactNode; className?: string }) {
  return <td className={`px-2 py-2 align-top ${props.className ?? ''}`}>{props.children}</td>;
}

/**
 * Refuses to render demo data that the server did not flag as demo.
 * If a future backend serves real records, this is the single place to change.
 */
export function DemoBoundary(props: { isDemo: boolean; children: ReactNode }) {
  if (!props.isDemo) {
    return (
      <div role="alert" className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
        This payload is not marked as demo data. The console refuses to display unmarked records.
      </div>
    );
  }
  return <>{props.children}</>;
}

/**
 * Small UI primitives.
 *
 * Every table that renders demo records is rendered inside a <DemoBoundary>,
 * which refuses to paint unless the payload said `demo: true`. That is the
 * UI half of rule HON-01: the server marks it, the client refuses to hide it.
 */
import type { ReactNode } from 'react';
import { lotStateLabel } from '../lib/format';

export function Card(props: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#1E3A2B] bg-[#12231B] shadow-xl overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1E3A2B] px-5 py-4 bg-[#0C1A14]/60">
        <div>
          <h2 className="text-sm font-bold tracking-wide text-white uppercase font-mono">{props.title}</h2>
          {props.subtitle ? <p className="mt-0.5 text-xs text-stone-400">{props.subtitle}</p> : null}
        </div>
        {props.action}
      </header>
      <div className="p-5">{props.children}</div>
    </section>
  );
}

export function Stat(props: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-[#1E3A2B] bg-[#12231B] px-4 py-3.5 shadow-md">
      <p className="text-[10px] font-mono uppercase tracking-wider text-stone-400">{props.label}</p>
      <p className={`mt-1 text-2xl font-black font-mono tabular-nums ${props.tone ?? 'text-white'}`}>
        {props.value}
      </p>
      {props.hint ? <p className="mt-0.5 text-[11px] text-stone-400">{props.hint}</p> : null}
    </div>
  );
}

export function Badge(props: { children: ReactNode; tone?: string; title?: string }) {
  return (
    <span
      title={props.title}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-medium border border-[#1E3A2B] ${props.tone ?? 'bg-[#0C1A14] text-stone-300'}`}
    >
      {props.children}
    </span>
  );
}

export function LotStatePill(props: { state: string }) {
  return (
    <span
      title={`State code: ${props.state}`}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold bg-[#163324] text-[#4FD68C] border border-[#2FBF71]/30"
    >
      {lotStateLabel(props.state)}
    </span>
  );
}

export function SeverityPill(props: { severity: string }) {
  const isHigh = props.severity.toUpperCase() === 'HIGH' || props.severity.toUpperCase() === 'CRITICAL';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border ${
        isHigh
          ? 'bg-rose-950/40 text-rose-300 border-rose-800/40'
          : 'bg-amber-950/40 text-amber-300 border-amber-600/40'
      }`}
    >
      {props.severity}
    </span>
  );
}

/** The demo marker. Shown next to anything derived from fictional data. */
export function DemoTag(props: { label?: string }) {
  return (
    <span
      title="Fictional demo data"
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/40 text-amber-300 border border-amber-600/40"
    >
      {props.label ?? 'DEMO'}
    </span>
  );
}

export function ErrorNotice(props: { error: unknown }) {
  const message =
    props.error instanceof Error ? props.error.message : 'Something went wrong. Please try again.';
  return (
    <div role="alert" className="rounded-xl border border-rose-800/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-300">
      {message}
    </div>
  );
}

export function Empty(props: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-[#1E3A2B] bg-[#0C1A14]/60 px-4 py-8 text-center text-xs text-stone-400">
      {props.children}
    </p>
  );
}

export function Loading(props: { label?: string }) {
  return (
    <p className="px-2 py-8 text-center text-xs text-stone-400 font-mono" role="status">
      {props.label ?? 'Loading...'}
    </p>
  );
}

export function Table(props: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#1E3A2B] bg-[#12231B]">
      <table className="w-full border-collapse text-left text-sm text-stone-300">
        <thead className="bg-[#0C1A14] border-b border-[#1E3A2B]">
          <tr>
            {props.head.map((cell) => (
              <th
                key={cell}
                scope="col"
                className="px-4 py-3 text-[10px] font-mono font-bold tracking-wider text-stone-400 uppercase whitespace-nowrap"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E3A2B]/60">{props.children}</tbody>
      </table>
    </div>
  );
}

export function Td(props: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 align-top ${props.className ?? ''}`}>{props.children}</td>;
}

/**
 * Refuses to render demo data that the server did not flag as demo.
 * If a future backend serves real records, this is the single place to change.
 */
export function DemoBoundary(props: { isDemo: boolean; children: ReactNode }) {
  if (!props.isDemo) {
    return (
      <div role="alert" className="rounded-xl border border-rose-800/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-300">
        This payload is not marked as demo data. The console refuses to display unmarked records.
      </div>
    );
  }
  return <>{props.children}</>;
}

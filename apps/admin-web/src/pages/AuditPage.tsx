/**
 * Audit trail.
 *
 * Rules AUD-01/AUD-02: append-only and server-owned. This screen only reads.
 * There is deliberately no edit or delete affordance anywhere in this file,
 * because the record is not the console's to change.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuditEvent } from '@rescrap/shared';
import { session } from '../lib/session';
import { formatDateTime } from '../lib/format';
import {
  Card,
  DemoBoundary,
  DemoTag,
  Empty,
  ErrorNotice,
  Loading,
  Td,
  Table,
} from '../components/ui';

function roleTone(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-[#163324] text-[#4FD68C] border-[#2FBF71]/30';
    case 'RECYCLER':
      return 'bg-amber-950/40 text-amber-300 border-amber-600/40';
    case 'COLLECTOR':
      return 'bg-sky-950/40 text-sky-300 border-sky-600/40';
    default:
      return 'bg-[#0C1A14] text-stone-300 border-[#1E3A2B]';
  }
}

export function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [actorFilter, setActorFilter] = useState('all');
  const [expanded, setExpanded] = useState<AuditEvent | null>(null);

  const load = useCallback(async () => {
    try {
      const envelope = await session.client.auditEvents();
      setEvents(envelope.data);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!events) {
      return [];
    }
    const ordered = [...events].sort((a, b) => b.at.localeCompare(a.at));
    return actorFilter === 'all' ? ordered : ordered.filter((event) => event.actorRole === actorFilter);
  }, [events, actorFilter]);

  if (error && !events) {
    return <ErrorNotice error={error} />;
  }
  if (!events) {
    return <Loading label="Loading audit trail..." />;
  }

  return (
    <DemoBoundary isDemo={events.every((event) => event.demo)}>
      <div className="flex flex-col gap-4 text-[#F5EFE6]">
        {error ? <ErrorNotice error={error} /> : null}

        <Card
          title="Audit trail"
          subtitle="Append-only. Entries cannot be edited or removed, by this console or any API caller."
          action={<DemoTag label="READ ONLY" />}
        >
          <div className="mb-4 flex flex-wrap gap-1.5">
            {['all', 'ADMIN', 'RECYCLER', 'COLLECTOR', 'SYSTEM'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActorFilter(option)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border ${
                  actorFilter === option
                    ? 'bg-[#1E8E53] text-[#07130D] border-[#2FBF71] font-bold shadow-md'
                    : 'border-[#1E3A2B] bg-[#0C1A14] text-stone-400 hover:text-white hover:bg-[#163324]'
                }`}
              >
                {option === 'all' ? 'All actors' : option}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <Empty>No audit entries yet. Perform an action to see one recorded.</Empty>
          ) : (
            <Table head={['When', 'Actor', 'Action', 'Target', 'Reason', '']}>
              {visible.map((event) => (
                <tr key={event.id} className="hover:bg-[#163324]/40 transition-colors">
                  <Td className="text-xs whitespace-nowrap text-stone-400 font-mono">
                    {formatDateTime(event.at)}
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${roleTone(event.actorRole)}`}>
                      {event.actorRole}
                    </span>
                    <p className="mt-0.5 font-mono text-[10px] text-stone-500">{event.actorUserId}</p>
                  </Td>
                  <Td className="font-mono text-xs font-bold text-white">{event.action}</Td>
                  <Td className="text-xs text-stone-300">
                    <span className="text-stone-500 font-mono">{event.targetType}</span>{' '}
                    <span className="font-mono text-[#4FD68C]">{event.targetId}</span>
                  </Td>
                  <Td className="max-w-md text-xs text-stone-300">
                    <span className="line-clamp-2">{event.reason ?? '-'}</span>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setExpanded(event)}
                      className="text-xs font-semibold text-[#4FD68C] hover:text-white transition-colors"
                    >
                      Detail &rarr;
                    </button>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        {expanded ? (
          <Card
            title="Audit entry detail"
            subtitle={expanded.id}
            action={
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="text-xs font-semibold text-stone-400 hover:text-white transition-colors"
              >
                Close &times;
              </button>
            }
          >
            <dl className="grid grid-cols-1 gap-y-2 text-xs sm:grid-cols-2 bg-[#0C1A14] p-4 rounded-2xl border border-[#1E3A2B]">
              <div>
                <dt className="font-mono uppercase text-[10px] text-stone-400">Action</dt>
                <dd className="font-mono text-white font-bold">{expanded.action}</dd>
              </div>
              <div>
                <dt className="font-mono uppercase text-[10px] text-stone-400">Actor</dt>
                <dd className="text-stone-200">
                  {expanded.actorRole} &middot; <span className="font-mono text-[#4FD68C]">{expanded.actorUserId}</span>
                </dd>
              </div>
              <div>
                <dt className="font-mono uppercase text-[10px] text-stone-400">Target</dt>
                <dd className="font-mono text-stone-200">
                  {expanded.targetType}/{expanded.targetId}
                </dd>
              </div>
              <div>
                <dt className="font-mono uppercase text-[10px] text-stone-400">Timestamp</dt>
                <dd className="text-stone-300 font-mono">{formatDateTime(expanded.at)}</dd>
              </div>
            </dl>
            {expanded.reason ? (
              <div className="mt-3">
                <p className="text-[10px] font-mono uppercase text-stone-400 mb-1">Reason recorded</p>
                <p className="rounded-xl border border-[#1E3A2B] bg-[#0C1A14] p-3 text-xs text-white">
                  {expanded.reason}
                </p>
              </div>
            ) : null}
            {expanded.before || expanded.after ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {expanded.before ? (
                  <div>
                    <p className="text-[10px] font-mono uppercase text-stone-400 mb-1">Before</p>
                    <pre className="overflow-x-auto rounded-xl border border-[#1E3A2B] bg-[#0C1A14] p-3 text-[11px] font-mono text-stone-300">
                      {expanded.before}
                    </pre>
                  </div>
                ) : null}
                {expanded.after ? (
                  <div>
                    <p className="text-[10px] font-mono uppercase text-stone-400 mb-1">After</p>
                    <pre className="overflow-x-auto rounded-xl border border-[#1E3A2B] bg-[#0C1A14] p-3 text-[11px] font-mono text-[#4FD68C]">
                      {expanded.after}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </DemoBoundary>
  );
}

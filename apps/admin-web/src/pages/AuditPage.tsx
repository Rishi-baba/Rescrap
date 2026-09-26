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
  Badge,
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
      return 'bg-violet-100 text-violet-900';
    case 'RECYCLER':
      return 'bg-amber-100 text-amber-900';
    case 'COLLECTOR':
      return 'bg-sky-100 text-sky-900';
    default:
      return 'bg-stone-100 text-stone-700';
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
      <div className="flex flex-col gap-3">
        {error ? <ErrorNotice error={error} /> : null}

        <Card
          title="Audit trail"
          subtitle="Append-only. Entries cannot be edited or removed, by this console or any API caller."
          action={<DemoTag label="READ ONLY" />}
        >
          <div className="mb-3 flex flex-wrap gap-1">
            {['all', 'ADMIN', 'RECYCLER', 'COLLECTOR', 'SYSTEM'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActorFilter(option)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  actorFilter === option
                    ? 'bg-stone-900 text-white'
                    : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
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
                <tr key={event.id} className="hover:bg-stone-50">
                  <Td className="text-xs whitespace-nowrap text-stone-600">
                    {formatDateTime(event.at)}
                  </Td>
                  <Td>
                    <Badge tone={roleTone(event.actorRole)}>{event.actorRole}</Badge>
                    <p className="mt-0.5 font-mono text-[11px] text-stone-500">{event.actorUserId}</p>
                  </Td>
                  <Td className="font-mono text-xs text-stone-800">{event.action}</Td>
                  <Td className="text-xs text-stone-600">
                    <span className="text-stone-400">{event.targetType}</span>{' '}
                    <span className="font-mono">{event.targetId}</span>
                  </Td>
                  <Td className="max-w-md text-xs text-stone-700">
                    <span className="line-clamp-2">{event.reason ?? '-'}</span>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setExpanded(event)}
                      className="text-xs text-stone-600 underline"
                    >
                      Detail
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
                className="text-xs text-stone-600 underline"
              >
                Close
              </button>
            }
          >
            <dl className="grid grid-cols-1 gap-y-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-medium text-stone-600">Action</dt>
                <dd className="font-mono text-stone-900">{expanded.action}</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-600">Actor</dt>
                <dd className="text-stone-900">
                  {expanded.actorRole} &middot; <span className="font-mono">{expanded.actorUserId}</span>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-stone-600">Target</dt>
                <dd className="font-mono text-stone-900">
                  {expanded.targetType}/{expanded.targetId}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-stone-600">Timestamp</dt>
                <dd className="text-stone-900">{formatDateTime(expanded.at)}</dd>
              </div>
            </dl>
            {expanded.reason ? (
              <div className="mt-3">
                <p className="text-xs font-medium text-stone-600">Reason recorded</p>
                <p className="mt-1 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">
                  {expanded.reason}
                </p>
              </div>
            ) : null}
            {expanded.before || expanded.after ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {expanded.before ? (
                  <div>
                    <p className="text-xs font-medium text-stone-600">Before</p>
                    <pre className="mt-1 overflow-x-auto rounded-md border border-stone-200 bg-stone-50 p-2 text-[11px] text-stone-700">
                      {expanded.before}
                    </pre>
                  </div>
                ) : null}
                {expanded.after ? (
                  <div>
                    <p className="text-xs font-medium text-stone-600">After</p>
                    <pre className="mt-1 overflow-x-auto rounded-md border border-stone-200 bg-stone-50 p-2 text-[11px] text-stone-700">
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

/**
 * Recycler verification queue.
 *
 * Rules INV-01/HON-01 and AUD-04:
 *   - every recycler shown is fictional and says so, in the row
 *   - a decision cannot be submitted without a reason
 *   - the reason is written to the append-only audit log by the server
 */
import { useCallback, useEffect, useState } from 'react';
import type { Recycler } from '@rescrap/shared';
import { session } from '../lib/session';
import { formatDate } from '../lib/format';
import {
  Badge,
  Card,
  DemoBoundary,
  DemoTag,
  Empty,
  ErrorNotice,
  Loading,
} from '../components/ui';

export function VerificationPage() {
  const [queue, setQueue] = useState<Recycler[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const envelope = await session.client.pendingVerification();
      setQueue(envelope.data);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(recycler: Recycler, decision: 'APPROVE' | 'REJECT') {
    const reason = (reasons[recycler.id] ?? '').trim();
    if (reason.length === 0) {
      // AUD-04: a decision without a reason is not submittable.
      setError(new Error(`A reason is required to ${decision.toLowerCase()} ${recycler.businessName}.`));
      return;
    }
    setBusyId(recycler.id);
    setError(null);
    setNotice(null);
    try {
      await session.client.decideVerification(recycler.id, decision, reason);
      setNotice(
        `${recycler.businessName} ${decision === 'APPROVE' ? 'verified' : 'rejected'}. The decision and your reason are now in the audit log.`,
      );
      setReasons((current) => ({ ...current, [recycler.id]: '' }));
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusyId(null);
    }
  }

  if (error && !queue) {
    return <ErrorNotice error={error} />;
  }
  if (!queue) {
    return <Loading label="Loading verification queue..." />;
  }

  return (
    <DemoBoundary isDemo>
      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <strong>No recycler authorization is real.</strong> These partners are seeded demo records
          used to exercise the review workflow. Approving one does not grant any legal permission to
          handle e-waste.
        </div>

        {notice ? (
          <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {notice}
          </p>
        ) : null}
        {error ? <ErrorNotice error={error} /> : null}

        <Card
          title="Awaiting verification"
          subtitle={`${queue.length} recycler${queue.length === 1 ? '' : 's'} in the queue`}
          action={<DemoTag label="FICTIONAL PARTNERS" />}
        >
          {queue.length === 0 ? (
            <Empty>Nothing is waiting for a decision.</Empty>
          ) : (
            <div className="flex flex-col gap-4">
              {queue.map((recycler) => (
                <article key={recycler.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">{recycler.businessName}</h3>
                      <p className="mt-0.5 text-xs text-stone-500">
                        <span className="font-mono">{recycler.id}</span> &middot; applied{' '}
                        {formatDate(recycler.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Badge tone="bg-amber-100 text-amber-900">{recycler.authorizationStatus}</Badge>
                      {recycler.authorizationIsDemo ? <DemoTag /> : null}
                    </div>
                  </div>

                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-stone-600 sm:grid-cols-2">
                    <div className="flex gap-1">
                      <dt className="font-medium">Service areas:</dt>
                      <dd>{recycler.serviceAreas.join(', ') || 'Not stated'}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-medium">Pickup available:</dt>
                      <dd>{recycler.pickupAvailable ? 'Yes' : 'No'}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-medium">Accepts categories:</dt>
                      <dd>{recycler.acceptedCategoryIds.length}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-medium">Note on file:</dt>
                      <dd>{recycler.verificationNote ?? 'None'}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <label
                      className="block text-xs font-medium text-stone-700"
                      htmlFor={`reason-${recycler.id}`}
                    >
                      Decision reason (required, recorded in the audit log)
                    </label>
                    <textarea
                      id={`reason-${recycler.id}`}
                      value={reasons[recycler.id] ?? ''}
                      onChange={(event) =>
                        setReasons((current) => ({ ...current, [recycler.id]: event.target.value }))
                      }
                      rows={2}
                      placeholder="e.g. Reviewed seeded demo documents; operating area matches the service pin."
                      className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === recycler.id}
                        onClick={() => void decide(recycler, 'APPROVE')}
                        className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === recycler.id}
                        onClick={() => void decide(recycler, 'REJECT')}
                        className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DemoBoundary>
  );
}

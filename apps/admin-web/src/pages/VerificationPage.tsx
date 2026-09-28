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
      <div className="flex flex-col gap-4 text-[#F5EFE6]">
        <div className="rounded-2xl border border-amber-600/40 bg-amber-950/40 p-4 text-xs text-amber-300">
          <strong className="text-amber-200">Regulatory Disclaimer:</strong> No recycler authorization here is real.
          These partners are seeded demo records used to exercise the review workflow. Approving one does not grant any legal permission to handle e-waste.
        </div>

        {notice ? (
          <p role="status" className="rounded-xl border border-[#2FBF71]/40 bg-[#163324] px-4 py-2.5 text-xs text-[#4FD68C] font-medium">
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
                <article key={recycler.id} className="rounded-2xl border border-[#1E3A2B] bg-[#0C1A14] p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">{recycler.businessName}</h3>
                      <p className="mt-0.5 text-xs text-stone-400 font-mono">
                        <span>{recycler.id}</span> &middot; applied {formatDate(recycler.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/50 text-amber-300 border border-amber-600/40">
                        {recycler.authorizationStatus}
                      </span>
                      {recycler.authorizationIsDemo ? <DemoTag /> : null}
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs text-stone-300 sm:grid-cols-2 bg-[#12231B] p-3 rounded-xl border border-[#1E3A2B]">
                    <div className="flex gap-1.5">
                      <dt className="text-stone-400 font-mono text-[11px]">Service areas:</dt>
                      <dd className="font-semibold text-white">{recycler.serviceAreas.join(', ') || 'Not stated'}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-stone-400 font-mono text-[11px]">Pickup available:</dt>
                      <dd className="font-semibold text-white">{recycler.pickupAvailable ? 'Yes' : 'No'}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-stone-400 font-mono text-[11px]">Accepts categories:</dt>
                      <dd className="font-semibold text-white">{recycler.acceptedCategoryIds.length}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-stone-400 font-mono text-[11px]">Note on file:</dt>
                      <dd className="text-stone-300">{recycler.verificationNote ?? 'None'}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 border-t border-[#1E3A2B] pt-3">
                    <label
                      className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1"
                      htmlFor={`reason-${recycler.id}`}
                    >
                      Decision Reason (Required, recorded in append-only audit log)
                    </label>
                    <textarea
                      id={`reason-${recycler.id}`}
                      value={reasons[recycler.id] ?? ''}
                      onChange={(event) =>
                        setReasons((current) => ({ ...current, [recycler.id]: event.target.value }))
                      }
                      rows={2}
                      placeholder="e.g. Reviewed seeded demo documents; operating area matches the service pin."
                      className="w-full rounded-xl border border-[#1E3A2B] bg-[#12231B] p-3 text-xs text-white placeholder-stone-500 focus:border-[#2FBF71] focus:ring-1 focus:ring-[#2FBF71] focus:outline-none"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === recycler.id}
                        onClick={() => void decide(recycler, 'APPROVE')}
                        className="rounded-xl bg-[#1E8E53] hover:bg-[#2FBF71] active:brightness-95 px-4 py-2 text-xs font-extrabold text-[#07130D] transition-colors disabled:opacity-50"
                      >
                        Approve Facility
                      </button>
                      <button
                        type="button"
                        disabled={busyId === recycler.id}
                        onClick={() => void decide(recycler, 'REJECT')}
                        className="rounded-xl border border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/60 px-4 py-2 text-xs font-bold text-rose-300 transition-colors disabled:opacity-50"
                      >
                        Reject Application
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

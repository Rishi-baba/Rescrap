import React, { useEffect, useState } from 'react';
import { Card, StatusPill, Button, LoadingState, ErrorState, PriceDisplay } from '@rescrap/design-system';
import { recyclerSession } from '../lib/session.js';
import type { RecyclerTransactionItem } from '../lib/api.js';

export const TransactionsPage: React.FC = () => {
  const [txns, setTxns] = useState<readonly RecyclerTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTxns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await recyclerSession.client.listTransactions();
      setTxns(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load completed transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTxns();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Transaction History &amp; Traceability</h2>
          <p className="text-xs text-stone-500">
            Immutable records of finalized custody transfers, simulated payouts and ESG compliance hashes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTxns}>
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading immutable transaction ledger..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadTxns} />
      ) : txns.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm font-semibold text-stone-700">No completed transactions yet.</p>
          <p className="text-xs text-stone-500 mt-1">
            Completed handovers with verified collector sign-off will record here permanently.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm text-stone-700 divide-y divide-stone-200">
            <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-500 tracking-wider">
              <tr>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Lot ID</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Reconciled Weight</th>
                <th className="px-4 py-3 text-right">Settled Value</th>
                <th className="px-4 py-3">Settlement</th>
                <th className="px-4 py-3">Traceability Hash</th>
                <th className="px-4 py-3">Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {txns.map((txn) => (
                <tr key={txn.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">{txn.id}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-700">{txn.lotId}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{txn.materialName}</td>
                  <td className="px-4 py-3 font-medium text-stone-800 tabular-nums">
                    {txn.finalWeightKg} kg
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PriceDisplay paise={txn.finalAmountPaise} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusPill status="success" label="CONFIRMED" />
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                        SIMULATED
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-emerald-800 truncate max-w-[140px]" title={txn.traceabilityHash}>
                    {txn.traceabilityHash}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {new Date(txn.completedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

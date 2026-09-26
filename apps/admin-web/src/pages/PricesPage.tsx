/**
 * Price management.
 *
 * Rules PRICE-01/05 and HON-01:
 *   - every price record carries the source it came from, and the source is
 *     required, not optional
 *   - stale prices are flagged rather than silently used
 *   - nothing on this screen is a real market rate
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Locale, Material, PriceBoardRow } from '@rescrap/shared';
import { session } from '../lib/session';
import { formatDate, formatMoney } from '../lib/format';
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

/** Localised labels are stored per locale; the console reads the English one. */
function labelOf(label: Record<Locale, string>): string {
  return label.en ?? Object.values(label)[0] ?? '-';
}

export function PricesPage() {
  const [board, setBoard] = useState<PriceBoardRow[] | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    materialId: '',
    area: 'Pune - Hadapsar',
    rupees: '',
    effectiveFrom: new Date().toISOString(),
    sourceLabel: '',
  });

  const load = useCallback(async () => {
    try {
      const [boardEnvelope, materialEnvelope] = await Promise.all([
        session.client.priceBoard(),
        session.client.request<Material[]>('/materials'),
      ]);
      setBoard(boardEnvelope.data);
      setMaterials(materialEnvelope.data);
      setForm((current) => ({
        ...current,
        materialId: current.materialId || materialEnvelope.data[0]?.id || '',
      }));
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // The form collects rupees for operator sanity; the API takes paise.
      // This is the only place that conversion happens, and it is explicit.
      const rupees = Number.parseFloat(form.rupees);
      if (!Number.isFinite(rupees) || rupees <= 0) {
        throw new Error('Enter a price per kilogram greater than zero.');
      }
      const result = await session.client.recordPrice({
        materialId: form.materialId,
        area: form.area.trim(),
        buyingPricePerKg: Math.round(rupees * 100),
        effectiveFrom: new Date(form.effectiveFrom).toISOString(),
        sourceLabel: form.sourceLabel.trim(),
      });
      setNotice(
        `Recorded ${formatMoney(result.data.buyingPricePerKg)} per kg for ${labelOf(
          materials.find((material) => material.id === form.materialId)?.label ?? {
            en: form.materialId,
            hi: form.materialId,
            mr: form.materialId,
          },
        )}, source "${result.data.sourceLabel}".`,
      );
      setForm((current) => ({ ...current, rupees: '', sourceLabel: '' }));
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (error && !board) {
    return <ErrorNotice error={error} />;
  }
  if (!board) {
    return <Loading label="Loading price board..." />;
  }

  return (
    <DemoBoundary isDemo={board.every((row) => row.demo)}>
      <div className="flex flex-col gap-3">
        {notice ? (
          <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {notice}
          </p>
        ) : null}
        {error ? <ErrorNotice error={error} /> : null}

        <Card
          title="Price board"
          subtitle="Buying price per kilogram. These are seeded demo figures, not market rates."
          action={<DemoTag label="DEMO PRICES" />}
        >
          {board.length === 0 ? (
            <Empty>No price records yet.</Empty>
          ) : (
            <Table head={['Material', 'Category id', 'Buying price / kg', 'Effective from', 'Source', 'State', 'Hazards']}>
              {board.map((row) => (
                <tr key={`${row.materialId}-${row.effectiveFrom}`} className="hover:bg-stone-50">
                  <Td>
                    <span className="text-sm text-stone-900">
                      <span aria-hidden="true" className="mr-1">
                        {row.materialIcon}
                      </span>
                      {labelOf(row.materialLabel)}
                    </span>
                    <p className="mt-0.5 font-mono text-[11px] text-stone-500">{row.materialId}</p>
                  </Td>
                  <Td className="font-mono text-xs text-stone-600">{row.materialId.split('_')[1]}</Td>
                  <Td className="font-medium tabular-nums text-stone-900">
                    {formatMoney(row.buyingPricePerKg)}
                  </Td>
                  <Td className="text-xs whitespace-nowrap text-stone-600">
                    {formatDate(row.effectiveFrom)}
                  </Td>
                  <Td className="text-xs text-stone-600">Seeded demo baseline</Td>
                  <Td>
                    {row.stale ? (
                      <Badge tone="bg-rose-100 text-rose-900" title="Older than the staleness window">
                        Stale
                      </Badge>
                    ) : (
                      <Badge tone="bg-emerald-100 text-emerald-900">Current</Badge>
                    )}
                  </Td>
                  <Td>
                    {row.hazardFlags.length === 0 ? (
                      <span className="text-xs text-stone-400">-</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.hazardFlags.map((flag) => (
                          <Badge key={flag} tone="bg-amber-100 text-amber-900" title="Safe handling required">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card
          title="Record a price"
          subtitle="A source is mandatory (PRICE-05). A price with no origin is not a price."
        >
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-stone-700">
              <span className="font-medium">Material</span>
              <select
                value={form.materialId}
                onChange={(event) => setForm({ ...form, materialId: event.target.value })}
                required
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              >
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {labelOf(material.label)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-stone-700">
              <span className="font-medium">Area</span>
              <input
                value={form.area}
                onChange={(event) => setForm({ ...form, area: event.target.value })}
                required
                className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </label>

            <label className="block text-sm text-stone-700">
              <span className="font-medium">Buying price per kg (INR)</span>
              <input
                value={form.rupees}
                onChange={(event) => setForm({ ...form, rupees: event.target.value })}
                inputMode="decimal"
                placeholder="e.g. 42.50"
                required
                className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </label>

            <label className="block text-sm text-stone-700">
              <span className="font-medium">Effective from</span>
              <input
                type="datetime-local"
                value={form.effectiveFrom.slice(0, 16)}
                onChange={(event) =>
                  setForm({ ...form, effectiveFrom: new Date(event.target.value).toISOString() })
                }
                required
                className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </label>

            <label className="block text-sm text-stone-700 sm:col-span-2">
              <span className="font-medium">Source (required)</span>
              <input
                value={form.sourceLabel}
                onChange={(event) => setForm({ ...form, sourceLabel: event.target.value })}
                placeholder="Where this number came from"
                required
                minLength={2}
                className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {busy ? 'Recording...' : 'Record price'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </DemoBoundary>
  );
}

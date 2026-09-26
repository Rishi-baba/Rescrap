/**
 * Exceptions: anomaly flags and AI output records.
 *
 * The predictions panel is the most misreadable screen in any dashboard, so
 * the limits sit in the same place as the numbers (rules AI-01/AI-02): these
 * are seeded, rule-derived outputs, and every one carries the method and
 * confidence that produced it. No model accuracy claim appears anywhere.
 */
import { useEffect, useState } from 'react';
import type { AiPrediction } from '@rescrap/shared';
import { session } from '../lib/session';
import { formatDateTime } from '../lib/format';
import {
  Card,
  DemoBoundary,
  DemoTag,
  Empty,
  ErrorNotice,
  Loading,
  SeverityPill,
  Stat,
  Td,
  Table,
} from '../components/ui';

interface AnomalyFlag {
  lotId?: string;
  code: string;
  severity: string;
  message: string;
}

function confidenceTone(confidence: number): string {
  if (confidence >= 0.8) {
    return 'bg-emerald-100 text-emerald-900';
  }
  if (confidence >= 0.5) {
    return 'bg-amber-100 text-amber-900';
  }
  return 'bg-rose-100 text-rose-900';
}

export function ExceptionsPage() {
  const [flags, setFlags] = useState<AnomalyFlag[] | null>(null);
  const [predictions, setPredictions] = useState<AiPrediction[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let live = true;
    Promise.all([
      session.client.anomalies(),
      session.client.request<AiPrediction[]>('/admin/ai-predictions'),
    ])
      .then(([flagEnvelope, predictionEnvelope]) => {
        if (live) {
          setFlags(flagEnvelope.data);
          setPredictions(predictionEnvelope.data);
        }
      })
      .catch((err: unknown) => {
        if (live) {
          setError(err);
        }
      });
    return () => {
      live = false;
    };
  }, []);

  if (error && !flags) {
    return <ErrorNotice error={error} />;
  }
  if (!flags || !predictions) {
    return <Loading label="Loading exceptions..." />;
  }

  const high = flags.filter(
    (flag) => flag.severity.toUpperCase() === 'HIGH' || flag.severity.toUpperCase() === 'CRITICAL',
  ).length;
  const corrected = predictions.filter((prediction) => prediction.correctedAt).length;
  const modelBacked = predictions.filter((prediction) => prediction.method === 'model').length;

  return (
    <div className="flex flex-col gap-3">
      {error ? <ErrorNotice error={error} /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total flags" value={String(flags.length)} />
        <Stat label="High severity" value={String(high)} tone={high > 0 ? 'text-rose-700' : 'text-stone-900'} />
        <Stat
          label="AI outputs logged"
          value={String(predictions.length)}
          hint={`${corrected} corrected by a human`}
        />
        <Stat
          label="Model-backed outputs"
          value={String(modelBacked)}
          hint={modelBacked === 0 ? 'All outputs are rule-derived' : 'A trained model is in use'}
        />
      </div>

      <Card
        title="Anomaly flags"
        subtitle="Raised by the rule engine. A flag draws attention; it does not silently change a lot's state."
        action={<DemoTag label="RULE ENGINE" />}
      >
        {flags.length === 0 ? (
          <Empty>No anomalies detected in the current data.</Empty>
        ) : (
          <Table head={['Severity', 'Code', 'Lot', 'Explanation']}>
            {flags.map((flag) => (
              <tr key={`${flag.lotId}-${flag.code}`} className="hover:bg-stone-50">
                <Td>
                  <SeverityPill severity={flag.severity} />
                </Td>
                <Td className="font-mono text-xs text-stone-800">{flag.code}</Td>
                <Td className="font-mono text-xs text-stone-700">{flag.lotId ?? '-'}</Td>
                <Td className="text-sm text-stone-700">{flag.message}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card
        title="AI output log"
        subtitle="Every automated suggestion the system made, with the method that produced it."
        action={<DemoTag label="RULE DERIVED" />}
      >
        <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <strong>No trained model is running in this build.</strong> Each row shows the capability,
          the method that produced it, and the confidence the system assigned. Confidence is
          reported, never invented, and no accuracy claim is made.
        </p>
        {predictions.length === 0 ? (
          <Empty>No automated outputs have been recorded yet.</Empty>
        ) : (
          <Table head={['Capability', 'Method', 'Result', 'Confidence', 'Applied to', 'Corrected', 'When']}>
            {predictions.map((prediction) => (
              <tr key={prediction.id} className="hover:bg-stone-50">
                <Td className="text-xs text-stone-800">{prediction.capability.replace(/_/g, ' ')}</Td>
                <Td>
                  <DemoTag label={prediction.method.toUpperCase()} />
                  {prediction.modelVersion ? (
                    <p className="mt-0.5 font-mono text-[11px] text-stone-500">{prediction.modelVersion}</p>
                  ) : null}
                </Td>
                <Td className="text-sm text-stone-700">{prediction.result}</Td>
                <Td>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${confidenceTone(prediction.confidence)}`}
                  >
                    {(prediction.confidence * 100).toFixed(0)}%
                  </span>
                </Td>
                <Td className="font-mono text-[11px] text-stone-600">
                  {prediction.lotId ?? prediction.lotItemId ?? '-'}
                </Td>
                <Td className="text-xs text-stone-600">
                  {prediction.correctedAt ? (
                    <span className="text-amber-800">Yes, by a human</span>
                  ) : (
                    <span className="text-stone-400">Not corrected</span>
                  )}
                </Td>
                <Td className="text-xs whitespace-nowrap text-stone-500">
                  {formatDateTime(prediction.createdAt)}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <DemoBoundary isDemo={predictions.every((prediction) => prediction.demo)}>
        <p className="text-xs text-stone-500">
          This screen reports what the system did, so an operator can audit it. It does not
          forecast demand: no demand model exists in this build.
        </p>
      </DemoBoundary>
    </div>
  );
}

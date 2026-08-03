import { DISEASE_LABELS } from "@/types";
import type { PredictionMap } from "@/types";
import { getSeverity } from "@/utils/disease";
import { SeverityBadge } from "@/components/severity-badge";
import { ProbabilityBar } from "@/components/probability-bar";

interface PredictionTableProps {
  predictions: PredictionMap;
  threshold?: number;
}

export function PredictionTable({ predictions, threshold = 0.5 }: PredictionTableProps) {
  const sorted = [...DISEASE_LABELS].sort((a, b) => (predictions[b] ?? 0) - (predictions[a] ?? 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">AI disease probability breakdown</caption>
        <thead className="text-slate-600">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">
              Finding
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Confidence
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Severity
            </th>
            <th scope="col" className="py-2 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((disease) => {
            const probability = predictions[disease] ?? 0;
            const isPositive = probability >= threshold;
            return (
              <tr key={disease}>
                <td className="py-3 pr-4 font-medium text-slate-900">{disease}</td>
                <td className="w-48 py-3 pr-4">
                  <ProbabilityBar label="" value={probability} threshold={threshold} />
                </td>
                <td className="py-3 pr-4">
                  <SeverityBadge severity={getSeverity(probability)} />
                </td>
                <td className="py-3">
                  <span className={isPositive ? "font-medium text-red-600" : "text-slate-500"}>
                    {isPositive ? "Detected" : "Not detected"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

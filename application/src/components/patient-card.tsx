import Link from "next/link";
import { ChevronRight, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getInitials, formatDate } from "@/utils/disease";

interface PatientCardProps {
  id: string;
  name: string;
  patientId: string;
  age: number;
  gender: string;
  phone: string;
  scanCount: number;
  createdAt: string | Date;
}

export function PatientCard({ id, name, patientId, age, gender, phone, scanCount, createdAt }: PatientCardProps) {
  return (
    <Link href={`/dashboard/patients/${id}`}>
      <Card className="flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700">
              {getInitials(name)}
            </div>
            <div>
              <p className="font-medium text-slate-900">{name}</p>
              <p className="text-xs text-slate-500">ID: {patientId.slice(0, 8)}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {scanCount} scan{scanCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <span>
            {age}y &middot; {gender}
          </span>
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> {phone}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>Added {formatDate(createdAt)}</span>
          <span className="inline-flex items-center gap-1 font-medium text-blue-600">
            View details <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Card>
    </Link>
  );
}

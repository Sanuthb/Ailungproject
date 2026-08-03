import Link from "next/link";
import { Download, FileText, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/utils/disease";

interface ReportCardProps {
  patientName: string;
  patientCode: string;
  doctorName: string;
  createdAt: string | Date;
  pdfPath: string;
}

export function ReportCard({ patientName, patientCode, doctorName, createdAt, pdfPath }: ReportCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-slate-900">{patientName}</p>
          <p className="text-xs text-slate-500">
            ID: {patientCode.slice(0, 8)} &middot; Generated {formatDateTime(createdAt)}
          </p>
          <p className="text-xs text-slate-500">Reviewing doctor: {doctorName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href={pdfPath} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" /> View
          </Button>
        </Link>
        <a href={pdfPath} download>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Download
          </Button>
        </a>
      </div>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReportCard } from "@/components/report-card";
import { TableSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
import { FileText, Search } from "lucide-react";
import type { PaginationInfo } from "@/types";

interface ReportListItem {
  id: string;
  pdfPath: string;
  createdAt: string;
  doctor: { name: string };
  scan: { patient: { name: string; patientId: string } };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load reports");
      const data = await res.json();
      setReports(data.reports || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Search, view, and download AI-assisted diagnostic reports."
      />

      <Card>
        <div className="border-b border-slate-200 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search reports by patient or doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <CardContent className="space-y-4 p-6">
          {error ? (
            <ErrorState message={error} retry={fetchReports} />
          ) : isLoading ? (
            <TableSkeleton rows={5} />
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No reports found"
              description={
                debouncedSearch
                  ? "We couldn't find any reports matching your search."
                  : "Reports you generate from AI predictions will appear here."
              }
            />
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  patientName={report.scan.patient.name}
                  patientCode={report.scan.patient.patientId}
                  doctorName={report.doctor.name}
                  createdAt={report.createdAt}
                  pdfPath={report.pdfPath}
                />
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total reports
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

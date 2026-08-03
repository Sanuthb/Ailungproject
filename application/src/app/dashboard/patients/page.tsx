"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PatientCard } from "@/components/patient-card";
import { TableSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
import { Plus, Search, User } from "lucide-react";
import type { PaginationInfo } from "@/types";

interface PatientListItem {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  createdAt: string;
  _count: { scans: number };
}

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Newest first" },
  { value: "createdAt-asc", label: "Oldest first" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "age-desc", label: "Age (High-Low)" },
  { value: "age-asc", label: "Age (Low-High)" },
];

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [gender, setGender] = useState("");
  const [sort, setSort] = useState("createdAt-desc");
  const [page, setPage] = useState(1);

  const fetchPatients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sortBy, order] = sort.split("-");
      const params = new URLSearchParams({ page: String(page), limit: "9", sortBy, order });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (gender) params.set("gender", gender);
      const res = await fetch(`/api/patients?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load patients");
      const data = await res.json();
      setPatients(data.patients || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, gender, sort, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, gender, sort]);

  const hasFilters = !!debouncedSearch || !!gender;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Manage your patients, view their medical history and previous scans."
      >
        <Link href="/dashboard/patients/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Patient
          </Button>
        </Link>
      </PageHeader>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search patients by name, ID or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              aria-label="Search patients"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              aria-label="Filter by gender"
              className="h-10 rounded-md border border-slate-200 bg-white text-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort patients"
              className="h-10 rounded-md border border-slate-200 bg-white text-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <CardContent className="p-6">
          {error ? (
            <ErrorState message={error} retry={fetchPatients} />
          ) : isLoading ? (
            <TableSkeleton rows={5} />
          ) : patients.length === 0 ? (
            <EmptyState
              icon={<User className="h-12 w-12" />}
              title="No patients found"
              description={
                hasFilters
                  ? "We couldn't find any patients matching your search criteria."
                  : "Get started by adding your first patient to the system."
              }
              action={
                !hasFilters && (
                  <Link href="/dashboard/patients/new">
                    <Button>Add New Patient</Button>
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {patients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    id={patient.id}
                    name={patient.name}
                    patientId={patient.patientId}
                    age={patient.age}
                    gender={patient.gender}
                    phone={patient.phone}
                    scanCount={patient._count.scans}
                    createdAt={patient.createdAt}
                  />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500">
                    Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total
                    patients
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

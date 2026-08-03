"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatsCard } from "@/components/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSkeleton, CardSkeleton } from "@/components/loading-skeleton";
import { ErrorState } from "@/components/error-state";
import { Users, FileText, Activity, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatDate } from "@/utils/disease";

interface RecentScan {
  id: string;
  createdAt: string;
  reports: { id: string }[];
  patient: { name: string; patientId: string };
}

interface DashboardData {
  stats: { totalPatients: number; todayScans: number; totalReports: number; totalScans: number };
  recentScans: RecentScan[];
  diseaseDistribution: { name: string; count: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard Overview" />
        <ErrorState message={error} retry={fetchDashboardData} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Overview"
        description="Welcome back. Here is what's happening with your patients today."
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatsCard title="Total Patients" value={data.stats.totalPatients} icon={<Users />} />
            <StatsCard title="Today's Scans" value={data.stats.todayScans} icon={<Activity />} />
            <StatsCard title="Total Reports" value={data.stats.totalReports} icon={<FileText />} />
            <StatsCard title="Total AI Scans" value={data.stats.totalScans} icon={<Brain />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Disease Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <LoadingSkeleton lines={8} />
            ) : data.diseaseDistribution.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
                No disease data available yet.
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.diseaseDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={80} />
                    <YAxis allowDecimals={false} />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/dashboard/predict" className="text-sm font-medium text-blue-600 hover:underline">
              New Scan
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <LoadingSkeleton lines={6} />
            ) : data.recentScans.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                No recent activity.
              </div>
            ) : (
              <div className="space-y-5">
                {data.recentScans.map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{scan.patient.name}</p>
                      <p className="text-xs text-slate-500">{formatDate(scan.createdAt)}</p>
                    </div>
                    <Badge variant={scan.reports.length > 0 ? "success" : "warning"}>
                      {scan.reports.length > 0 ? "Reported" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

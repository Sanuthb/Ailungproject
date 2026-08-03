import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <LoadingSkeleton lines={10} />
    </div>
  );
}

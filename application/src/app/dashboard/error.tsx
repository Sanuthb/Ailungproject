"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/error-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <ErrorState
        title="Something went wrong"
        message="This section couldn't be loaded. Please try again."
        retry={reset}
      />
    </div>
  );
}

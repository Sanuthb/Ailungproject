"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface HeatmapViewerProps {
  originalSrc: string;
  gradcamSrc: string | null;
  noduleMaskSrc?: string | null;
  className?: string;
}

type ViewMode = "original" | "gradcam" | "nodule_mask" | "combined";

export function HeatmapViewer({
  originalSrc,
  gradcamSrc,
  noduleMaskSrc,
  className,
}: HeatmapViewerProps) {
  const defaultMode: ViewMode = noduleMaskSrc
    ? "nodule_mask"
    : gradcamSrc
    ? "gradcam"
    : "original";

  const [mode, setMode] = useState<ViewMode>(defaultMode);
  const [opacity, setOpacity] = useState(0.65);

  const viewOptions: { key: ViewMode; label: string; available: boolean }[] = [
    { key: "original", label: "Original X-Ray", available: true },
    { key: "gradcam", label: "DenseNet Grad-CAM", available: !!gradcamSrc },
    { key: "nodule_mask", label: "U-Net Nodule Mask", available: !!noduleMaskSrc },
    {
      key: "combined",
      label: "Combined Visualization",
      available: !!(gradcamSrc && noduleMaskSrc),
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
        <img
          src={originalSrc}
          alt="Original chest X-ray"
          className="mx-auto max-h-[420px] w-full object-contain"
        />

        {gradcamSrc && (mode === "gradcam" || mode === "combined") && (
          <img
            src={gradcamSrc}
            alt="DenseNet Grad-CAM heatmap overlay"
            className="pointer-events-none absolute inset-0 mx-auto max-h-[420px] w-full object-contain mix-blend-screen"
            style={{ opacity: opacity }}
          />
        )}

        {noduleMaskSrc && (mode === "nodule_mask" || mode === "combined") && (
          <img
            src={noduleMaskSrc}
            alt="U-Net lung nodule segmentation mask"
            className="pointer-events-none absolute inset-0 mx-auto max-h-[420px] w-full object-contain"
            style={{ opacity: mode === "nodule_mask" ? opacity : 0.85 }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1 text-xs sm:text-sm"
          role="tablist"
          aria-label="Image view mode"
        >
          {viewOptions
            .filter((opt) => opt.available)
            .map((option) => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={mode === option.key}
                onClick={() => setMode(option.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition-colors",
                  mode === option.key
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {option.label}
              </button>
            ))}
        </div>

        {mode !== "original" && (
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Overlay opacity
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="accent-blue-600"
              aria-label="Overlay intensity slider"
            />
          </label>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface UploadCardProps {
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
  error?: string | null;
}

export function UploadCard({ previewUrl, onFileSelect, onClear, disabled, error }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateAndSelect = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Only PNG, JPG, and JPEG formats are supported.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setLocalError("File size must be less than 20 MB.");
      return;
    }
    setLocalError(null);
    onFileSelect(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSelect(file);
  };

  const displayError = error ?? localError;

  if (previewUrl) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
        <img src={previewUrl} alt="Chest X-ray preview" className="mx-auto max-h-[420px] w-full object-contain" />
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-slate-700 shadow hover:bg-white"
            aria-label="Remove selected image"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload chest X-ray image"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors",
          isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          {isDragging ? <Upload className="h-7 w-7" /> : <ImagePlus className="h-7 w-7" />}
        </div>
        <p className="text-sm font-medium text-slate-900">
          Drag & drop a chest X-ray, or <span className="text-blue-600">browse</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">PNG, JPG, or JPEG — up to 20 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndSelect(file);
            e.target.value = "";
          }}
        />
      </div>
      {displayError && <p className="text-xs text-red-600">{displayError}</p>}
    </div>
  );
}

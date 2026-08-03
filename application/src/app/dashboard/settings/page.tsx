"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorState } from "@/components/error-state";
import type { HospitalSettings } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<HospitalSettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settingsRes, meRes] = await Promise.all([fetch("/api/settings"), fetch("/api/auth/me")]);
      if (!settingsRes.ok) throw new Error("Failed to load settings");
      const settingsJson = await settingsRes.json();
      setSettings(settingsJson);
      if (meRes.ok) {
        const meJson = await meRes.json();
        setIsAdmin(meJson.user?.role === "ADMIN");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save settings");
      setSettings(json);
      setSuccessMessage("Settings updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (isLoading) return <LoadingSkeleton lines={8} />;
  if (error && !settings) return <ErrorState message={error} retry={fetchSettings} />;
  if (!settings) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Configure hospital information, AI thresholds, and signature settings."
      />

      {!isAdmin && (
        <Alert variant="warning">
          You are viewing settings in read-only mode. Only administrators can make changes.
        </Alert>
      )}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Hospital Information</CardTitle>
          <CardDescription>Displayed on generated AI reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <fieldset disabled={!isAdmin} className="space-y-6 disabled:opacity-60">
              <div>
                <Label htmlFor="hospitalName">Hospital / Clinic Name</Label>
                <Input
                  id="hospitalName"
                  value={settings.hospitalName}
                  onChange={(e) => setSettings({ ...settings, hospitalName: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="hospitalAddress">Hospital Address</Label>
                <Input
                  id="hospitalAddress"
                  value={settings.hospitalAddress ?? ""}
                  onChange={(e) => setSettings({ ...settings, hospitalAddress: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="aiThreshold">AI Confidence Threshold (0.05 - 1.0)</Label>
                <Input
                  id="aiThreshold"
                  type="number"
                  step="0.01"
                  min="0.05"
                  max="1.0"
                  value={settings.aiThreshold}
                  onChange={(e) => setSettings({ ...settings, aiThreshold: parseFloat(e.target.value) })}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Findings at or above this probability are flagged as detected.
                </p>
              </div>

              <div>
                <Label htmlFor="doctorSignature">Default Doctor Signature / Text</Label>
                <Input
                  id="doctorSignature"
                  value={settings.doctorSignature}
                  onChange={(e) => setSettings({ ...settings, doctorSignature: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="notifications"
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="notifications" className="mb-0">
                  Enable in-app notifications
                </Label>
              </div>

              {isAdmin && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              )}
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

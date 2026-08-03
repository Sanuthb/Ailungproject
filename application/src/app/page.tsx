import Link from "next/link";
import {
  ActivitySquare,
  ArrowRight,
  Brain,
  FileCheck2,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DISEASE_LABELS } from "@/types";

const FEATURES = [
  {
    icon: ScanLine,
    title: "AI Chest X-ray Prediction",
    description:
      "Upload a chest X-ray and get DenseNet121-powered predictions across 14 disease categories in seconds.",
  },
  {
    icon: Brain,
    title: "Grad-CAM Visualization",
    description:
      "See exactly where the model is focusing with heatmap overlays, so findings can be reviewed and trusted, not taken on faith.",
  },
  {
    icon: Users,
    title: "Patient Management",
    description:
      "Keep demographics, medical history, and every scan and report organized under one searchable patient record.",
  },
  {
    icon: FileCheck2,
    title: "Professional AI Reports",
    description:
      "Generate structured, exportable PDF reports with findings, confidence scores, severity, and doctor notes.",
  },
];

const STEPS = [
  {
    title: "Add a patient",
    description: "Register demographics and medical history in a few fields.",
  },
  {
    title: "Upload a chest X-ray",
    description: "Drag and drop a PNG or JPEG — up to 20 MB, with instant preview.",
  },
  {
    title: "Review AI findings",
    description: "Get probability scores, severity, and Grad-CAM for every disease category.",
  },
  {
    title: "Generate a report",
    description: "Add clinical notes and export a signed, professional PDF report.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-900">AI Lung Diagnostics</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              AI decision support &mdash; reviewed by licensed clinicians
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Faster, more consistent chest X-ray screening
            </h1>
            <p className="mt-6 text-lg text-slate-600">
              AI Lung Diagnostics helps healthcare teams detect lung abnormalities earlier,
              standardize reporting, and spend less time on administrative work &mdash; powered by a
              DenseNet121 model trained on the CheXpert dataset.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Create your account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
            {[
              { label: "Disease categories", value: "14" },
              { label: "Model input", value: "224×224" },
              { label: "Analysis time", value: "< 1 min" },
              { label: "Report export", value: "PDF" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900">Everything a radiology workflow needs</h2>
            <p className="mt-3 text-slate-600">
              Built for doctors and administrators who need reliable AI assistance without
              sacrificing clinical control.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-slate-900">From upload to report in four steps</h2>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <div key={step.title}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-slate-900">Screens for 14 chest X-ray findings</h2>
            <p className="mt-3 text-slate-600">
              Trained on the CheXpert Small dataset across the full range of findings radiologists
              look for.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {DISEASE_LABELS.map((label) => (
              <span
                key={label}
                className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700"
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <Card className="flex flex-col items-center gap-6 p-10 text-center sm:p-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <ActivitySquare className="h-6 w-6" />
            </div>
            <h2 className="max-w-xl text-3xl font-bold text-slate-900">
              Ready to bring AI-assisted screening to your practice?
            </h2>
            <p className="max-w-lg text-slate-600">
              Create an account to start managing patients and running predictions in minutes.
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get started for free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} AI Lung Diagnostics. All rights reserved.</p>
          <p className="text-center sm:text-right">
            AI predictions are decision support only and must be reviewed by a qualified clinician.
          </p>
        </div>
      </footer>
    </div>
  );
}

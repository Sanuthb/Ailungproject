"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { Check, FilePlus2, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

/** The PDF uses plain Helvetica text, so strip markdown and non-Latin1 punctuation before it goes into the report. */
function toReportText(markdown: string): string {
  const text = markdown
    .replace(/^[ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*(\n|$)/gm, "")
    .replace(/^[ \t]*\|(.*)\|[ \t]*$/gm, (_, row: string) =>
      row.split("|").map((c) => c.trim()).join(" - ")
    )
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^\s*[*+]\s+/gm, "- ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `[AI suggestion] ${text}`;
}

const markdownComponents: Components = {
  h1: (p) => <h3 className="mb-2 mt-3 text-base font-semibold" {...p} />,
  h2: (p) => <h3 className="mb-2 mt-3 text-base font-semibold" {...p} />,
  h3: (p) => <h4 className="mb-1 mt-3 text-sm font-semibold" {...p} />,
  h4: (p) => <h4 className="mb-1 mt-3 text-sm font-semibold" {...p} />,
  p: (p) => <p className="mb-2 last:mb-0" {...p} />,
  ul: (p) => <ul className="mb-2 list-disc space-y-1 pl-5" {...p} />,
  ol: (p) => <ol className="mb-2 list-decimal space-y-1 pl-5" {...p} />,
  a: (p) => <a className="text-blue-600 underline" target="_blank" rel="noopener noreferrer" {...p} />,
  code: (p) => <code className="rounded bg-slate-200 px-1 py-0.5 text-xs" {...p} />,
  table: (p) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs" {...p} />
    </div>
  ),
  th: (p) => <th className="border border-slate-300 bg-slate-200 px-2 py-1 text-left font-semibold" {...p} />,
  td: (p) => <td className="border border-slate-300 px-2 py-1 align-top" {...p} />,
};

function AssistantChat() {
  const scanId = useSearchParams().get("scanId") ?? undefined;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIndexes, setAddedIndexes] = useState<number[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setError(null);
    setIsSending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId, messages: next.slice(-20) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assistant request failed");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assistant request failed");
    } finally {
      setIsSending(false);
    }
  };

  const addToReport = async (index: number) => {
    if (!scanId) return;
    setError(null);
    try {
      const res = await fetch(`/api/scans/${scanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appendNote: toReportText(messages[index].content) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add to report");
      setAddedIndexes((prev) => [...prev, index]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to report");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description={
          scanId
            ? "Ask questions about the selected scan's results."
            : "Ask general questions about chest X-ray findings and this application."
        }
      />
      <Card>
        <CardContent className="flex h-[60vh] flex-col gap-4 p-4">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">
                Try: &ldquo;Summarise the key findings&rdquo; or &ldquo;What does a high Lung Opacity score mean?&rdquo;
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className="max-w-[80%]">
                <div
                  className={
                    "rounded-lg px-3 py-2 text-sm " +
                    (m.role === "user" ? "whitespace-pre-wrap bg-blue-600 text-white" : "bg-slate-100 text-slate-900")
                  }
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {m.content}
                    </ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
                {m.role === "assistant" && scanId && (
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    {addedIndexes.includes(i) ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <Check className="h-3.5 w-3.5" /> Added to doctor&apos;s notes
                        </span>
                        <Link href={`/dashboard/predict?scanId=${scanId}`} className="text-blue-600 underline">
                          Review &amp; generate report
                        </Link>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToReport(i)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600"
                      >
                        <FilePlus2 className="h-3.5 w-3.5" /> Add to report
                      </button>
                    )}
                  </div>
                )}
                </div>
              </div>
            ))}
            {isSending && <p className="text-sm text-slate-400">Thinking…</p>}
            <div ref={endRef} />
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          <form onSubmit={send} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              maxLength={4000}
            />
            <Button type="submit" disabled={isSending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-slate-400">
            AI-generated guidance for clinicians. Always confirm with a qualified radiologist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense>
      <AssistantChat />
    </Suspense>
  );
}

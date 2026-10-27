export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 30_000;

/**
 * Sends a conversation to Groq's OpenAI-compatible chat completions API and returns the reply text.
 * Used only for the clinical assistant; it never sees raw images or patient-identifying fields.
 */
export async function chatCompletion(system: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured. Add it to .env to enable the AI assistant.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        temperature: 0.3,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!response.ok) {
      const detail = await response
        .json()
        .then((d) => d?.error?.message as string | undefined)
        .catch(() => undefined);
      throw new Error(`Groq request failed with status ${response.status}${detail ? `: ${detail}` : ""}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply) {
      throw new Error("Groq returned an empty response");
    }
    return reply;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI assistant timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

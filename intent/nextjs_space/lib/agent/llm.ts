/**
 * Phase 8 — the LLM boundary (§3.10).
 *
 * Perceive and Narrate call the model only through this interface. `HfLLM` hits
 * the Hugging Face router (OpenAI-compatible) with a cheap instruct model;
 * `FakeLLM` is a deterministic test double so the loop is unit-testable offline.
 * Server/script only.
 */

import { loadEnv } from './env.ts';

/** Measured token usage from a model call (for actual-cost capture, ADR-0002). */
export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface LLM {
  /** Free-form text completion (used by Narrate). */
  generateText(system: string, user: string): Promise<string>;
  /** JSON completion parsed into T (used by Perceive). Impl enforces JSON mode. */
  generateStructured<T>(system: string, user: string): Promise<T>;
  /** JSON completion that also reports measured usage (used by the Build run). */
  generateStructuredWithUsage<T>(system: string, user: string): Promise<{ data: T; usage: Usage }>;
}

export const DEFAULT_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const HF_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';

function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text) as T;
}

export class HfLLM implements LLM {
  private model: string;
  private token: string;
  private temperature: number;

  constructor(opts: { model?: string; token?: string; temperature?: number } = {}) {
    loadEnv();
    this.model = opts.model ?? process.env.AGENT_MODEL ?? DEFAULT_MODEL;
    this.token = opts.token ?? process.env.HF_TOKEN ?? '';
    this.temperature = opts.temperature ?? 0.2;
    if (!this.token) throw new Error('HF_TOKEN not set (checked host env + .env).');
  }

  private async chat(system: string, user: string, jsonMode: boolean): Promise<{ content: string; usage: Usage }> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 900,
      temperature: this.temperature,
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    const res = await fetch(HF_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HF ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      content: json.choices?.[0]?.message?.content ?? '',
      usage: { inputTokens: json.usage?.prompt_tokens ?? 0, outputTokens: json.usage?.completion_tokens ?? 0 },
    };
  }

  async generateText(system: string, user: string): Promise<string> {
    return (await this.chat(system, user, false)).content.trim();
  }

  async generateStructured<T>(system: string, user: string): Promise<T> {
    return extractJson<T>((await this.chat(system, user, true)).content);
  }

  async generateStructuredWithUsage<T>(system: string, user: string): Promise<{ data: T; usage: Usage }> {
    const { content, usage } = await this.chat(system, user, true);
    return { data: extractJson<T>(content), usage };
  }
}

/** Deterministic test double. Queue responses in order of call. */
export class FakeLLM implements LLM {
  private texts: string[];
  private structs: unknown[];
  constructor(opts: { texts?: string[]; structs?: unknown[] } = {}) {
    this.texts = [...(opts.texts ?? [])];
    this.structs = [...(opts.structs ?? [])];
  }
  async generateText(): Promise<string> {
    return this.texts.length ? this.texts.shift()! : 'ok';
  }
  async generateStructured<T>(): Promise<T> {
    if (!this.structs.length) throw new Error('FakeLLM: no structured response queued');
    return this.structs.shift() as T;
  }
  async generateStructuredWithUsage<T>(): Promise<{ data: T; usage: Usage }> {
    if (!this.structs.length) throw new Error('FakeLLM: no structured response queued');
    return { data: this.structs.shift() as T, usage: { inputTokens: 1000, outputTokens: 500 } };
  }
}

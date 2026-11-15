import type { ApiError } from "@/lib/types";

/**
 * Shared HTTP client. The fullstack-crud-flow skill uses a shared axios instance
 * (lib/api/axios.ts) with baseURL /api/v1 plus request/response interceptors.
 * axios is not installable in this environment, so this is a minimal fetch-based
 * equivalent that fills the same role: a single place for the base URL, JSON
 * encoding, credential handling, and normalized error shaping. Swapping back to
 * axios later is mechanical because the api-layer modules only call these verbs.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

export class HttpError extends Error implements ApiError {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "message" in body
        ? String((body as Record<string, unknown>).message)
        : undefined) ||
      (typeof body === "string" ? body : undefined) ||
      res.statusText ||
      "Request failed";
    throw new HttpError(message, res.status);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

const jsonHeaders = { "Content-Type": "application/json" } as const;

export const http = {
  get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return fetch(buildUrl(path, query), {
      method: "GET",
      credentials: "include",
    }).then((r) => parse<T>(r));
  },
  post<T>(path: string, data?: unknown): Promise<T> {
    return fetch(buildUrl(path), {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: data === undefined ? undefined : JSON.stringify(data),
    }).then((r) => parse<T>(r));
  },
  put<T>(path: string, data?: unknown): Promise<T> {
    return fetch(buildUrl(path), {
      method: "PUT",
      credentials: "include",
      headers: jsonHeaders,
      body: data === undefined ? undefined : JSON.stringify(data),
    }).then((r) => parse<T>(r));
  },
  patch<T>(path: string, data?: unknown): Promise<T> {
    return fetch(buildUrl(path), {
      method: "PATCH",
      credentials: "include",
      headers: jsonHeaders,
      body: data === undefined ? undefined : JSON.stringify(data),
    }).then((r) => parse<T>(r));
  },
};

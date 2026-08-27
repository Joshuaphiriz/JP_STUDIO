/** Small fetch helper with timeout + JSON parsing + classified errors. */

export class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }

  /** 429 and 5xx are worth retrying; 4xx (auth, validation) generally are not. */
  get retryable() {
    return this.status === 429 || this.status >= 500;
  }
}

type RequestInitJson = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
  form?: Record<string, string>;
};

export async function apiFetch<T = unknown>(
  url: string,
  init: RequestInitJson = {},
): Promise<T> {
  const { timeoutMs = 20_000, form, body, headers, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let finalBody: BodyInit | undefined;
  const finalHeaders = new Headers(headers as HeadersInit);

  if (form) {
    finalBody = new URLSearchParams(form).toString();
    finalHeaders.set("content-type", "application/x-www-form-urlencoded");
  } else if (body instanceof FormData) {
    finalBody = body;
  } else if (body !== undefined) {
    finalBody = JSON.stringify(body);
    if (!finalHeaders.has("content-type"))
      finalHeaders.set("content-type", "application/json");
  }

  try {
    const res = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: finalBody,
      signal: controller.signal,
    });
    const text = await res.text();
    const parsed = text ? safeJson(text) : null;
    if (!res.ok) {
      throw new ProviderHttpError(
        `${rest.method ?? "GET"} ${url} → ${res.status}`,
        res.status,
        parsed ?? text,
      );
    }
    return parsed as T;
  } catch (err) {
    if (err instanceof ProviderHttpError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new ProviderHttpError(
        `Timeout after ${timeoutMs}ms: ${url}`,
        408,
        null,
      );
    }
    throw new ProviderHttpError((err as Error).message, 0, null);
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

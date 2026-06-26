export function normalizeApiError(err: unknown, fallback: string): string {
  if (typeof err === "object" && err && "response" in err) {
    const maybe = err as {
      response?: { data?: { message?: string | string[] } };
      message?: string;
    };
    const msg = maybe.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string" && msg.trim()) return msg;
    if (typeof maybe.message === "string" && maybe.message.trim()) return maybe.message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

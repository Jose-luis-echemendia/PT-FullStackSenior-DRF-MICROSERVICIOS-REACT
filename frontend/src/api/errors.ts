import axios from "axios";

/** Extract a human-readable message from a DRF error response. */
export function parseApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response) {
    const data = err.response.data;
    if (typeof data === "string") return data;
    if (data?.detail) return String(data.detail);
    if (data && typeof data === "object") {
      const first = Object.values(data)[0];
      if (Array.isArray(first)) return String(first[0]);
      if (typeof first === "string") return first;
    }
  }
  return fallback;
}

import axios from "axios";

const USER_KEY = "user_id";

/** Anonymous identity: generated once, persisted in localStorage. */
export function getUserId(): string {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  config.headers["X-User-Id"] = getUserId();
  return config;
});

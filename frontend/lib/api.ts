import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// Interceptors removed in favor of stateful cookie auth
export async function getCsrfCookie() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "");
  await axios.get(`${baseUrl}/sanctum/csrf-cookie`, { withCredentials: true });
}
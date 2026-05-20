import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getCsrfCookie() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "");
  await axios.get(`${baseUrl}/sanctum/csrf-cookie`, { withCredentials: true });
}
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
  },
});

// Ensure X-XSRF-TOKEN header is always attached for stateful Sanctum requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const match = document.cookie.match(new RegExp("(^| )XSRF-TOKEN=([^;]+)"));
    if (match && !config.headers["X-XSRF-TOKEN"]) {
      config.headers["X-XSRF-TOKEN"] = decodeURIComponent(match[2]);
    }
  }
  return config;
});

export async function getCsrfCookie() {
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const baseUrl = rawApiUrl.replace(/\/api\/?$/, "");
  await axios.get(`${baseUrl}/sanctum/csrf-cookie`, {
    withCredentials: true,
    withXSRFToken: true,
  });
}
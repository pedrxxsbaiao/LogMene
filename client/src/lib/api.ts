import { useAuth } from "@/hooks/use-auth";

export async function fetchApi(url: string, options: RequestInit = {}) {
  const { token } = useAuth();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export function createQueryFetcher(url: string) {
  return async () => {
    return await fetchApi(url);
  };
} 
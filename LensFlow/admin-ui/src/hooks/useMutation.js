import { useState, useRef } from "react";
import { useShopify } from "./useShopify";

export function useMutation() {
  const { authenticatedFetch } = useShopify();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRef = useRef(authenticatedFetch);
  fetchRef.current = authenticatedFetch;

  const mutate = async (url, method = "POST", body = null) => {
    setLoading(true);
    setError(null);
    try {
      const opts = { method, headers: {} };
      if (body) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
      }
      const fetcher = fetchRef.current;
      const res = await fetcher(url, opts);
      if (!res.ok) {
        const text = await res.text();
        throw new Error("HTTP " + res.status + " " + text);
      }
      return await res.json();
    } catch (e) {
      if (e.name === "AbortError") {
        const timeoutErr = new Error("Request timeout");
        setError(timeoutErr);
        throw timeoutErr;
      }
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}

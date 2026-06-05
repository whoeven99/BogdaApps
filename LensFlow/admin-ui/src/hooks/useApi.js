import { useState, useEffect, useCallback, useRef } from "react";
import { useShopify } from "./useShopify";

export function useApi(url) {
  const { authenticatedFetch } = useShopify();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRef = useRef(authenticatedFetch);
  fetchRef.current = authenticatedFetch;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetcher = fetchRef.current;
      const res = await fetcher(url);
      if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);
      const json = await res.json();
      setData(json.status === "success" ? json.body : json);
    } catch (e) {
      if (e.name === "AbortError") {
        setError(new Error("Request timeout"));
      } else {
        setError(e);
      }
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, retry: fetchData };
}

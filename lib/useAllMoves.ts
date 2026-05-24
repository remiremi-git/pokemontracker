import { useEffect, useState } from "react";

export function useAllMoves() {
  const [moves, setMoves] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadMoves(forceRefresh = false) {
    try {
      setLoading(true);
      const res = await fetch("/api/all-moves", {
        method: forceRefresh ? "POST" : "GET",
        headers: forceRefresh ? { "Content-Type": "application/json" } : undefined,
        body: forceRefresh ? JSON.stringify({ forceRefresh: true }) : undefined,
      });

      if (!res.ok) {
        setMoves([]);
        return;
      }

      const data = await res.json();
      setMoves(data.moves || []);
    } catch (err) {
      setMoves([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMoves();
  }, []);

  return {
    moves,
    loading,
    refreshMoves: () => loadMoves(true),
  };
}

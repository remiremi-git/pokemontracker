// /lib/useMoveDetails.ts
import { useAllMoves } from "./useAllMoves";

export function useMoveDetails() {
  const { moves } = useAllMoves();

  async function fetchMove(name: string) {
    if (moves && moves.length > 0) {
      const found = moves.find((m) => m.name.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }

    try {
      const res = await fetch("/api/all-moves", { method: "GET" });
      if (!res.ok) return null;
      const data = await res.json();
      const list = data?.moves ?? [];
      return list.find((m: any) => m.name.toLowerCase() === name.toLowerCase()) || null;
    } catch {
      return null;
    }
  }

  return { fetchMove };
}

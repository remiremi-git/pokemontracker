import { useState } from "react";

let cachedAbilities: any[] | null = null;

async function loadAllAbilities(): Promise<any[]> {
  if (cachedAbilities) return cachedAbilities;

  const res = await fetch("/api/all-abilities", { method: "GET" });
  if (!res.ok) {
    cachedAbilities = [];
    return cachedAbilities;
  }

  const data = await res.json();
  cachedAbilities = data.abilities || [];
  return cachedAbilities ?? [];
}

export function useAbilityDetails() {
  const [ability, setAbility] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchAbility(name: string) {
    if (!name) {
      setAbility(null);
      return null;
    }

    setLoading(true);
    try {
      const list = await loadAllAbilities();
      const found =
        list.find((a: any) => a.name?.toLowerCase() === name.toLowerCase()) ?? null;
      setAbility(found);
      return found;
    } catch (err) {
      setAbility(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { ability, loading, fetchAbility };
}

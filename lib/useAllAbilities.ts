import { useEffect, useState } from "react";

export function useAllAbilities() {
  const [abilities, setAbilities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/all-abilities", {
          method: "GET",
        });

        if (!res.ok) {
          setAbilities([]);
          return;
        }

        const data = await res.json();
        setAbilities(data.abilities || []);
      } catch (err) {
        setAbilities([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { abilities, loading };
}

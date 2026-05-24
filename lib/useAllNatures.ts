import { useEffect, useState } from "react";

export type NatureEntry = {
  name: string;
  increasedStat?: string | null;
  decreasedStat?: string | null;
};

export function useAllNatures() {
  const [natures, setNatures] = useState<NatureEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/all-natures", {
          method: "GET",
        });

        if (!res.ok) {
          setNatures([]);
          return;
        }

        const data = await res.json();
        setNatures(data.natures || []);
      } catch (err) {
        setNatures([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { natures, loading };
}

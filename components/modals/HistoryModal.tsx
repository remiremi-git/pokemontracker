import React from "react";
import { Button } from "@/components/ui/button";
import { useModalAnimation } from "./useModalAnimation";

export type HistoryEntry = {
  id: string;
  timestamp: number;
  title: string;
  lines: string[];
};

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  onClear: () => void;
}

export default function HistoryModal({
  isOpen,
  onClose,
  entries,
  onClear,
}: HistoryModalProps) {
  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";
  const backdropAnimClass = state === "closing" ? "backdrop-exit" : "backdrop-enter";

  const chronological = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const sections = chronological.reduce<
    { id: string; title: string; timestamp: number; entries: HistoryEntry[] }[]
  >((acc, entry) => {
    if (entry.title === "Begin Combat") {
      acc.push({
        id: entry.id,
        title: "Combat",
        timestamp: entry.timestamp,
        entries: [entry],
      });
      return acc;
    }

    if (acc.length === 0) {
      acc.push({
        id: entry.id,
        title: "History",
        timestamp: entry.timestamp,
        entries: [],
      });
    }

    acc[acc.length - 1].entries.push(entry);
    return acc;
  }, []);

  const displaySections = [...sections].reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={`absolute inset-0 bg-black/60 ${backdropAnimClass}`} onClick={onClose} />
      <div className={`relative z-10 w-[700px] max-w-[95vw] bg-gray-900 text-white border border-gray-600 rounded-lg shadow-xl ${modalAnimClass}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">History</h2>
            <div className="flex items-center gap-2">
              <Button onClick={onClear} className="bg-gray-700 hover:bg-gray-600">
                Clear
              </Button>
              <Button onClick={onClose} className="bg-gray-700 hover:bg-gray-600">
                Close
              </Button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto space-y-3">
            {entries.length === 0 ? (
              <div className="text-sm text-gray-400">No history yet.</div>
            ) : (
              displaySections.map((section, idx) => {
                return (
                  <details
                    key={`${section.id}-${idx}`}
                    className="bg-gray-800 border border-gray-700 rounded p-3"
                    open={idx === 0}
                  >
                    <summary className="cursor-pointer flex items-center justify-between">
                      <div className="font-semibold">{section.title}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(section.timestamp).toLocaleTimeString()}
                      </div>
                    </summary>

                    <div className="mt-2 space-y-2">
                      {section.entries.map((entry) => (
                        <div key={entry.id} className="bg-gray-900/60 border border-gray-700 rounded p-2">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">{entry.title}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-gray-200">
                            {entry.lines.map((line, lineIdx) => (
                              <div key={lineIdx}>{line}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

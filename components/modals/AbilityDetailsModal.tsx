import React from "react";
import { Button } from "@/components/ui/button";
import { useModalAnimation } from "./useModalAnimation";

export interface AbilityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ability: any | null;
  loading?: boolean;
}

function renderTextWithLinks(input?: unknown) {
  if (input === null || input === undefined) return null;

  let text: string;

  if (typeof input === "string") {
    text = input;
  } else if (Array.isArray(input)) {
    text = input
      .map((x: any) => {
        if (typeof x === "string") return x;
        if (typeof x?.plain_text === "string") return x.plain_text;
        if (typeof x?.text?.content === "string") return x.text.content;
        return "";
      })
      .filter(Boolean)
      .join("");
  } else if (typeof (input as any)?.plain_text === "string") {
    text = (input as any).plain_text;
  } else {
    text = String(input);
  }

  if (!text) return null;

  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, lineIdx) => {
        const parts: React.ReactNode[] = [];
        const regex = /\[([^\]]+)\]\(([^)]+)\)/g;

        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          const [full, label, url] = match;
          const start = match.index;

          if (start > lastIndex) {
            parts.push(line.slice(lastIndex, start));
          }

          parts.push(
            <a
              key={`${lineIdx}-${start}-${url}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-300 hover:text-blue-200 underline"
            >
              {label}
            </a>
          );

          lastIndex = start + full.length;
        }

        if (lastIndex < line.length) {
          parts.push(line.slice(lastIndex));
        }

        if (parts.length === 0) parts.push(line);

        return (
          <p key={lineIdx} className="text-sm text-gray-100 whitespace-pre-wrap">
            {parts}
          </p>
        );
      })}
    </div>
  );
}

export default function AbilityDetailsModal({
  isOpen,
  onClose,
  ability,
  loading = false,
}: AbilityDetailsModalProps) {
  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";
  const backdropAnimClass = state === "closing" ? "backdrop-exit" : "backdrop-enter";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={`absolute inset-0 bg-black/60 ${backdropAnimClass}`} onClick={onClose} />

      <div className={`relative bg-gray-900 text-white border border-gray-600 rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden ${modalAnimClass}`}>
        <div className="p-4 overflow-y-auto max-h-[80vh]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                {ability?.name ?? (loading ? "Loading..." : "Ability Details")}
              </h2>
              {ability?.category && (
                <div className="mt-2 text-sm text-gray-300">
                  <span className="font-semibold text-gray-200">Category:</span>{" "}
                  {ability.category}
                </div>
              )}
            </div>
            <Button onClick={onClose} className="bg-gray-700 hover:bg-gray-600">
              Close
            </Button>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-bold text-yellow-300 mb-2">Effect</h3>
            <div className="bg-gray-800 border border-gray-700 rounded p-3">
              {loading ? (
                <p className="text-sm text-gray-400 italic">Loading...</p>
              ) : (
                renderTextWithLinks(ability?.effect || "—")
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

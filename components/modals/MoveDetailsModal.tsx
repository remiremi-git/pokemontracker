import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { TYPE_ICON_MAP } from "@/lib/typeicons";
import { useModalAnimation } from "./useModalAnimation";

export interface MoveDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  move: any | null;
  showDamageCalcButton?: boolean;
  onOpenDamageCalc?: () => void;
  childrenRight?: React.ReactNode;
}

function TypeBadge({ type }: { type?: string }) {
  if (!type) return null;

  const iconSrc = TYPE_ICON_MAP[type] || "/type_icons/NormalIC_FRLG.png";

  return (
    <div
      className="inline-flex items-center justify-center rounded border border-gray-600 bg-gray-800 p-1"
      title={type}
    >
      <Image src={iconSrc} alt={type} width={38} height={38} />
    </div>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-gray-200">
      {tag}
    </span>
  );
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
              className="text-blue-300 underline hover:text-blue-200"
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
          <p key={lineIdx} className="whitespace-pre-wrap text-sm text-gray-100">
            {parts}
          </p>
        );
      })}
    </div>
  );
}

export default function MoveDetailsModal({
  isOpen,
  onClose,
  move,
  showDamageCalcButton = false,
  onOpenDamageCalc,
  childrenRight,
}: MoveDetailsModalProps) {
  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";
  const backdropAnimClass = state === "closing" ? "backdrop-exit" : "backdrop-enter";

  const isSplit = !!childrenRight;
  const canOpenDamageCalc =
    showDamageCalcButton &&
    !isSplit &&
    move?.category?.trim().toLowerCase() !== "status";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/60 ${backdropAnimClass}`}
        onClick={onClose}
      />

      <div
        className={`relative overflow-hidden rounded-lg border border-gray-600 bg-gray-900 text-white shadow-xl ${modalAnimClass} ${
          isSplit ? "h-[650px] w-[1100px]" : "h-[80vh] w-[650px]"
        }`}
      >
        <div className={`grid h-full ${isSplit ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold">{move?.name ?? "Move Details"}</h2>

                <div className="mt-2 flex items-center gap-2">
                  <TypeBadge type={move?.type} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-300">
                  <div className="rounded border border-gray-700 bg-gray-800/70 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Category
                    </div>
                    <div className="mt-1 text-gray-100">{move?.category || "—"}</div>
                  </div>

                  <div className="rounded border border-gray-700 bg-gray-800/70 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      PP Cost
                    </div>
                    <div className="mt-1 text-gray-100">{move?.ppCost ?? "—"}</div>
                  </div>

                  <div className="rounded border border-gray-700 bg-gray-800/70 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Tags
                    </div>
                    <div className="mt-1 text-gray-100">
                      {!Array.isArray(move?.tags) && move?.tags ? (
                        renderTextWithLinks(move.tags)
                      ) : Array.isArray(move?.tags) && move.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {move.tags.map((t: string) => (
                            <TagPill key={t} tag={t} />
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>

                  <div className="rounded border border-gray-700 bg-gray-800/70 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Range/AOE
                    </div>
                    <div className="mt-1 text-gray-100">
                      {move?.range ? renderTextWithLinks(move.range) : "—"}
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={onClose} className="bg-gray-700 hover:bg-gray-600">
                Close
              </Button>
            </div>

            {canOpenDamageCalc && (
              <div className="mt-4">
                <Button
                  onClick={onOpenDamageCalc}
                  className="bg-blue-700 hover:bg-blue-600"
                  disabled={!onOpenDamageCalc}
                >
                  Open Damage Calc
                </Button>
              </div>
            )}

            <div className="mt-5">
              <h3 className="mb-2 text-lg font-bold text-yellow-300">Effect</h3>
              <div className="rounded border border-gray-700 bg-gray-800 p-3">
                {renderTextWithLinks(move?.effect || "—")}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <h3 className="text-lg font-bold text-yellow-300">Power Tiers</h3>

              <div className="rounded border border-gray-700 bg-gray-800 p-3">
                <div className="mb-1 text-sm font-semibold text-gray-200">Tier 1 (9 or lower)</div>
                {renderTextWithLinks(move?.tier1 || "—")}
              </div>

              <div className="rounded border border-gray-700 bg-gray-800 p-3">
                <div className="mb-1 text-sm font-semibold text-gray-200">Tier 2 (10 to 14)</div>
                {renderTextWithLinks(move?.tier2 || "—")}
              </div>

              <div className="rounded border border-gray-700 bg-gray-800 p-3">
                <div className="mb-1 text-sm font-semibold text-gray-200">Tier 3 (15+)</div>
                {renderTextWithLinks(move?.tier3 || "—")}
              </div>
            </div>
          </div>

          {isSplit && (
            <div className="overflow-y-scroll border-l border-gray-700 bg-gray-950 p-4">
              {childrenRight}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// components/CampaignPickerModal.tsx
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useModalAnimation } from "./modals/useModalAnimation";

type CampaignMeta = {
  id: string;
  name: string;
  updatedAt: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;

  campaigns: CampaignMeta[];
  activeId: string | null;

  onCreate: (name: string) => Promise<void>;
  onLoad: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;

  onExport: (id: string) => Promise<string>;
  onImport: (json: string) => Promise<void>;

  error?: string | null;
};

function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

export default function CampaignPickerModal({
  isOpen,
  onClose,
  campaigns,
  activeId,
  onCreate,
  onLoad,
  onRename,
  onDelete,
  onDuplicate,
  onExport,
  onImport,
  error,
}: Props) {
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...campaigns].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [campaigns]);

  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";
  const backdropAnimClass = state === "closing" ? "backdrop-exit" : "backdrop-enter";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl">
        <div
          className={`absolute inset-0 bg-black/60 ${backdropAnimClass}`}
          onClick={onClose}
        />
        <div className={`relative z-10 rounded-2xl bg-white p-4 shadow-xl ${modalAnimClass}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Campaigns</h2>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        {error ? (
          <div className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="New campaign name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            onClick={async () => {
              const name = newName.trim() || "Untitled Campaign";
              setBusyId("create");
              try {
                await onCreate(name);
                setNewName("");
              } finally {
                setBusyId(null);
              }
            }}
            disabled={busyId === "create"}
          >
            Create
          </Button>

          <label className="inline-flex items-center gap-2">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setBusyId("import");
                try {
                  await onImport(text);
                } finally {
                  setBusyId(null);
                  e.currentTarget.value = "";
                }
              }}
            />
            <span className="cursor-pointer rounded-lg border px-3 py-2 text-sm">
              Import…
            </span>
          </label>
        </div>

        <div className="mt-4 max-h-[55vh] overflow-auto rounded-xl border">
          {sorted.length === 0 ? (
            <div className="p-4 text-sm text-slate-600">
              No campaigns yet. Create one to begin.
            </div>
          ) : (
            <ul className="divide-y">
              {sorted.map((c) => {
                const isActive = c.id === activeId;
                const isRenaming = renamingId === c.id;

                return (
                  <li key={c.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isRenaming ? (
                          <div className="flex gap-2">
                            <input
                              className="w-full rounded-lg border px-3 py-2"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                            />
                            <Button
                              onClick={async () => {
                                setBusyId(c.id);
                                try {
                                  await onRename(c.id, renameValue.trim() || c.name);
                                  setRenamingId(null);
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                              disabled={busyId === c.id}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setRenamingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="truncate text-base font-semibold">
                                {c.name}
                              </div>
                              {isActive ? (
                                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">
                                  Active
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              Updated: {formatDate(c.updatedAt)}
                            </div>
                          </>
                        )}
                      </div>

                      {!isRenaming ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            onClick={async () => {
                              setBusyId(c.id);
                              try {
                                await onLoad(c.id);
                                onClose();
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            disabled={busyId === c.id}
                          >
                            Load
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => {
                              setRenamingId(c.id);
                              setRenameValue(c.name);
                            }}
                          >
                            Rename
                          </Button>

                          <Button
                            variant="outline"
                            onClick={async () => {
                              setBusyId(c.id);
                              try {
                                await onDuplicate(c.id);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            disabled={busyId === c.id}
                          >
                            Duplicate
                          </Button>

                          <Button
                            variant="outline"
                            onClick={async () => {
                              const json = await onExport(c.id);
                              const blob = new Blob([json], { type: "application/json" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `${c.name.replaceAll(/[^\w\-]+/g, "_")}.json`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            Export
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={async () => {
                              const ok = confirm(
                                `Delete campaign "${c.name}"? This cannot be undone.`
                              );
                              if (!ok) return;
                              setBusyId(c.id);
                              try {
                                await onDelete(c.id);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            disabled={busyId === c.id}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-3 text-xs text-slate-600">
          Tip: Autosave happens automatically for the active campaign.
        </div>
        </div>
      </div>
    </div>
  );
}

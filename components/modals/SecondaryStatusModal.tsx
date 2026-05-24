import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useModalAnimation } from "./useModalAnimation";

interface SecondaryStatus {
  name: string;
  turns?: number;
}

interface SecondaryStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  combatant: {
    name: string;
    secondaryStatuses?: SecondaryStatus[];
  };
  updateStatuses: (statuses: SecondaryStatus[]) => void;
}

const VOLATILE_STATUSES = [
  "Confused", "Cursed", "Embargoed", "Flinched", "Identified", "Immobilized",
  "Infatuated", "Slowed", "Trapped", "Grabbed", "Bleeding", "Frightened",
];

const NON_DURATION_STATUSES = ["Identified", "Grabbed"];
const FIXED_TURN_STATUSES: Record<string, number> = { Flinched: 1 };

const SecondaryStatusModal: React.FC<SecondaryStatusModalProps> = ({
  isOpen,
  onClose,
  combatant,
  updateStatuses,
}) => {
  const [statusSearch, setStatusSearch] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);

  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender || !combatant) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  const statuses = combatant.secondaryStatuses || [];

  const handleTurnsChange = (index: number, value: number) => {
    const updated = [...statuses];
    updated[index].turns = value;
    updateStatuses(updated);
  };

  const handleRemoveStatus = (index: number) => {
    const updated = statuses.filter((_, i) => i !== index);
    updateStatuses(updated);
  };

  const handleAddStatus = (status: string) => {
    if (statuses.some((s) => s.name === status)) return;

    let newStatus: SecondaryStatus = { name: status };

    if (FIXED_TURN_STATUSES[status]) {
      newStatus.turns = FIXED_TURN_STATUSES[status];
    } else if (!NON_DURATION_STATUSES.includes(status)) {
      newStatus.turns = 3;
    }

    updateStatuses([...statuses, newStatus]);
    setStatusSearch("");
    setStatusOpen(false);
  };

  const availableStatuses = VOLATILE_STATUSES.filter(
    (status) => !statuses.some((s) => s.name === status)
  );
  const statusSearchValue = statusSearch || "";
  const statusMatches =
    statusSearchValue.length >= 1
      ? availableStatuses.filter((s) =>
          s.toLowerCase().includes(statusSearchValue.toLowerCase())
        )
      : availableStatuses;

  return (
    <div className={`fixed top-1/2 left-1/2 z-50 w-96 bg-gray-800 text-white border border-gray-600 rounded-lg shadow-lg transform -translate-x-1/2 -translate-y-1/2 p-4 ${modalAnimClass}`}>
      <h2 className="text-lg font-bold mb-3 text-center">
        Volatile Statuses for {combatant.name}
      </h2>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {statuses.map((status, index) => (
          <div key={index} className="flex items-center space-x-2">
            <span className="bg-gray-700 px-2 py-1 rounded text-sm">{status.name}</span>

            {!NON_DURATION_STATUSES.includes(status.name) && (
              <input
                type="number"
                className="w-16 p-1 bg-gray-700 text-white text-center rounded"
                value={status.turns ?? ""}
                onChange={(e) =>
                  handleTurnsChange(index, parseInt(e.target.value) || 0)
                }
                disabled={status.name in FIXED_TURN_STATUSES}
              />
            )}

            <button
              onClick={() => handleRemoveStatus(index)}
              className="text-red-400 hover:text-red-600 text-lg leading-none"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add New Status */}
      <div className="mt-4">
        <div className="bg-gray-700 rounded">
          <Command>
            <CommandInput
              placeholder="+ Add Volatile Status"
              className="w-full p-2 bg-gray-700 text-white border-none rounded"
              value={statusSearchValue}
              onValueChange={(val) => {
                setStatusSearch(val);
                setStatusOpen(true);
              }}
              onFocus={() => setStatusOpen(true)}
              onBlur={() => setTimeout(() => setStatusOpen(false), 150)}
            />
            <CommandList className={`max-h-32 overflow-y-auto ${statusOpen ? "" : "hidden"}`}>
              {statusMatches.map((status) => (
                <CommandItem
                  key={status}
                  value={status}
                  onSelect={(val) => handleAddStatus(val)}
                  className="cursor-pointer px-2 py-1 hover:bg-gray-600"
                >
                  {status}
                </CommandItem>
              ))}
              {statusMatches.length === 0 && statusSearchValue.trim() !== "" && (
                <div className="px-2 py-1 text-sm text-gray-300">No results.</div>
              )}
            </CommandList>
          </Command>
        </div>
      </div>

      {/* Close Button */}
      <div className="flex justify-between mt-4">
        <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">
          Close
        </Button>
      </div>
    </div>
  );
};

export default SecondaryStatusModal;


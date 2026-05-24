import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useModalAnimation } from "./useModalAnimation";

interface AddTrainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, notionId: string | null) => void;
}

export default function AddTrainerModal({
  isOpen,
  onClose,
  onConfirm,
}: AddTrainerModalProps) {
  const [name, setName] = useState("");
  const [notionId, setNotionId] = useState("");

  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onConfirm(trimmedName, notionId.trim() || null);
    setName("");
    setNotionId("");
    onClose();
  };

  return (
    <div
      className={`fixed bg-gray-900 text-white border border-gray-500 rounded p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 z-50 ${modalAnimClass}`}
    >
      <h2 className="text-lg font-bold mb-3">Add Trainer</h2>

      <label className="block mb-1">
        Name: <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        className="w-full bg-gray-700 text-white p-1 rounded text-center mb-3"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="block mb-1">Notion ID (optional):</label>
      <input
        type="text"
        className="w-full bg-gray-700 text-white p-1 rounded text-center"
        value={notionId}
        onChange={(e) => setNotionId(e.target.value)}
        placeholder="e.g., 316e9a6e58548052a154f30c8844ee45"
      />

      <div className="flex justify-between mt-4">
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className={`bg-green-500 hover:bg-green-600 ${!name.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!name.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

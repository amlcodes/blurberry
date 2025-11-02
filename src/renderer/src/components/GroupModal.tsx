import { cn } from "@renderer/lib/utils";

import type { GroupColor, GroupInfo } from "@preload/global.d";
import { Check, X } from "lucide-react";
import React, { useEffect, useState } from "react";

const GROUP_COLORS: GroupColor[] = [
  { id: "gray", name: "Gray", hex: "#8E8E93" },
  { id: "red", name: "Red", hex: "#FF3B30" },
  { id: "orange", name: "Orange", hex: "#FF9500" },
  { id: "yellow", name: "Yellow", hex: "#FFCC00" },
  { id: "green", name: "Green", hex: "#34C759" },
  { id: "cyan", name: "Cyan", hex: "#5AC8FA" },
  { id: "blue", name: "Blue", hex: "#007AFF" },
  { id: "purple", name: "Purple", hex: "#AF52DE" },
  { id: "pink", name: "Pink", hex: "#FF2D55" },
];

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, colorId: string) => void;
  existingGroup?: GroupInfo;
  title?: string;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingGroup,
  title = "Create Group",
}) => {
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState<GroupColor>(
    GROUP_COLORS[6],
  );

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingGroup) {
        setGroupTitle(existingGroup.title);
        setSelectedColor(existingGroup.color);
      } else {
        setGroupTitle("");
        setSelectedColor(GROUP_COLORS[6]);
      }
    }
  }, [isOpen, existingGroup]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (groupTitle.trim()) {
      onSave(groupTitle.trim(), selectedColor.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl border border-border w-[400px] max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title Input */}
          <div>
            <label
              htmlFor="group-title"
              className="block text-sm font-medium mb-2"
            >
              Group Name
            </label>
            <input
              id="group-title"
              type="text"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="grid grid-cols-9 gap-2">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "relative size-8 rounded-md transition-all",
                    "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary",
                    selectedColor.id === color.id && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {selectedColor.id === color.id && (
                    <Check className="size-4 text-white absolute inset-0 m-auto drop-shadow-lg" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupTitle.trim()}
              className={cn(
                "px-4 py-2 rounded-md text-white transition-colors",
                groupTitle.trim()
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-primary/50 cursor-not-allowed",
              )}
            >
              {existingGroup ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

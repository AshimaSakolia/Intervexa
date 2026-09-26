"use client";

import { Modal } from "@/components/modal";
import { Spinner } from "@/components/spinner";

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  confirming = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirming?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-ink-soft leading-relaxed mt-1.5">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={confirming}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink-soft transition-all duration-200 ease-out-snap hover:text-ink hover:border-ink-faint hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="rounded-md bg-bad text-white px-4 py-2 text-sm font-medium transition-all duration-200 ease-out-snap hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md hover:shadow-bad/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {confirming ? (
              <span className="inline-flex items-center gap-2">
                <Spinner light />
                Deleting…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

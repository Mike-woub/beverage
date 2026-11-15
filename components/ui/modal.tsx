"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { IconClose } from "@/components/ui/icons";

/**
 * Accessible Modal + ConfirmDialog.
 * Conforms to baseline-ui and fixing-accessibility:
 * - Traps focus while open and restores focus to trigger on close.
 * - Handles Escape key to close without unexpected scroll jumps.
 * - ARIA labelledby and describedby links.
 * - Fast compositor-only entrance (140ms ease-out).
 * - Responsive to mobile dvh.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Set initial focus inside dialog
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        );
        if (focusable) {
          focusable.focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 20);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(timer);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
        previousActiveElement.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(15_23_42_/_0.45)] p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] focus:outline-none",
          width,
        )}
        style={{ animation: "bev-fade-in 140ms ease-out" }}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-balance text-[var(--foreground)]">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-pretty text-[var(--muted-foreground)]">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-[var(--radius-sm)] p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <IconClose size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  tone = "danger",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-pretty text-[var(--muted-foreground)]">{message}</p>
    </Modal>
  );
}

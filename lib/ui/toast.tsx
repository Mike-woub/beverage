"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

/**
 * Toast notifications, now backed by `sonner` (installed). ToastProvider mounts
 * sonner's <Toaster/>; useToast() keeps the same API (success/error/info/warning)
 * so existing call sites are unchanged.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SonnerToaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: "var(--radius)",
          },
        }}
      />
    </>
  );
}

export function useToast() {
  return {
    success: (m: string) => sonnerToast.success(m),
    error: (m: string) => sonnerToast.error(m),
    info: (m: string) => sonnerToast.info(m),
    warning: (m: string) => sonnerToast.warning(m),
  };
}

"use client";

import { SessionProvider as NextAuthProvider } from "next-auth/react";
import { QueryClientProvider } from "@/lib/query/query-client";
import { SessionProvider } from "@/lib/auth/session";
import { ToastProvider } from "@/lib/ui/toast";

/**
 * App providers. NextAuth's provider (for the client signIn/getSession helpers)
 * wraps our own SessionProvider (the app-wide useSession the UI consumes), the
 * query cache, and the toaster.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthProvider>
      <SessionProvider>
        <QueryClientProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </SessionProvider>
    </NextAuthProvider>
  );
}

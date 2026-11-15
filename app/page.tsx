"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, homeRouteFor } from "@/lib/auth/session";
import { Spinner } from "@/components/ui/primitives";

/**
 * Root entry. Routes to the role's home when authenticated, otherwise to login.
 * Kept client-side because auth state lives in the session context (the skill
 * guards areas on the client via useSession).
 */
export default function Home() {
  const { status, user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace(homeRouteFor(user?.role));
    else if (status === "unauthenticated") router.replace("/login");
  }, [status, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={28} />
    </div>
  );
}

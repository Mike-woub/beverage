import { signIn, signOut, getSession } from "next-auth/react";
import type { LoginDTO, SessionUser } from "@/lib/types";

/**
 * Auth service — now backed by NextAuth v4 (Credentials + JWT). signIn hits the
 * [...nextauth] route handler; getSession reads the current JWT session.
 */
export const authService = {
  login: async (dto: LoginDTO): Promise<SessionUser> => {
    const res = await signIn("credentials", {
      username: dto.username,
      password: dto.password,
      redirect: false,
    });
    if (!res || res.error) {
      throw new Error(res?.error && res.error !== "CredentialsSignin" ? res.error : "Invalid username or password");
    }
    const session = await getSession();
    if (!session?.user) throw new Error("Could not establish a session");
    return {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role,
    };
  },

  logout: async (): Promise<void> => {
    await signOut({ redirect: false });
  },

  me: async (): Promise<SessionUser | null> => {
    const session = await getSession();
    if (!session?.user) return null;
    return {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role,
    };
  },
};

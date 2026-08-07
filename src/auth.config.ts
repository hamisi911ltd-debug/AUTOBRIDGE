import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base config (no Credentials provider here — that needs bcrypt +
 * Prisma, which can't run in the Edge middleware runtime). middleware.ts
 * uses this directly; auth.ts extends it with the real provider for
 * Node-runtime contexts (route handlers, server components, server actions).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

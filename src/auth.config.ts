import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@prisma/client";

// Reference imported types so TS treats the modules as loaded for augmentation.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _refJWT = JWT;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      employeeId: string;
      roles: Role[];
      mustChangePassword: boolean;
    } & import("next-auth").DefaultSession["user"];
  }

  interface User {
    employeeId: string;
    roles: Role[];
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    employeeId: string;
    roles: Role[];
    mustChangePassword: boolean;
  }
}

// Edge-safe config (no DB / no bcrypt) used by middleware.
// The Credentials provider lives in auth.ts because it needs Node APIs.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.employeeId = user.employeeId;
        token.roles = user.roles;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.employeeId = token.employeeId;
      session.user.roles = token.roles;
      session.user.mustChangePassword = token.mustChangePassword;
      return session;
    },
  },
} satisfies NextAuthConfig;

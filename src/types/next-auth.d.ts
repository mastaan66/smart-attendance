import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import type { UserRole } from "@/types/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      tenantId: string;
      isBiometricVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: UserRole;
    tenantId: string;
    isBiometricVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    tenantId: string;
    isBiometricVerified: boolean;
  }
}

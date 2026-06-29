export const USER_ROLES = ["ADMIN", "TEACHER", "STUDENT"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(role: string): role is UserRole {
  return USER_ROLES.some((candidate) => candidate === role);
}

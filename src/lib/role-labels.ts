import type { UserRole } from "@/types";

/** Українські назви ролей для UI (узгоджено з бізнес-логікою маркетплейсу). */
export const ROLE_LABEL_UK: Record<UserRole, string> = {
  member: "Новий учасник",
  buyer: "Покупець",
  provider: "Продавець",
  entrepreneur: "Підприємець",
  admin: "Адміністратор",
};

export function roleLabelUk(role: string): string {
  return ROLE_LABEL_UK[role as UserRole] ?? role;
}

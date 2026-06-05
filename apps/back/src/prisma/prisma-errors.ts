/** True for a Prisma unique-constraint violation (P2002), optionally on a given field. */
export const isUniqueViolation = (error: unknown, field?: string): boolean => {
  const e = error as { code?: string; meta?: { target?: unknown } };
  if (e?.code !== "P2002") return false;
  if (!field) return true;
  const target = e.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? "").includes(field);
};

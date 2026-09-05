type ClassValue = string | number | null | undefined | false;

/** Join truthy class values with a space. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

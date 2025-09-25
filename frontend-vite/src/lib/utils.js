// Combines class names safely (ignores false, null, undefined)
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// First code version (keeping for reference)
// export function cn(...classes) {   
//   return classes.filter(Boolean).join(" "); 
// }
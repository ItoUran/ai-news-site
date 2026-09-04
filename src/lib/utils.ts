import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwindクラスをマージするユーティリティ(shadcn/ui定番パターン) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

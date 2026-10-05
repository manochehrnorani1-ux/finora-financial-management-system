import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const toEnglishDigits = (str: string) => {
  if (!str) return str;
  return str.replace(/[۰-۹]/g, d => '0123456789'[d.charCodeAt(0) - 1776]).replace(/[٠-٩]/g, d => '0123456789'[d.charCodeAt(0) - 1632]);
};

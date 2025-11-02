import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};

/**
 * Extract favicon URL from a given URL
 * @param url - The URL to extract the favicon from
 * @param size - The size of the favicon (default: 32)
 * @returns The favicon URL or null if invalid
 */
export const getFavicon = (url: string, size: number = 32): string | null => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return null;
  }
};

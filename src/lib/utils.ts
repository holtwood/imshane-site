import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function formatDateShort(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function readingTime(html: string) {
  const textOnly = html.replace(/<[^>]+>/g, "");
  const cjkChars = (textOnly.match(/[一-鿿　-鿽＀-￯]/g) || []).length;
  const latinWords = textOnly
    .replace(/[一-鿿　-鿽＀-￯]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.round(cjkChars / 400 + latinWords / 200));
  return `约 ${minutes} 分钟`;
}

export function yearRange(startYear: number, endYear?: number | string): string {
  return `${startYear} — ${endYear ?? "Present"}`;
}

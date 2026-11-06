import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

export function formatDateShort(date: Date) {
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

export function readingMinutes(html: string) {
  const textOnly = html.replace(/<[^>]+>/g, "");
  const cjkChars = (textOnly.match(/\p{Script=Han}/gu) || []).length;
  const latinWords = textOnly
    .replace(/\p{Script=Han}/gu, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(cjkChars / 400 + latinWords / 200));
}

export function readingTime(html: string) {
  return `约 ${readingMinutes(html)} 分钟`;
}

export function yearRange(startYear: number, endYear?: number | string): string {
  return `${startYear} — ${endYear ?? "Present"}`;
}

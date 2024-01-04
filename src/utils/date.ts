import { format as _formatDate } from "date-fns";
import { it as itLocale } from "date-fns/locale/it";

type Options =
  | {
      style: "short" | "long";
      format?: undefined;
    }
  | {
      style?: undefined;
      format: string;
    };

export function formatDate(date: Date | string, options?: Options): string {
  const format = options?.format ?? (options?.style === "short" ? "P" : "PPP");
  return _formatDate(date, format, { locale: itLocale });
}

export function formatTime(date: Date | string): string {
  return _formatDate(date, "p", { locale: itLocale });
}

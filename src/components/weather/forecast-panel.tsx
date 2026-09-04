import type { NormalizedForecast } from "@/types/weather";
import { weatherCodeToEmoji } from "@/lib/weather/jma";

export function ForecastPanel({ forecast }: { forecast: NormalizedForecast }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-5">
        <h3 className="font-heading text-lg font-bold mb-2">{forecast.areaName}の概況</h3>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
          {forecast.overviewText || "概況情報を取得できませんでした。"}
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          発表: {forecast.publishingOffice} ({formatDate(forecast.reportDatetime)})
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {forecast.days.map((day) => (
          <div
            key={day.date}
            className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col items-center gap-1 text-center"
          >
            <span className="text-xs text-muted-foreground">{formatShortDate(day.date)}</span>
            <span className="text-3xl" aria-hidden>
              {weatherCodeToEmoji(day.weatherCode)}
            </span>
            <span className="text-xs">{day.weatherText ?? "-"}</span>
            <div className="flex items-center gap-1.5 text-sm mt-1">
              {day.tempMin !== null && (
                <span className="text-blue-600 dark:text-blue-400">{day.tempMin}°</span>
              )}
              {day.tempMax !== null && (
                <span className="text-rose-600 dark:text-rose-400">{day.tempMax}°</span>
              )}
            </div>
            {day.pop !== null && (
              <span className="text-xs text-muted-foreground">降水確率 {day.pop}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(iso));
}

function formatShortDate(iso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(
    new Date(iso),
  );
}

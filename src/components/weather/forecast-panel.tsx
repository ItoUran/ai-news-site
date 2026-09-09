import type { NormalizedForecast } from "@/types/weather";
import { getJmaWeatherIconUrl } from "@/config/jma-weather-icons";
import { WeatherTimeline } from "./weather-timeline";

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

      <WeatherTimeline points={forecast.timeline} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {forecast.days.map((day) => (
          <div
            key={day.date}
            className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col items-center gap-1 text-center"
          >
            <span className="text-xs text-muted-foreground">{formatShortDate(day.date)}</span>
            {getJmaWeatherIconUrl(day.weatherCode) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getJmaWeatherIconUrl(day.weatherCode)!}
                alt={day.weatherText ?? ""}
                className="size-10"
              />
            ) : (
              <span className="text-3xl" aria-hidden>
                ❓
              </span>
            )}
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

// 本番(Vercel)はサーバーのタイムゾーンがUTCのため、timeZoneを明示しないと
// JST 0時始まりの日付が日本時間より1日ずれて表示されてしまう(ローカル開発機は
// 既にJSTのため気づきにくい)。日付を扱う箇所は必ず timeZone: "Asia/Tokyo" を指定する。
function formatDate(iso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(iso));
}

function formatShortDate(iso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(iso));
}

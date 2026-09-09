import type { TimelinePoint } from "@/types/weather";
import { getJmaWeatherIconUrl } from "@/config/jma-weather-icons";

const timeFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "numeric",
});
const dayLabelFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
});
const dayKeyFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function WeatherTimeline({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) return null;

  const todayKey = dayKeyFormat.format(new Date());

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-5">
      <h3 className="font-heading text-lg font-bold mb-1">天気の移り変わり</h3>
      <p className="text-xs text-muted-foreground mb-4">
        今日〜明日にかけての降水確率の変化です(気象庁の予報データの都合上、天気コード自体は
        日単位のため、アイコンは該当する日の代表的な天気を表示しています)。
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {points.map((point, i) => {
          const date = new Date(point.time);
          const dateKey = dayKeyFormat.format(date);
          // 日付が変わる区切りにだけ日付ラベルを添える(それ以外は時刻のみ)
          const showDayLabel = i === 0 || dateKey !== dayKeyFormat.format(new Date(points[i - 1].time));
          const iconUrl = getJmaWeatherIconUrl(point.weatherCode);

          return (
            <div
              key={point.time}
              className="flex flex-col items-center gap-1 shrink-0 w-16 text-center"
            >
              <span className="text-[0.65rem] text-muted-foreground h-3">
                {showDayLabel ? (dateKey === todayKey ? "今日" : dayLabelFormat.format(date)) : ""}
              </span>
              <span className="text-xs font-medium">{timeFormat.format(date)}時</span>
              {iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={iconUrl} alt="" className="size-8" />
              ) : (
                <span className="size-8 flex items-center justify-center text-muted-foreground">?</span>
              )}
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {point.pop !== null ? `${point.pop}%` : "-"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

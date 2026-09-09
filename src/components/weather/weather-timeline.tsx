import { Fragment } from "react";
import type { TimelinePoint } from "@/types/weather";
import { getJmaWeatherIconUrl } from "@/config/jma-weather-icons";

// ja-JPロケールの hour:"numeric" は既に「時」を含む表記("12時")を返すため、
// 追加で「時」を付け足さない(以前ここが二重表記になっていたバグの原因)。
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

/** 降水確率が高いほど濃くなるバーの色(見た目の強弱で直感的に伝える) */
function popBarClass(pop: number | null): string {
  if (pop === null) return "bg-muted";
  if (pop >= 70) return "bg-blue-600 dark:bg-blue-500";
  if (pop >= 40) return "bg-blue-400 dark:bg-blue-400/80";
  return "bg-blue-200 dark:bg-blue-900";
}

export function WeatherTimeline({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) return null;

  const todayKey = dayKeyFormat.format(new Date());

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-5 sm:p-6">
      <h3 className="font-heading text-lg font-bold mb-1">天気の移り変わり</h3>
      <p className="text-xs text-muted-foreground mb-5">
        今日〜明日にかけての降水確率の変化です(気象庁の予報データの都合上、天気コード自体は
        日単位のため、アイコンは該当する日の代表的な天気を表示しています)。
      </p>

      <div className="flex overflow-x-auto -mx-1 px-1 pb-1">
        {points.map((point, i) => {
          const date = new Date(point.time);
          const dateKey = dayKeyFormat.format(date);
          const prevDateKey = i > 0 ? dayKeyFormat.format(new Date(points[i - 1].time)) : null;
          const isNewDay = i === 0 || dateKey !== prevDateKey;
          const iconUrl = getJmaWeatherIconUrl(point.weatherCode);
          const dayLabel = dateKey === todayKey ? "今日" : dayLabelFormat.format(date);

          return (
            <Fragment key={point.time}>
              {/* 日付が変わる区切りに縦線を入れて、視覚的にも区切りが分かるようにする */}
              {isNewDay && i > 0 && (
                <div className="w-px shrink-0 bg-border mx-2 self-stretch" aria-hidden />
              )}
              <div className="flex flex-col items-center gap-2 shrink-0 w-20 sm:w-24 text-center px-1">
                <span
                  className={
                    isNewDay
                      ? "text-xs font-bold text-primary h-4"
                      : "text-xs text-transparent h-4"
                  }
                >
                  {isNewDay ? dayLabel : "-"}
                </span>
                <span className="text-sm font-semibold">{timeFormat.format(date)}</span>
                {iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconUrl} alt="" className="size-11 sm:size-12" />
                ) : (
                  <span className="size-11 sm:size-12 flex items-center justify-center text-muted-foreground text-2xl">
                    ?
                  </span>
                )}
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {point.pop !== null ? `${point.pop}%` : "-"}
                </span>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${popBarClass(point.pop)}`}
                    style={{ width: `${point.pop ?? 0}%` }}
                  />
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

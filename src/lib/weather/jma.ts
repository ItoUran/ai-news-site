import type {
  JmaForecastReport,
  JmaOverviewForecast,
  NormalizedForecast,
  DailyForecast,
} from "@/types/weather";
import { findJmaArea, DEFAULT_AREA_CODE } from "@/config/jma-areas";

const FORECAST_BASE = "https://www.jma.go.jp/bosai/forecast/data/forecast";
const OVERVIEW_BASE = "https://www.jma.go.jp/bosai/forecast/data/overview_forecast";

/** 30分キャッシュでJMAの予報JSONを取得し、UI表示用の形へ正規化する */
export async function getNormalizedForecast(
  areaCode: string = DEFAULT_AREA_CODE,
): Promise<NormalizedForecast> {
  const code = findJmaArea(areaCode) ? areaCode : DEFAULT_AREA_CODE;

  const [forecastRes, overviewRes] = await Promise.all([
    fetch(`${FORECAST_BASE}/${code}.json`, { next: { revalidate: 1800 } }),
    fetch(`${OVERVIEW_BASE}/${code}.json`, { next: { revalidate: 1800 } }),
  ]);

  if (!forecastRes.ok) {
    throw new Error(`JMA forecast fetch failed: ${forecastRes.status}`);
  }

  const forecastReports = (await forecastRes.json()) as JmaForecastReport[];
  const overview = overviewRes.ok
    ? ((await overviewRes.json()) as JmaOverviewForecast)
    : null;

  const days = normalizeDays(forecastReports);
  const areaName = findJmaArea(code)?.name ?? code;

  return {
    areaCode: code,
    areaName,
    publishingOffice: forecastReports[0]?.publishingOffice ?? "",
    reportDatetime: forecastReports[0]?.reportDatetime ?? "",
    overviewText: overview?.text ?? "",
    days,
  };
}

/**
 * JMAのレスポンスは「短期(時系列の細かいデータ)」と「週間(1日単位)」の
 * 複数レポートが配列で返る。ここでは週間側の pops/temps/weatherCodes を使い、
 * 直近7日分の日別予報に正規化する。
 */
function normalizeDays(reports: JmaForecastReport[]): DailyForecast[] {
  // reports[0] = 短期(今日明日の詳細), reports[1] = 週間(1週間分) というのが典型的な構造
  const weekly = reports[1] ?? reports[0];
  if (!weekly) return [];

  const weatherSeries = weekly.timeSeries.find((ts) =>
    ts.areas.some((a) => Array.isArray(a.weatherCodes)),
  );
  const popSeries = weekly.timeSeries.find((ts) => ts.areas.some((a) => Array.isArray(a.pops)));
  const tempSeries = weekly.timeSeries.find((ts) =>
    ts.areas.some((a) => Array.isArray(a.tempsMin) || Array.isArray(a.tempsMax)),
  );

  const weatherArea = weatherSeries?.areas[0];
  const popArea = popSeries?.areas[0];
  const tempArea = tempSeries?.areas[0];

  const timeDefines = weatherSeries?.timeDefines ?? popSeries?.timeDefines ?? [];

  return timeDefines.map((date, i) => ({
    date,
    weatherCode: weatherArea?.weatherCodes?.[i] ?? null,
    weatherText: weatherArea?.weathers?.[i]?.trim() ?? null,
    pop: popArea?.pops?.[i] ? Number(popArea.pops[i]) : null,
    tempMin: tempArea?.tempsMin?.[i] ? Number(tempArea.tempsMin[i]) : null,
    tempMax: tempArea?.tempsMax?.[i] ? Number(tempArea.tempsMax[i]) : null,
  }));
}

/** JMAの天気コード(3桁)を簡易的な絵文字にマッピング(代表的なもののみ) */
export function weatherCodeToEmoji(code: string | null): string {
  if (!code) return "❓";
  const c = code.padStart(3, "0");
  if (c.startsWith("1")) return "☀️"; // 晴
  if (c.startsWith("2")) return "☁️"; // 曇
  if (c.startsWith("3")) return "☁️";
  if (c.startsWith("4") || c.startsWith("5")) return "🌧️"; // 雨
  if (c.startsWith("6") || c.startsWith("7")) return "❄️"; // 雪
  if (c.startsWith("8")) return "⛈️"; // 雷
  return "🌤️";
}

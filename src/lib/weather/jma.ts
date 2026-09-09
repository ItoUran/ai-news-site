import type {
  JmaForecastReport,
  JmaOverviewForecast,
  JmaTimeSeries,
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

function findSeries(
  report: JmaForecastReport | undefined,
  predicate: (ts: JmaTimeSeries) => boolean,
) {
  return report?.timeSeries.find(predicate);
}

/**
 * JMAのレスポンスは複数のレポートが配列で返る。典型的には
 * reports[0] = 短期予報(今日・明日・明後日の詳細、時間帯単位の降水確率つき)
 * reports[1] = 週間予報(1日単位、7日分だが「明日」から始まり「今日」を含まない)
 * という構造になっている。週間側だけを使うと「今日」が抜け落ちてしまうため、
 * 短期予報から「今日」の天気コード・降水確率を作って先頭に補う。
 * (今日分の最高・最低気温は短期予報側の構造が地点別の生値でありtempsMin/tempsMaxの
 * ような明確な最高・最低の形になっていないため、誤った値を出すより「-」表示の方が
 * 安全と判断し、あえて含めない)
 */
function normalizeDays(reports: JmaForecastReport[]): DailyForecast[] {
  const shortTerm = reports[0];
  const weekly = reports[1] ?? reports[0];
  if (!weekly) return [];

  const weatherSeries = findSeries(weekly, (ts) => ts.areas.some((a) => Array.isArray(a.weatherCodes)));
  const tempSeries = findSeries(
    weekly,
    (ts) => ts.areas.some((a) => Array.isArray(a.tempsMin) || Array.isArray(a.tempsMax)),
  );

  const weatherArea = weatherSeries?.areas[0];
  const tempArea = tempSeries?.areas[0];
  const timeDefines = weatherSeries?.timeDefines ?? [];

  const weeklyDays: DailyForecast[] = timeDefines.map((date, i) => ({
    date,
    weatherCode: weatherArea?.weatherCodes?.[i] ?? null,
    weatherText: weatherArea?.weathers?.[i]?.trim() ?? null,
    pop: weatherArea?.pops?.[i] ? Number(weatherArea.pops[i]) : null,
    tempMin: tempArea?.tempsMin?.[i] ? Number(tempArea.tempsMin[i]) : null,
    tempMax: tempArea?.tempsMax?.[i] ? Number(tempArea.tempsMax[i]) : null,
  }));

  const todayDay = buildTodayFromShortTerm(shortTerm);
  if (!todayDay) return weeklyDays;

  const todayKey = todayDay.date.slice(0, 10);
  const restDays = weeklyDays.filter((d) => d.date.slice(0, 10) !== todayKey);
  return [todayDay, ...restDays];
}

function buildTodayFromShortTerm(shortTerm: JmaForecastReport | undefined): DailyForecast | null {
  if (!shortTerm) return null;

  const weatherSeries = findSeries(shortTerm, (ts) => ts.areas.some((a) => Array.isArray(a.weatherCodes)));
  const popSeries = findSeries(shortTerm, (ts) => ts.areas.some((a) => Array.isArray(a.pops)));

  const weatherArea = weatherSeries?.areas[0];
  const popArea = popSeries?.areas[0];
  const todayDate = weatherSeries?.timeDefines?.[0];
  const todayCode = weatherArea?.weatherCodes?.[0];

  if (!todayDate || !todayCode) return null;

  return {
    date: todayDate,
    weatherCode: todayCode,
    weatherText: weatherArea?.weathers?.[0]?.trim() ?? null,
    // 短期予報の降水確率は数時間刻みなので、先頭(現在時刻以降で最初の区間)を
    // 「今日の降水確率」の目安として使う。
    pop: popArea?.pops?.[0] ? Number(popArea.pops[0]) : null,
    tempMin: null,
    tempMax: null,
  };
}

/** JMA `forecast/data/forecast/{code}.json` レスポンスの必要部分だけを型付け */

export type JmaTimeSeriesArea = {
  area: { name: string; code: string };
  weatherCodes?: string[];
  weathers?: string[];
  winds?: string[];
  waves?: string[];
  pops?: string[]; // 降水確率(%)
  temps?: string[];
  tempsMin?: string[];
  tempsMax?: string[];
};

export type JmaTimeSeries = {
  timeDefines: string[];
  areas: JmaTimeSeriesArea[];
};

export type JmaForecastReport = {
  publishingOffice: string;
  reportDatetime: string;
  timeSeries: JmaTimeSeries[];
};

export type JmaOverviewForecast = {
  publishingOffice: string;
  reportDatetime: string;
  targetArea: string;
  headlineText: string;
  text: string;
};

/** UI表示用に正規化した1日分の予報 */
export type DailyForecast = {
  date: string; // ISO date
  weatherCode: string | null;
  weatherText: string | null;
  pop: number | null; // 降水確率
  tempMin: number | null;
  tempMax: number | null;
};

/** 今日〜明日にかけての、短期予報由来の6時間刻みタイムライン(降水確率+その時点の天気コード) */
export type TimelinePoint = {
  time: string; // ISO
  pop: number | null;
  weatherCode: string | null;
};

export type NormalizedForecast = {
  areaCode: string;
  areaName: string;
  publishingOffice: string;
  reportDatetime: string;
  overviewText: string;
  days: DailyForecast[];
  timeline: TimelinePoint[];
};

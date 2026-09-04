import { createClient } from "@/lib/supabase/server";
import { getNormalizedForecast } from "@/lib/weather/jma";
import { DEFAULT_AREA_CODE } from "@/config/jma-areas";
import { AreaSelector } from "@/components/weather/area-selector";
import { ForecastPanel } from "@/components/weather/forecast-panel";

export default async function WeatherPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let areaCode = area ?? DEFAULT_AREA_CODE;

  // URLにareaが無い場合、ログインユーザーは保存済みの希望エリアを使う
  if (!area && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_area_code")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.preferred_area_code) areaCode = profile.preferred_area_code;
  }

  const forecast = await getNormalizedForecast(areaCode);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-heading text-2xl font-bold">気象予報</h2>
        <AreaSelector currentCode={forecast.areaCode} isLoggedIn={!!user} />
      </div>
      <ForecastPanel forecast={forecast} />
    </div>
  );
}

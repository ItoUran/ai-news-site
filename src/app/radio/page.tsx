import { getRadioEpisodes } from "@/lib/radio";
import { RadioEpisodeCard } from "@/components/radio/episode-card";
import type { RadioEpisodeRow } from "@/types/database";

export const revalidate = 300;

// 本番(Vercel)はサーバーのタイムゾーンがUTCのため、timeZoneを明示しないと
// JST基準の日付が1日ずれる(ローカル開発機は既にJSTのため気づきにくい)。
const dayKeyFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateLabelFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "long",
  day: "numeric",
  weekday: "short",
});

function dateLabel(target: Date, now: Date): string {
  const dayMs = 24 * 60 * 60 * 1000;
  const targetKey = dayKeyFormat.format(target);
  const todayKey = dayKeyFormat.format(now);
  const yesterdayKey = dayKeyFormat.format(new Date(now.getTime() - dayMs));

  const label = dateLabelFormat.format(target);
  if (targetKey === todayKey) return `今日・${label}`;
  if (targetKey === yesterdayKey) return `昨日・${label}`;
  return label;
}

/** 新しい順に並んだエピソードを、公開日(カレンダー日)ごとにグループ化する */
function groupByDate(
  episodes: RadioEpisodeRow[],
): { key: string; label: string; episodes: RadioEpisodeRow[] }[] {
  const now = new Date();
  const groups: { key: string; label: string; episodes: RadioEpisodeRow[] }[] = [];

  for (const episode of episodes) {
    const published = new Date(episode.published_at);
    const key = dayKeyFormat.format(published);
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.episodes.push(episode);
    } else {
      groups.push({ key, label: dateLabel(published, now), episodes: [episode] });
    }
  }

  return groups;
}

export default async function RadioPage() {
  const episodes = await getRadioEpisodes();
  const groups = groupByDate(episodes);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">ラジオ</h2>
        <p className="text-sm text-muted-foreground mt-1">
          AIがその日のニュースをまとめて読み上げる音声番組です(1日3回・6時/12時/18時ごろ更新、
          直近1週間分を保持)。世間の反応への言及はAIによる推測であり、実際の投稿の引用ではありません。
        </p>
      </div>

      {episodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
          <p>まだ配信されたエピソードがありません。</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-2xl">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <h3 className="font-heading text-sm font-bold text-muted-foreground border-b border-border pb-2">
                {group.label}
              </h3>
              <div className="flex flex-col gap-4">
                {group.episodes.map((episode) => (
                  <RadioEpisodeCard key={episode.id} episode={episode} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { getRadioEpisodes } from "@/lib/radio";
import { RadioEpisodeCard } from "@/components/radio/episode-card";

export const revalidate = 300;

export default async function RadioPage() {
  const episodes = await getRadioEpisodes();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">ラジオ</h2>
        <p className="text-sm text-muted-foreground mt-1">
          AIがその日のニュースをまとめて読み上げる音声番組です(1日3回・6時/12時/18時ごろ更新)。
          世間の反応への言及はAIによる推測であり、実際の投稿の引用ではありません。
        </p>
      </div>

      {episodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
          <p>まだ配信されたエピソードがありません。</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-2xl">
          {episodes.map((episode) => (
            <RadioEpisodeCard key={episode.id} episode={episode} />
          ))}
        </div>
      )}
    </div>
  );
}

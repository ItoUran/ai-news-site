"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronDown, ChevronUp, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RadioEpisodeRow } from "@/types/database";

export function RadioEpisodeCard({ episode }: { episode: RadioEpisodeRow }) {
  const [showScript, setShowScript] = useState(false);
  const relativeTime = formatDistanceToNow(new Date(episode.published_at), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 text-primary p-2 shrink-0">
          <Radio className="size-5" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold">{episode.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{relativeTime}</p>
        </div>
      </div>

      <audio controls preload="none" className="w-full" src={episode.audio_url}>
        お使いのブラウザは音声再生に対応していません。
      </audio>

      <div>
        <Button variant="ghost" size="sm" onClick={() => setShowScript((v) => !v)}>
          {showScript ? (
            <>
              <ChevronUp className="size-4" />
              台本を閉じる
            </>
          ) : (
            <>
              <ChevronDown className="size-4" />
              台本を読む
            </>
          )}
        </Button>
        {showScript && (
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {episode.script}
          </p>
        )}
      </div>
    </div>
  );
}

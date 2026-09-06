"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReactionState = "none" | "liked" | "disliked";

/** 気に入った/気に入らない/ブックマークをまとめた反応ボタン群(いずれもログイン必須)。 */
export function ArticleReactions({
  articleId,
  initialState = "none",
  initialBookmarked = false,
}: {
  articleId: string;
  initialState?: ReactionState;
  initialBookmarked?: boolean;
}) {
  const [state, setState] = useState<ReactionState>(initialState);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function sendAction(
    action: "like" | "unlike" | "dislike" | "undislike" | "bookmark" | "unbookmark",
  ) {
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, action }),
    });

    if (res.status === 401) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return false;
    }
    return res.ok;
  }

  function handleLike() {
    const next = state === "liked" ? "none" : "liked";
    const prev = state;
    setState(next);
    startTransition(async () => {
      const ok = await sendAction(next === "liked" ? "like" : "unlike");
      if (!ok) setState(prev);
    });
  }

  function handleDislike() {
    const next = state === "disliked" ? "none" : "disliked";
    const prev = state;
    setState(next);
    startTransition(async () => {
      const ok = await sendAction(next === "disliked" ? "dislike" : "undislike");
      if (!ok) setState(prev);
    });
  }

  function handleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const ok = await sendAction(next ? "bookmark" : "unbookmark");
      if (!ok) setBookmarked(!next);
    });
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={handleLike}
        aria-pressed={state === "liked"}
        className={cn(state === "liked" && "border-primary text-primary bg-primary/10")}
      >
        <ThumbsUp className="size-3.5" />
        気に入った
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={handleDislike}
        aria-pressed={state === "disliked"}
        className={cn(
          state === "disliked" &&
            "border-blue-600! text-blue-600! bg-blue-600/10! dark:border-blue-500! dark:text-blue-500!",
        )}
      >
        <ThumbsDown className="size-3.5" />
        気に入らない
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={pending}
        onClick={handleBookmark}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "ブックマークを解除" : "ブックマークに追加"}
        title={bookmarked ? "ブックマークを解除" : "ブックマークに追加"}
        className={cn(
          bookmarked &&
            "border-amber-500! text-amber-500! bg-amber-500/10! dark:border-amber-400! dark:text-amber-400!",
        )}
      >
        <Bookmark className={cn("size-3.5", bookmarked && "fill-current")} />
      </Button>
    </div>
  );
}

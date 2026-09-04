"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h2 className="font-heading text-xl font-bold">問題が発生しました</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        ページの表示中にエラーが発生しました。しばらくしてから再度お試しください。
      </p>
      <Button onClick={() => reset()}>再読み込み</Button>
    </div>
  );
}

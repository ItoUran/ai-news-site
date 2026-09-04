"use client";

import { useRouter } from "next/navigation";
import { jmaAreas } from "@/config/jma-areas";

export function AreaSelector({
  currentCode,
  isLoggedIn,
}: {
  currentCode: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();

  function handleChange(code: string) {
    if (isLoggedIn) {
      fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_area_code: code }),
      }).catch(() => {});
    } else {
      try {
        window.localStorage.setItem("preferred_area_code", code);
      } catch {
        // localStorageが使えない環境では無視
      }
    }
    router.push(`/weather?area=${code}`);
  }

  return (
    <select
      className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
      value={currentCode}
      onChange={(e) => handleChange(e.target.value)}
    >
      {jmaAreas.map((area) => (
        <option key={area.code} value={area.code}>
          {area.name}
        </option>
      ))}
    </select>
  );
}

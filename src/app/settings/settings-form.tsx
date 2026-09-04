"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { jmaAreas } from "@/config/jma-areas";

export function SettingsForm({
  email,
  displayName: initialDisplayName,
  preferredAreaCode: initialAreaCode,
}: {
  email: string;
  displayName: string;
  preferredAreaCode: string;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [areaCode, setAreaCode] = useState(initialAreaCode);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName, preferred_area_code: areaCode }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5 rounded-xl bg-card ring-1 ring-foreground/10 p-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">メールアドレス</Label>
        <Input id="email" value={email} disabled />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">表示名</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="area">気象予報のデフォルトエリア</Label>
        <select
          id="area"
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value)}
        >
          {jmaAreas.map((area) => (
            <option key={area.code} value={area.code}>
              {area.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          保存する
        </Button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">保存しました</span>}
      </div>
    </form>
  );
}

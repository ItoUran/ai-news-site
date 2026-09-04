"use client";

import Link from "next/link";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  displayName,
  avatarUrl,
}: {
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const initial = (displayName ?? "U").slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="ユーザーメニュー"
          >
            <Avatar className="size-8">
              <AvatarImage src={avatarUrl ?? undefined} alt="" />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-sm font-medium truncate max-w-48">
          {displayName ?? "ユーザー"}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings className="size-4" />
          設定
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post" className="w-full">
          <DropdownMenuItem
            render={
              <button type="submit" className="w-full text-left">
                <LogOut className="size-4" />
                ログアウト
              </button>
            }
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LoginButton() {
  return (
    <Button
      size="sm"
      variant="default"
      nativeButton={false}
      render={
        <Link href="/login">
          <UserIcon className="size-4" />
          ログイン
        </Link>
      }
    />
  );
}

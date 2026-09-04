import "server-only";
import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGeminiClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return client;
}

// gemini-3.5-flash-lite: 実機で無料枠(クレジットカード登録なし)での動作を確認済みのモデル。
// (gemini-2.5-flash-lite は新規ユーザーには提供終了済み。gemini-3.8-flash は動作確認しておらず、
//  未検証のため使用していない。)
// なお、web検索(google_search)ツールは無料枠のみのアカウントだと429エラーになり、
// Google Cloud側の課金設定(Billing有効化)が必要と判明したため、
// ENABLE_WEB_SEARCH_FACTCHECK は既定でfalseにしてある(pipeline.ts参照)。
// 精度を優先する場合は .env.local の GEMINI_MODEL で gemini-3.5-flash 等に変更可能
// (ただし無料枠の実際の挙動は変更前に少量でテストすることを推奨)。
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

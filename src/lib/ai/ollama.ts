// scripts/ingest-local.ts (tsx実行、Next.jsビルドを介さない)からも使うため
// "server-only" は付けない(shared.ts参照)。
import { Ollama } from "ollama";

let client: Ollama | null = null;

export function getOllamaClient() {
  if (!client) {
    client = new Ollama({ host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434" });
  }
  return client;
}

// qwen3:8b: RTX 3060 12GB クラスのGPUで実機動作確認済み(Q4量子化で約5.2GB)。
// 日本語を含む多言語性能が高く、Ollamaの構造化出力(format)にも対応。
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";

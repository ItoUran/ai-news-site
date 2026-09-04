// scripts/generate-radio.ts からのみ使う想定のため "server-only" は付けない
// (src/lib/ai/shared.ts参照)。
import { getOllamaClient, OLLAMA_MODEL } from "@/lib/ai/ollama";
import type { ArticleRow } from "@/types/database";
import { CATEGORY_META } from "@/types/article";

export type RadioScriptResult = {
  title: string;
  script: string;
};

const scriptJsonSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "この回のタイトル(20字程度、例: 「9月4日 朝のニュースまとめ」)",
    },
    script: {
      type: "string",
      description: "読み上げ用のラジオ台本本文(日本語、話し言葉)",
    },
  },
  required: ["title", "script"],
};

function buildPrompt(articles: ArticleRow[], dateLabel: string): string {
  const articleList = articles
    .map((a, i) => {
      const category = CATEGORY_META[a.category]?.label ?? a.category;
      return `${i + 1}. [${category}] ${a.translated_title}\n   ${a.translated_summary}`;
    })
    .join("\n\n");

  return `あなたは日本語のニュースラジオ番組のパーソナリティです。以下は${dateLabel}に収集されたニュース記事の一覧です。
これをもとに、ラジオで読み上げる自然な話し言葉の台本を作成してください。

# 今日のニュース一覧
${articleList}

# 台本作成の指示
1. 冒頭に短い挨拶(番組名は「AIニュースラジオ」)と日付を入れてください。
2. 主要なトピックを3〜6件ほど選び、それぞれ自然な話し言葉で紹介してください
   (全部の記事を読み上げる必要はありません。重要度・多様性を考慮して選んでください)。
3. 各トピックの後に、世間の受け止め方について触れても構いませんが、
   **実際のSNS投稿を引用しているかのような書き方(「Twitterで〜という投稿がありました」等)は絶対にしないでください**。
   必ず「〜といった受け止め方をする人もいそうです」「〜という声が上がるかもしれません」のように、
   AIによる推測・一般論であることが分かる言い回しにしてください。
4. 記事間は自然な相槌や接続詞でつないでください(「続いてのニュースです」「一方で」など)。
5. 最後に短い締めの挨拶を入れてください。
6. 読み上げ用なので、記号(*, #, 「」の多用等)や見出しは避け、話し言葉の文章のみにしてください。
7. 全体で3〜5分程度で読める分量(800〜1400字程度)にしてください。

指定されたJSON形式で出力してください。`;
}

/** 記事一覧からラジオ台本(タイトル+本文)をOllamaで生成する */
export async function generateRadioScript(
  articles: ArticleRow[],
  dateLabel: string,
): Promise<RadioScriptResult> {
  const client = getOllamaClient();

  const response = await client.chat({
    model: OLLAMA_MODEL,
    messages: [{ role: "user", content: buildPrompt(articles, dateLabel) }],
    format: scriptJsonSchema,
    think: false,
    stream: false,
  });

  const parsed = JSON.parse(response.message.content) as Partial<RadioScriptResult>;

  if (!parsed.script || !parsed.title) {
    throw new Error("台本の生成に失敗しました(必須フィールドが空です)");
  }

  return { title: parsed.title, script: parsed.script };
}

import type { ArticleCategory } from "@/types/database";

/**
 * 記事に画像が無い場合のフォールバックサムネイル(AI画像生成は使わず、
 * カテゴリ色のグラデーション+モノグラムをSVGでその場合成する。生成コスト・
 * 追加のAI API呼び出しは一切発生しない)。
 */

const GRADIENTS: Record<ArticleCategory, [string, string]> = {
  domestic: ["#2563eb", "#1d4ed8"],
  domestic_politics: ["#9f1239", "#7f1d1d"],
  international: ["#0e7490", "#155e75"],
  international_politics: ["#4338ca", "#3730a3"],
  it: ["#047857", "#065f46"],
  entertainment: ["#a21caf", "#86198f"],
  other: ["#525252", "#404040"],
};

const MONOGRAM: Record<ArticleCategory, string> = {
  domestic: "国内",
  domestic_politics: "政治",
  international: "国際",
  international_politics: "国際政治",
  it: "IT",
  entertainment: "エンタメ",
  other: "NEWS",
};

export function categoryPlaceholderThumbnail(category: ArticleCategory): string {
  const [from, to] = GRADIENTS[category] ?? GRADIENTS.other;
  const label = MONOGRAM[category] ?? MONOGRAM.other;
  const fontSize = label.length > 2 ? 34 : 56;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <g fill="#ffffff" opacity="0.12">
    <circle cx="560" cy="55" r="150"/>
    <circle cx="30" cy="345" r="130"/>
  </g>
  <text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle"
    font-family="'Noto Sans JP', 'Hiragino Sans', sans-serif" font-weight="700"
    font-size="${fontSize}" fill="#ffffff" fill-opacity="0.92">${label}</text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
}

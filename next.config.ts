import type { NextConfig } from "next";

// セキュリティヘッダー(defense-in-depth)。
// 記事画像は様々な配信元ドメインから直接読み込むため、img-srcを厳密に制限する
// 一般的なCSPはここでは導入していない(壊れやすく、記事ソース追加の度に更新が必要になるため)。
// クリックジャッキング対策・MIMEスニッフィング対策・リファラー漏洩対策は導入している。
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

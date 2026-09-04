/** タブナビゲーションの並び順。TabNavとスワイプ切り替えの両方で共有する。 */
export const TABS = [
  { href: "/explore", label: "探索" },
  { href: "/recommended", label: "おすすめ" },
  { href: "/domestic", label: "国内ニュース" },
  { href: "/domestic-politics", label: "国内政治" },
  { href: "/international", label: "国際ニュース" },
  { href: "/international-politics", label: "国際政治" },
  { href: "/it", label: "IT" },
  { href: "/entertainment", label: "エンタメ" },
  { href: "/radio", label: "ラジオ" },
  { href: "/weather", label: "気象予報" },
] as const;

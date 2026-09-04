/**
 * ニュース収集元(RSS/Atomフィード)の初期シードリスト。
 *
 * `scripts/seed-sources.ts` から Supabase の `sources` テーブルへ upsert される。
 * ここに追加すれば、個人ブログ等も含めて同じ収集・ファクトチェックパイプラインの
 * 対象になる(feed_url は RSS/Atom 形式である必要がある)。
 *
 * 実装時点でのURLは変わる可能性があるため、収集パイプライン側は
 * 個々のフィードの取得失敗をスキップ&ログするだけで全体を止めない設計にしている。
 */

export type SeedSource = {
  name: string;
  feedUrl: string;
  homepageUrl: string;
  language: "ja" | "en";
  defaultCategory:
    | "domestic"
    | "domestic_politics"
    | "international"
    | "international_politics"
    | "it"
    | "entertainment"
    | "other";
  trustWeight?: number;
};

export const seedSources: SeedSource[] = [
  // 国内(事件・社会)
  {
    name: "NHKニュース 社会",
    feedUrl: "https://www3.nhk.or.jp/rss/news/cat1.xml",
    homepageUrl: "https://www3.nhk.or.jp/news/",
    language: "ja",
    defaultCategory: "domestic",
    trustWeight: 1.2,
  },
  {
    name: "Yahoo!ニュース 主要",
    feedUrl: "https://news.yahoo.co.jp/rss/topics/domestic.xml",
    homepageUrl: "https://news.yahoo.co.jp/",
    language: "ja",
    defaultCategory: "domestic",
  },

  // 国内政治
  {
    name: "NHKニュース 政治",
    feedUrl: "https://www3.nhk.or.jp/rss/news/cat4.xml",
    homepageUrl: "https://www3.nhk.or.jp/news/",
    language: "ja",
    defaultCategory: "domestic_politics",
    trustWeight: 1.2,
  },
  // Yahoo!ニュース政治(/rss/topics/politics.xml)はYahoo側で廃止(404)されたため削除。
  // NHKニュース政治のみで運用(必要なら別ソースを追加してください)。

  // 国際(事件・事故・災害など、政治以外)
  {
    name: "NHKニュース 国際",
    feedUrl: "https://www3.nhk.or.jp/rss/news/cat6.xml",
    homepageUrl: "https://www3.nhk.or.jp/news/",
    language: "ja",
    defaultCategory: "international",
    trustWeight: 1.2,
  },
  {
    name: "Yahoo!ニュース 国際",
    feedUrl: "https://news.yahoo.co.jp/rss/topics/world.xml",
    homepageUrl: "https://news.yahoo.co.jp/",
    language: "ja",
    defaultCategory: "international",
  },
  {
    name: "BBC World News",
    feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
    homepageUrl: "https://www.bbc.com/news/world",
    language: "en",
    defaultCategory: "international",
    trustWeight: 1.1,
  },

  // 国際政治
  {
    name: "The Japan Times",
    feedUrl: "https://www.japantimes.co.jp/feed/",
    homepageUrl: "https://www.japantimes.co.jp/",
    language: "en",
    defaultCategory: "international_politics",
  },

  // IT
  {
    name: "ITmedia",
    feedUrl: "https://rss.itmedia.co.jp/rss/2.0/topstory.xml",
    homepageUrl: "https://www.itmedia.co.jp/",
    language: "ja",
    defaultCategory: "it",
  },
  {
    name: "Impress Watch",
    feedUrl: "https://www.watch.impress.co.jp/data/rss/1.0/twatch/feed.rdf",
    homepageUrl: "https://www.watch.impress.co.jp/",
    language: "ja",
    defaultCategory: "it",
  },
  {
    name: "Yahoo!ニュース IT",
    feedUrl: "https://news.yahoo.co.jp/rss/topics/it.xml",
    homepageUrl: "https://news.yahoo.co.jp/",
    language: "ja",
    defaultCategory: "it",
  },
  {
    name: "TechCrunch",
    feedUrl: "https://techcrunch.com/feed/",
    homepageUrl: "https://techcrunch.com/",
    language: "en",
    defaultCategory: "it",
  },
  {
    name: "The Verge",
    feedUrl: "https://www.theverge.com/rss/index.xml",
    homepageUrl: "https://www.theverge.com/",
    language: "en",
    defaultCategory: "it",
  },
  {
    name: "Ars Technica",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
    homepageUrl: "https://arstechnica.com/",
    language: "en",
    defaultCategory: "it",
  },

  // エンタメ(ゲーム・アニメ・漫画・カードゲーム等)
  {
    name: "4Gamer.net",
    feedUrl: "https://www.4gamer.net/rss/index.xml",
    homepageUrl: "https://www.4gamer.net/",
    language: "ja",
    defaultCategory: "entertainment",
  },
  {
    name: "コミックナタリー",
    feedUrl: "https://natalie.mu/comic/feed/news",
    homepageUrl: "https://natalie.mu/comic",
    language: "ja",
    defaultCategory: "entertainment",
  },
  {
    name: "映画ナタリー",
    feedUrl: "https://natalie.mu/eiga/feed/news",
    homepageUrl: "https://natalie.mu/eiga",
    language: "ja",
    defaultCategory: "entertainment",
  },
];

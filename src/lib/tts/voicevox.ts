// scripts/generate-radio.ts (tsx実行、Next.jsビルドを介さない)からのみ使う想定のため
// "server-only" は付けない(src/lib/ai/shared.ts参照)。

const VOICEVOX_HOST = process.env.VOICEVOX_HOST || "http://127.0.0.1:50021";
// 話者ID一覧は起動中のVOICEVOXの GET /speakers で確認可能。
// 既定は「四国めたん(ノーマル)」。ニュース読み上げに使いやすい落ち着いた声。
export const VOICEVOX_SPEAKER = Number(process.env.VOICEVOX_SPEAKER ?? 2);

/** VOICEVOXエンジンが起動しているか確認する */
export async function isVoicevoxRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${VOICEVOX_HOST}/version`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * テキストをVOICEVOXで音声合成し、WAVバイナリ(Buffer)を返す。
 * 1リクエストで長文を渡すと不安定/低速になりやすいため、
 * 呼び出し側で文単位に分割して synthesizeChunks に渡すことを推奨。
 */
export async function synthesizeText(
  text: string,
  speaker: number = VOICEVOX_SPEAKER,
): Promise<Buffer> {
  const queryRes = await fetch(
    `${VOICEVOX_HOST}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`,
    { method: "POST" },
  );
  if (!queryRes.ok) {
    throw new Error(`VOICEVOX audio_query failed (${queryRes.status}): ${await queryRes.text()}`);
  }
  const query = await queryRes.json();

  const synthRes = await fetch(`${VOICEVOX_HOST}/synthesis?speaker=${speaker}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok) {
    throw new Error(`VOICEVOX synthesis failed (${synthRes.status}): ${await synthRes.text()}`);
  }

  return Buffer.from(await synthRes.arrayBuffer());
}

/**
 * 台本テキストを句点・改行で分割し、それぞれ音声合成した上で1本のWAVに連結する。
 * すべてVOICEVOX由来(同一サンプルレート/フォーマット)であることを前提に、
 * 先頭チャンクのWAVヘッダーを使い、以降は音声データ部分だけを連結する。
 */
export async function synthesizeScript(
  script: string,
  speaker: number = VOICEVOX_SPEAKER,
): Promise<Buffer> {
  const chunks = splitIntoChunks(script);
  const wavBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const wav = await synthesizeText(chunk, speaker);
    wavBuffers.push(wav);
  }

  if (wavBuffers.length === 0) {
    throw new Error("音声合成対象のテキストがありません");
  }

  return concatWav(wavBuffers);
}

/** 句点(。/!/?/改行)で分割し、長すぎるチャンクにならないよう適度にまとめる */
function splitIntoChunks(text: string, maxChars = 100): string[] {
  const sentences = text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[。!?\n])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** 複数のWAV(PCM, 同一フォーマット前提)を1本に連結する */
function concatWav(wavBuffers: Buffer[]): Buffer {
  if (wavBuffers.length === 1) return wavBuffers[0];

  const first = wavBuffers[0];
  const dataChunks: Buffer[] = [];

  for (const wav of wavBuffers) {
    dataChunks.push(extractDataChunk(wav));
  }

  const totalDataSize = dataChunks.reduce((sum, d) => sum + d.length, 0);
  const header = Buffer.from(first.subarray(0, 44)); // 標準的な44バイトWAVヘッダーを流用
  header.writeUInt32LE(36 + totalDataSize, 4); // RIFFチャンクサイズ
  header.writeUInt32LE(totalDataSize, 40); // dataチャンクサイズ

  return Buffer.concat([header, ...dataChunks]);
}

/** WAVバイナリから "data" チャンクの中身(PCM実データ)だけを取り出す */
function extractDataChunk(wav: Buffer): Buffer {
  let offset = 12; // "RIFF"(4) + size(4) + "WAVE"(4) の後
  while (offset + 8 <= wav.length) {
    const chunkId = wav.toString("ascii", offset, offset + 4);
    const chunkSize = wav.readUInt32LE(offset + 4);
    if (chunkId === "data") {
      return wav.subarray(offset + 8, offset + 8 + chunkSize);
    }
    offset += 8 + chunkSize + (chunkSize % 2); // 奇数長はパディングされる
  }
  throw new Error("WAVファイルにdataチャンクが見つかりませんでした");
}

// 把原文切成检索用的小段：先按段落，段落太长再按字数硬切，相邻两段重叠一点防止句子被切断
export function chunkText(text: string, size = 500, overlap = 50): string[] {
  const paras = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf = "";
  for (const p of paras) {
    if (buf && buf.length + p.length + 1 > size) {
      chunks.push(buf);
      buf = "";
    }
    if (p.length > size) {
      for (let i = 0; i < p.length; i += size - overlap) chunks.push(p.slice(i, i + size));
      continue;
    }
    buf = buf ? `${buf}\n${p}` : p;
  }
  if (buf) chunks.push(buf);
  return chunks;
}

// 一次粘贴里可能有多条链接：每条链接各自成为一条收藏；没有链接就整段当一条
export function splitBatch(input: string): string[] {
  const urls = input.match(/https?:\/\/[^\s，。、"'<>]+/g) ?? [];
  if (urls.length <= 1) return [input.trim()].filter(Boolean);
  return [...new Set(urls)];
}

/**
 * Pre-filter cục bộ (MIỄN PHÍ, không gọi API) để dựng các CỤM NGHI NGỜ trùng ngữ nghĩa.
 * Gom entry chia sẻ KEY chung (cùng category) → cụm nhỏ → đưa cho Flash xác nhận ở bước sau.
 * Dùng chung cho: Bước 6 trong pipeline + nút "Dọn trùng" độc lập.
 */

type MiniEntry = { comment?: string; key?: string[] };

const catOf = (c?: string) => {
  const n = String(c || '').toLowerCase();
  if (/nhân vật|character|npc/.test(n)) return 'char';
  if (/địa điểm|location|khu vực/.test(n)) return 'loc';
  if (/hệ thống|system|cơ chế|kỹ năng|skill|rule|quy tắc/.test(n)) return 'sys';
  if (/sự kiện|event|timeline|dòng thời gian|saga|arc/.test(n)) return 'time';
  return 'other';
};

// Bỏ kính ngữ/quan hệ theo TỪ (không dùng \b vì hỏng với ký tự tiếng Việt như "bà").
const HONOR = new Set(['bà', 'ông', 'cô', 'chú', 'mrs', 'mr', 'ms', 'miss', 'the', 'vợ', 'chồng', 'mẹ', 'cha', 'bố', 'của', 's']);
const normKey = (k?: string) => String(k || '').toLowerCase()
  .replace(/[^a-z0-9à-ỹ\s]/gi, ' ')
  .split(/\s+/).filter(w => w && !HONOR.has(w)).join(' ').trim();

export function buildDuplicateCandidates(entries: MiniEntry[]): { comment: string; keys: string[] }[][] {
  if (!entries || entries.length === 0) return [];
  // Map "category|normKey" → tập index entry chia sẻ key đó.
  const km = new Map<string, Set<number>>();
  entries.forEach((e, idx) => {
    const cat = catOf(e.comment);
    const toks = [...(e.key || []), e.comment].map(normKey).filter(k => k && k.length >= 3);
    for (const nk of new Set(toks)) {
      const bk = cat + '|' + nk;
      if (!km.has(bk)) km.set(bk, new Set());
      km.get(bk)!.add(idx);
    }
  });
  // Union-find: gom entry chia sẻ key (bỏ key quá phổ biến → cụm > 6 = rác).
  const parent = entries.map((_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (const [, set] of km) {
    const arr = [...set];
    if (arr.length < 2 || arr.length > 6) continue;
    for (let j = 1; j < arr.length; j++) parent[find(arr[j])] = find(arr[0]);
  }
  const cm = new Map<number, number[]>();
  entries.forEach((_, i) => { const r = find(i); if (!cm.has(r)) cm.set(r, []); cm.get(r)!.push(i); });
  return [...cm.values()]
    .filter(c => c.length >= 2 && c.length <= 6)
    .map(c => c.map(i => ({ comment: entries[i].comment || '', keys: (entries[i].key || []).slice(0, 6) })));
}

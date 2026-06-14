/**
 * Tầng lưu trữ 2 lớp: localStorage (đồng bộ, chạy ở MỌI nơi kể cả Netlify) +
 * file JSON trong folder dự án (chỉ khi chạy `npm run dev` — Vite ghi đĩa qua
 * middleware /__tawa_store). File giúp dữ liệu HIỆN RÕ, dễ xóa/đổi vị trí,
 * thay cho localStorage chôn sâu trong cache trình duyệt.
 *
 * Quy ước:
 *  - Đọc/ghi localStorage luôn ĐỒNG BỘ (giữ nguyên pattern useState cũ).
 *  - Mỗi lần ghi → mirror sang file (fire-and-forget, lỗi thì bỏ qua).
 *  - Lúc khởi động, hydrateFromDisk() đọc file (nếu có) → file là "nguồn thật"
 *    khi chạy local, đồng bộ được giữa nhiều máy qua cùng folder.
 */

const ENDPOINT = '/__tawa_store';

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* hỏng → fallback */ }
  return fallback;
}

/** Ghi localStorage (đồng bộ) + mirror ra file đĩa (bất đồng bộ, không chặn). */
export function saveLocal(key: string, value: unknown): void {
  const json = JSON.stringify(value);
  try {
    localStorage.setItem(key, json);
  } catch (e) {
    // Vượt quota → ném tiếp để nơi gọi cảnh báo người dùng.
    throw e;
  }
  // Mirror ra file (chỉ thành công khi dev-server có middleware; Netlify sẽ lỗi → bỏ qua).
  try {
    fetch(`${ENDPOINT}/${key}`, { method: 'POST', body: json }).catch(() => {});
  } catch { /* không có fetch / lỗi mạng → bỏ qua */ }
}

/** Đọc 1 key từ file đĩa. Trả null nếu không có file hoặc không chạy dev-server. */
export async function readDisk<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${ENDPOINT}/${key}`, { method: 'GET' });
    if (!res.ok) return null;
    const text = await res.text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Lấy đường dẫn folder đang lưu (để hiển thị trong Settings). Null nếu là bản web tĩnh. */
export async function getStorageDir(): Promise<string | null> {
  try {
    const res = await fetch(`${ENDPOINT}/__info`, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.dir || null;
  } catch {
    return null;
  }
}

/** Ước lượng % dung lượng localStorage đã dùng (cảnh báo khi gần đầy ~5MB). */
export function getLocalStorageUsage(): { bytes: number; pct: number } {
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        const v = localStorage.getItem(k) || '';
        bytes += k.length + v.length;
      }
    }
  } catch { /* ignore */ }
  // localStorage thường giới hạn ~5MB (5 * 1024 * 1024 ký tự UTF-16 ~ xấp xỉ).
  const LIMIT = 5 * 1024 * 1024;
  return { bytes, pct: Math.min(100, Math.round((bytes / LIMIT) * 100)) };
}

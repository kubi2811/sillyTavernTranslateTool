/**
 * fetch có timeout cứng (AbortController). Dùng cho MỌI lệnh gọi mạng non-stream
 * (crawl wiki, tải model, phân loại tiêu đề…) để 1 kết nối treo không làm kẹt
 * cả luồng — đúng lớp lỗi đã gặp ở pipeline.
 *
 * Lưu ý: với endpoint STREAMING (SSE) thì không dùng cái này (nó hủy cứng giữa
 * chừng) — chỗ đó dùng idle-watchdog riêng trong openai.ts.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch { /* noop */ }
  }, timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

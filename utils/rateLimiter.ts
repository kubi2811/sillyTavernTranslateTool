/**
 * Bộ điều phối tốc độ (RPM) + chạy song song nhiều luồng.
 *
 * Bối cảnh: 1 API key giới hạn theo RPM (requests/phút) cho từng model
 * (vd: Pro = 5 RPM, Flash = 10 RPM). Ta muốn chạy NHIỀU LUỒNG cùng lúc để
 * nhanh, nhưng KHÔNG vượt RPM (tránh lỗi 429).
 *
 * Cách hoạt động: RateLimiter chỉ "chốt giờ bắt đầu" (start) của mỗi request,
 * cách nhau tối thiểu interval = 60000/rpm (ms). Vì chỉ gate lúc bắt đầu nên
 * nhiều request vẫn có thể CHẠY CHỒNG (overlap) — đạt throughput tối đa = rpm
 * mà vẫn an toàn. Mỗi model có 1 limiter riêng (theo key).
 */

class RateLimiter {
  private intervalMs: number;
  private queue: Array<() => void> = [];
  private lastStart = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(rpm: number) {
    this.intervalMs = RateLimiter.toInterval(rpm);
  }

  private static toInterval(rpm: number): number {
    const safe = Math.max(1, Math.floor(rpm) || 1);
    // +5% biên an toàn để tránh đụng trần RPM do lệch đồng hồ / latency
    return Math.ceil((60000 / safe) * 1.05);
  }

  setRpm(rpm: number) {
    this.intervalMs = RateLimiter.toInterval(rpm);
  }

  /** Resolve khi được phép BẮT ĐẦU một request (đã giãn cách đúng RPM). */
  acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.pump();
    });
  }

  private pump() {
    if (this.timer || this.queue.length === 0) return;
    const now = Date.now();
    const wait = Math.max(0, this.lastStart + this.intervalMs - now);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.lastStart = Date.now();
      const resolve = this.queue.shift();
      if (resolve) resolve();
      this.pump();
    }, wait);
  }
}

const limiters = new Map<string, RateLimiter>();

export function getLimiter(key: string, rpm: number): RateLimiter {
  let l = limiters.get(key);
  if (!l) {
    l = new RateLimiter(rpm);
    limiters.set(key, l);
  } else {
    l.setRpm(rpm);
  }
  return l;
}

/**
 * Chạy danh sách tác vụ với GIỚI HẠN RPM (theo limiter key) + đa luồng.
 * Trả về kết quả theo đúng thứ tự đầu vào (PromiseSettledResult).
 */
export async function runRateLimited<T>(
  tasks: Array<() => Promise<T>>,
  opts: { key: string; rpm: number; concurrency?: number }
): Promise<PromiseSettledResult<T>[]> {
  const limiter = getLimiter(opts.key, opts.rpm);
  // Số luồng song song mặc định bám theo RPM (request Pro thường dài nên ~rpm là đủ).
  const concurrency = Math.max(
    1,
    Math.min(opts.concurrency ?? Math.max(2, Math.ceil(opts.rpm)), tasks.length || 1)
  );
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < tasks.length) {
      const i = cursor++;
      await limiter.acquire(); // tôn trọng RPM trước khi gọi
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

/**
 * Pool đa luồng KHÔNG giới hạn RPM — dùng cho việc HTTP thuần (crawl wiki),
 * vì crawl không tốn quota LLM. Giữ thứ tự kết quả theo đầu vào.
 */
export async function runPool<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let cursor = 0;
  const limit = Math.max(1, Math.min(concurrency, tasks.length || 1));

  const worker = async () => {
    while (cursor < tasks.length) {
      const i = cursor++;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  };

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

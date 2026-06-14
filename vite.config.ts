import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // ─── Thư mục lưu dữ liệu trên Ổ ĐĨA (thay cho localStorage trình duyệt) ───
    // Đổi vị trí bằng cách đặt TAWA_DATA_DIR trong file .env (đường dẫn tuyệt đối
    // hoặc tương đối so với gốc dự án). Mặc định: <gốc dự án>/tawa-data
    const DATA_DIR = env.TAWA_DATA_DIR
      ? path.resolve(__dirname, env.TAWA_DATA_DIR)
      : path.resolve(__dirname, 'tawa-data');

    const safeKey = (k: string) => /^[a-zA-Z0-9_-]+$/.test(k); // chống path traversal

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          // Lưu/đọc settings + lorebook vào file JSON trong folder dự án (chỉ khi chạy `npm run dev`).
          name: 'tawa-file-storage',
          configureServer(server) {
            server.middlewares.use((req, res, next) => {
              if (!req.url || !req.url.startsWith('/__tawa_store')) return next();
              res.setHeader('Access-Control-Allow-Origin', '*');
              const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);

              // GET /__tawa_store/__info → cho client biết đường dẫn đang lưu
              if (urlObj.pathname === '/__tawa_store/__info') {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ dir: DATA_DIR }));
                return;
              }

              const key = urlObj.pathname.replace('/__tawa_store/', '').trim();
              if (!key || !safeKey(key)) { res.statusCode = 400; res.end('bad key'); return; }
              const file = path.join(DATA_DIR, `${key}.json`);

              if (req.method === 'GET') {
                try {
                  if (!fs.existsSync(file)) { res.statusCode = 404; res.end('not found'); return; }
                  res.setHeader('Content-Type', 'application/json');
                  res.end(fs.readFileSync(file, 'utf8'));
                } catch (e: any) { res.statusCode = 500; res.end(String(e?.message || e)); }
                return;
              }

              if (req.method === 'POST') {
                let body = '';
                req.on('data', (c) => { body += c; });
                req.on('end', () => {
                  try {
                    fs.mkdirSync(DATA_DIR, { recursive: true });
                    fs.writeFileSync(file, body, 'utf8');
                    res.statusCode = 200; res.end('ok');
                  } catch (e: any) { res.statusCode = 500; res.end(String(e?.message || e)); }
                });
                return;
              }

              res.statusCode = 405; res.end('method not allowed');
            });
          }
        },
        {
          name: 'cors-proxy-middleware',
          configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
              if (req.url && req.url.startsWith('/cors-proxy')) {
                if (req.method === 'OPTIONS') {
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                  res.setHeader('Access-Control-Allow-Headers', '*');
                  res.statusCode = 200;
                  res.end();
                  return;
                }

                try {
                  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
                  const targetUrl = urlObj.searchParams.get('url');
                  if (!targetUrl) {
                    res.statusCode = 400;
                    res.end('Missing url parameter');
                    return;
                  }

                  const response = await fetch(targetUrl, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                      'Accept-Language': 'en-US,en;q=0.5',
                    }
                  });

                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                  res.setHeader('Access-Control-Allow-Headers', '*');
                  
                  const contentType = response.headers.get('Content-Type');
                  if (contentType) {
                    res.setHeader('Content-Type', contentType);
                  }

                  const arrayBuffer = await response.arrayBuffer();
                  res.statusCode = response.status;
                  res.end(Buffer.from(arrayBuffer));
                } catch (error: any) {
                  console.error('Local CORS proxy error:', error);
                  res.statusCode = 500;
                  res.end(`Proxy error: ${error.message}`);
                }
              } else {
                next();
              }
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
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

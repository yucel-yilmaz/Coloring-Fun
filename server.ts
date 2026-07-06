import express from 'express';
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApp } from './server/app';
import { config } from './server/config';

async function startServer() {
  const app = createApp();
  const PORT = config.port;

  // Image Proxy Route to prevent CORS issues
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("Missing url parameter");
    }

    try {
      const parsed = new URL(imageUrl);
      const allowedHosts = new Set([
        'lh3.googleusercontent.com',
        ...(config.supabaseUrl ? [new URL(config.supabaseUrl).hostname] : []),
      ]);
      if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) {
        return res.status(403).send('Image host is not allowed');
      }
      const response = await fetch(parsed, { redirect: 'error' });
      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "image/png";
      if (!contentType.startsWith('image/')) return res.status(415).send('Unsupported content type');
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > 16 * 1024 * 1024) return res.status(413).send('Image is too large');
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Error proxying image");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

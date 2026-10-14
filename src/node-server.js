// Node 本地跑同一套 Hono (不用wrangler也能调)
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
const app = createApp();
const port = Number(process.env.PORT || 3000);
console.log(`[choutuan 丑团 v0.5.0-cf] node-memory on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

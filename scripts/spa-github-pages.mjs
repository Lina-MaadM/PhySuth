import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// GitHub Pages ไม่รู้จัก client routes ของ SPA
// คัดลอก index.html เป็น 404.html เพื่อให้ refresh / deep link โหลดแอปได้
const dist = resolve("dist");
const index = resolve(dist, "index.html");
const notFound = resolve(dist, "404.html");

if (!existsSync(index)) {
  console.error("spa-github-pages: dist/index.html not found. Run build first.");
  process.exit(1);
}

copyFileSync(index, notFound);
console.log("spa-github-pages: wrote dist/404.html");

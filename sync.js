// Renders farhanbalouch.com in a real browser (the site is JavaScript-rendered,
// so plain fetch() only sees the <title>), crawls its pages, and REPLACES
// data/knowledge.js with the fresh text. Anything removed from the website
// disappears from the knowledge on the next run.

import { chromium } from "playwright";
import fs from "node:fs";

const SITE = "https://farhanbalouch.com";
const OUTPUT = "data/knowledge.js";
const MAX_PAGES = 40;
const MAX_CHARS = 40000;
const SKIP_EXT = /\.(png|jpe?g|gif|webp|svg|ico|pdf|zip|mp4|mp3|css|js|json|xml|txt)$/i;

const siteHost = new URL(SITE).hostname.replace(/^www\./, "");

function normalize(raw, base = SITE) {
  try {
    const u = new URL(raw, base);
    if (u.hostname.replace(/^www\./, "") !== siteHost) return null;
    if (SKIP_EXT.test(u.pathname)) return null;

    // keep hash only for hash-routed pages like /#/projects
    const hash = /^#!?\//.test(u.hash) ? u.hash : "";
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${SITE}${path}${u.search}${hash}`;
  } catch {
    return null;
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, 600);
        y += 600;
        if (y >= document.body.scrollHeight + 600) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 120);
    });
  });
}

const CLICK_SELECTOR =
  "header a, header button, nav a, nav button, footer a, [role='button'], a[href^='#'], button, [onclick]";
const SKIP_LABEL = /chat|cookie|close|theme|language/i;

// Collects ALL text in the DOM (including sections hidden by the site's own
// JavaScript, e.g. single-page "tabs"), one line per visual block.
function extractLines() {
  const blocks = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    const text = node.nodeValue.replace(/\s+/g, " ").trim();
    const el = node.parentElement;
    if (!text || !el) continue;
    if (el.closest("script,style,noscript,template,svg")) continue;

    let block = el;
    while (block && block !== document.body) {
      const d = getComputedStyle(block).display;
      if (d !== "inline" && d !== "contents") break;
      block = block.parentElement;
    }
    block = block || document.body;

    if (!blocks.has(block)) blocks.set(block, []);
    blocks.get(block).push(text);
  }

  return [...blocks.values()].map((parts) => parts.join(" "));
}

async function openPage(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
  } catch {
    // analytics/websockets can keep the network busy; use whatever has rendered
  }
  await page.waitForTimeout(1500);
}

async function readPage(page, url) {
  await openPage(page, url);
  try {
    await autoScroll(page);
  } catch {}

  return page.evaluate(
    ({ selector }) => ({
      title: document.title || "",
      description:
        document.querySelector('meta[name="description"]')?.content || "",
      lines: window.__extractLines(),
      links: [...document.querySelectorAll("a[href]")].map((a) => ({
        text: (a.innerText || a.getAttribute("aria-label") || "").trim(),
        href: a.href,
      })),
      clickables: [...document.querySelectorAll(selector)]
        .map((el, i) => {
          const label = (el.innerText || el.getAttribute("aria-label") || "")
            .replace(/\s+/g, " ")
            .trim();
          let external = false;
          if (el.tagName === "A") {
            const href = el.getAttribute("href") || "";
            external =
              /^(mailto:|tel:|javascript:)/i.test(href) ||
              (/^https?:/i.test(el.href) && new URL(el.href).host !== location.host);
          }
          return { i, label, external };
        })
        .filter((c) => c.label && c.label.length <= 40 && !c.external),
    }),
    { selector: CLICK_SELECTOR }
  );
}

// Clicks one element on a fresh copy of the page and returns what it revealed.
async function readAfterClick(page, url, index) {
  await openPage(page, url);
  try {
    await page.evaluate(
      ({ selector, index }) => document.querySelectorAll(selector)[index]?.click(),
      { selector: CLICK_SELECTOR, index }
    );
  } catch {
    return null;
  }
  await page.waitForTimeout(1500);

  return page.evaluate(() => ({
    url: location.href,
    lines: window.__extractLines(),
  }));
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (compatible; WebsiteKnowledgeSync/1.0)",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.addInitScript(`window.__extractLines = ${extractLines.toString()};`);

  const queue = [normalize(SITE + "/")];
  const seen = new Set();
  const sections = [];
  const seenLines = new Set();
  const seenLinks = new Set();

  // sitemap (if the site has one)
  try {
    const res = await context.request.get(SITE + "/sitemap.xml", { timeout: 10000 });
    if (res.ok()) {
      const xml = await res.text();
      for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
        const n = normalize(m[1]);
        if (n) queue.push(n);
      }
    }
  } catch {}

  while (queue.length && seen.size < MAX_PAGES) {
    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    let data;
    try {
      data = await readPage(page, url);
    } catch (err) {
      console.warn("Skipped", url, "-", err.message);
      continue;
    }

    const lines = [];

    const addLines = (list, target) => {
      for (const raw of list) {
        const line = raw.replace(/\s+/g, " ").trim();
        if (line.length < 2 || seenLines.has(line)) continue; // drops repeated nav/footer text
        seenLines.add(line);
        target.push(line);
      }
    };

    addLines([data.description, ...data.lines], lines);

    const linkLines = [];
    for (const l of data.links) {
      const label = l.text.replace(/\s+/g, " ").trim();
      if (!label || !/^https?:/i.test(l.href)) continue;
      const entry = `${label} -> ${l.href}`;
      if (seenLinks.has(entry)) continue;
      seenLinks.add(entry);
      linkLines.push(entry);

      const n = normalize(l.href, url);
      if (n && !seen.has(n)) queue.push(n);
    }

    if (lines.length || linkLines.length) {
      sections.push(
        [
          `## Page: ${new URL(url).pathname}${new URL(url).hash} — ${data.title}`,
          ...lines,
          linkLines.length ? "Links:\n" + linkLines.join("\n") : "",
        ]
          .filter(Boolean)
          .join("\n")
      );
    }

    // Click through menu buttons / tabs (single-page sites load content on click)
    const tried = new Set();
    for (const c of data.clickables) {
      if (tried.size >= 25) break;
      if (SKIP_LABEL.test(c.label) || tried.has(c.label.toLowerCase())) continue;
      tried.add(c.label.toLowerCase());

      const result = await readAfterClick(page, url, c.i).catch(() => null);
      if (!result) continue;

      const extra = [];
      addLines(result.lines, extra);

      const n = normalize(result.url);
      if (n && !seen.has(n)) queue.push(n);

      if (extra.length) {
        sections.push([`## Section: ${c.label}`, ...extra].join("\n"));
        console.log("Clicked", c.label, "->", extra.length, "new lines");
      }
    }

    console.log("Read", url);
  }

  await browser.close();

  let knowledge = sections.join("\n\n").trim();

  // Safety net: never wipe the existing knowledge because of a failed crawl.
  if (knowledge.length < 150) {
    console.error(
      `Crawl only produced ${knowledge.length} characters - keeping the old knowledge file.`
    );
    process.exit(1);
  }

  if (knowledge.length > MAX_CHARS) {
    knowledge = knowledge.slice(0, MAX_CHARS) + "\n[Content truncated]";
  }

  const fileContent =
    `// Auto-generated by sync.js from ${SITE} - do not edit by hand.\n` +
    `export const websiteKnowledge = ${JSON.stringify(knowledge)};\n`;

  const old = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, "utf8") : "";
  if (old === fileContent) {
    console.log("No changes on the website.");
    return;
  }

  fs.writeFileSync(OUTPUT, fileContent);
  console.log(`Knowledge replaced: ${knowledge.length} characters from ${seen.size} page(s).`);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});


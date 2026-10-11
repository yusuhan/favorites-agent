import * as cheerio from "cheerio";
import type { Item } from "./types";

export type Parsed = {
  source: Item["source"];
  url: string | null;
  title: string | null;
  content: string;
};

const MAX_CONTENT = 20000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// 小红书、抖音的页面抓不稳，第一版直接用用户粘贴的分享文案
const TEXT_ONLY_HOSTS = ["xhslink.com", "xiaohongshu.com", "douyin.com", "iesdouyin.com"];

export function findUrl(input: string): string | null {
  const m = input.match(/https?:\/\/[^\s，。、"'<>]+/);
  return m ? m[0] : null;
}

export async function parseInput(input: string): Promise<Parsed> {
  const raw = input.trim();
  const url = findUrl(raw);
  if (!url) return { source: "text", url: null, title: null, content: clip(raw) };

  const host = new URL(url).hostname;
  if (TEXT_ONLY_HOSTS.some((h) => host.endsWith(h))) {
    return { source: "text", url, title: null, content: clip(raw) };
  }

  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`打开链接失败：HTTP ${res.status}`);
  const finalUrl = res.url || url;
  const finalHost = new URL(finalUrl).hostname;

  // b23.tv 短链会跳到 bilibili.com
  if (finalHost.endsWith("bilibili.com")) return parseBilibili(finalUrl);

  const html = await res.text();
  if (finalHost === "mp.weixin.qq.com") return parseWechat(finalUrl, html);
  return parseWeb(finalUrl, html);
}

async function parseBilibili(url: string): Promise<Parsed> {
  const bvid = url.match(/BV[0-9A-Za-z]{10}/)?.[0];
  if (!bvid) throw new Error("没在链接里找到 B 站视频号（BV 号）");
  const res = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
    headers: { "User-Agent": UA, Referer: "https://www.bilibili.com/" },
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`B 站接口返回错误：${json.message}`);
  const d = json.data;
  // TODO 第 2-4 天：拿字幕（部分视频需要登录态，拿不到就只用简介）
  const content = [`UP 主：${d.owner?.name ?? ""}`, d.desc ?? ""].join("\n");
  return { source: "bilibili", url: `https://www.bilibili.com/video/${bvid}`, title: d.title, content: clip(content) };
}

function parseWechat(url: string, html: string): Parsed {
  const $ = cheerio.load(html);
  const title = $('meta[property="og:title"]').attr("content") || $("#activity-name").text().trim() || null;
  const content = cleanText($("#js_content").text());
  if (!content) throw new Error("公众号文章正文为空，可能已被删除或需要在微信里打开");
  return { source: "wechat", url, title, content: clip(content) };
}

function parseWeb(url: string, html: string): Parsed {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer, aside, iframe").remove();
  const title = $('meta[property="og:title"]').attr("content") || $("title").text().trim() || null;
  const main = $("article").first().text() || $("main").first().text() || $("body").text();
  const content = cleanText(main);
  if (!content) throw new Error("没从网页里读到正文");
  return { source: "web", url, title, content: clip(content) };
}

function cleanText(s: string): string {
  return s
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function clip(s: string): string {
  return s.length > MAX_CONTENT ? s.slice(0, MAX_CONTENT) : s;
}

// 解析失败时也要知道是哪个来源，才能分来源统计成功率
export function guessSource(input: string): Item["source"] {
  const url = findUrl(input);
  if (!url) return "text";
  const host = new URL(url).hostname;
  if (host === "mp.weixin.qq.com") return "wechat";
  if (host.endsWith("bilibili.com") || host === "b23.tv") return "bilibili";
  if (TEXT_ONLY_HOSTS.some((h) => host.endsWith(h))) return "text";
  return "web";
}

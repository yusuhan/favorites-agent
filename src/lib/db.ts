import { createClient } from "@supabase/supabase-js";

export type Item = {
  id: string;
  source: "wechat" | "bilibili" | "web" | "text";
  url: string | null;
  title: string | null;
  content: string | null;
  summary: string | null;
  tags: string[];
  note: string | null;
  status: "ok" | "failed";
  error: string | null;
  created_at: string;
};

// 只在服务端用：service role key 有全部权限，不能出现在浏览器里
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，见 .env.example");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

import { createClient } from "@supabase/supabase-js";

// 只给定时任务用：没有用户登录态，需要遍历所有用户。service role key 绕过行级权限，绝不能出现在浏览器代码里
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

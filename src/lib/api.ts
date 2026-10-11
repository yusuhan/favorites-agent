import { NextResponse } from "next/server";
import { supabaseServer } from "./supabase/server";

// 接口公用：拿到带登录态的数据库连接；没登录直接返回 401
export async function withUser() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { sb, user: null, denied: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  return { sb, user, denied: null };
}

export function fail(e: unknown, status = 500) {
  return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status });
}

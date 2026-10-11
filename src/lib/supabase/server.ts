import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 服务端用：带着当前用户的登录态访问数据库，行级权限保证只能读写自己的数据
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 在服务端组件里不能写 cookie，由 middleware 负责刷新登录态
        }
      },
    },
  });
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`缺少环境变量 ${name}，见 .env.example`);
  return v;
}

"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// 邮箱验证码登录：第一次登录自动注册
export default function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) setMsg(`发送失败：${error.message}`);
    else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setMsg(`验证码不对或已过期：${error.message}`);
    else onDone();
  }

  return (
    <form onSubmit={sent ? verify : send} className="mt-8 space-y-3">
      <input
        type="email"
        required
        value={email}
        disabled={sent}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
        className="input"
      />
      {sent && (
        <input
          inputMode="numeric"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="邮件里的验证码"
          className="input"
        />
      )}
      <button type="submit" disabled={busy} className="btn">
        {busy ? "请稍等…" : sent ? "登录" : "发验证码"}
      </button>
      {sent && <p className="text-sm opacity-70">验证码已发到 {email}，没收到看看垃圾邮件。</p>}
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </form>
  );
}

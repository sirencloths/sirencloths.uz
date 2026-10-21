"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? (typeof window === "undefined" ? "http://localhost:4000/api" : `${window.location.protocol}//${window.location.hostname}:4000/api`);

function AcceptTeamInvitationForm() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const accept = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) { setMessage("Parollar bir xil emas."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`${API}/team-invitations/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.get("token") ?? "", password }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "Taklif qabul qilinmadi.");
      setMessage("Hisob yaratildi. Endi admin panelga kirishingiz mumkin.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Taklif qabul qilinmadi."); }
    finally { setSaving(false); }
  };
  return <main className="admin-invite-page"><form onSubmit={accept}><p>PREVAILEN · TEAM ACCESS</p><h1>Jamoaga qo‘shilish</h1><span>Shaxsiy parolingizni yarating. U adminlarga ko‘rinmaydi.</span><label>Yangi parol<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Parolni takrorlang<input required minLength={12} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{message && <b className={message.startsWith("Hisob") ? "is-success" : "is-error"}>{message}</b>}<button disabled={saving}>{saving ? "Tekshirilmoqda…" : "Hisobni faollashtirish"}</button><Link href="/admin">Admin login</Link></form></main>;
}

export default function AcceptTeamInvitationPage() {
  return <Suspense fallback={<main className="admin-invite-page" />}><AcceptTeamInvitationForm /></Suspense>;
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { customerApi, useCustomerAuth } from "@/components/CustomerAuthProvider";

type Preferences = { blog: boolean; discounts: boolean; products: boolean };
type SettingsForm = { firstName: string; lastName: string; phone: string; region: string; address: string; notificationPreferences: Preferences };

const preferenceRows: Array<{ key: keyof Preferences; title: string; description: string }> = [
  { key: "products", title: "Yangi mahsulotlar", description: "Yangi kolleksiya va mahsulotlar haqida xabarlar." },
  { key: "discounts", title: "Chegirmalar", description: "Promokod va maxsus takliflarni oling." },
  { key: "blog", title: "Blog yangiliklari", description: "Yangi maqola va lookbooklar haqida xabarlar." },
];

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { customer, loading, openAuth, refresh } = useCustomerAuth();
  const [form, setForm] = useState<SettingsForm>({ firstName: "", lastName: "", phone: "", region: "", address: "", notificationPreferences: { blog: false, discounts: false, products: false } });
  const [initialForm, setInitialForm] = useState<SettingsForm | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  useEffect(() => {
    if (!customer) return;
    const nextForm = { firstName: customer.firstName || "", lastName: customer.lastName || "", phone: customer.phone || "", region: customer.region || "", address: customer.address || "", notificationPreferences: { blog: customer.metadata?.notificationPreferences?.blog ?? false, discounts: customer.metadata?.notificationPreferences?.discounts ?? false, products: customer.metadata?.notificationPreferences?.products ?? false } };
    setForm(nextForm); setInitialForm(nextForm);
  }, [customer]);

  const isDirty = initialForm !== null && JSON.stringify(form) !== JSON.stringify(initialForm);
  const update = (key: Exclude<keyof SettingsForm, "notificationPreferences">, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: keyof Preferences) => setForm((current) => ({ ...current, notificationPreferences: { ...current.notificationPreferences, [key]: !current.notificationPreferences[key] } }));
  const persist = async (destination?: string) => {
    const token = localStorage.getItem("siren-customer-token");
    if (!token) return false;
    setStatus(null);
    try {
      const updated = await customerApi("/auth/customer/me", form, token, "PATCH");
      const savedForm: SettingsForm = { firstName: updated.firstName || form.firstName, lastName: updated.lastName || form.lastName, phone: updated.phone || form.phone, region: updated.region || form.region, address: updated.address || form.address, notificationPreferences: { blog: updated.metadata?.notificationPreferences?.blog ?? form.notificationPreferences.blog, discounts: updated.metadata?.notificationPreferences?.discounts ?? form.notificationPreferences.discounts, products: updated.metadata?.notificationPreferences?.products ?? form.notificationPreferences.products } };
      setForm(savedForm); setInitialForm(savedForm); setStatus({ type: "success", message: "✓ O‘zgarishlar muvaffaqiyatli saqlandi." });
      if (destination) { setLeaveOpen(false); router.push(destination); void refresh(); return true; }
      await refresh(); return true;
    } catch (error) { setStatus({ type: "error", message: error instanceof Error ? error.message : "Saqlashda xatolik yuz berdi. Qayta urinib ko‘ring." }); return false; }
  };
  const save = (event: FormEvent) => { event.preventDefault(); void persist(); };
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  return <><main className="profile-settings-page">
    <Link className="profile-settings-back" href="/profile" onClick={(event) => { if (isDirty) { event.preventDefault(); setLeaveOpen(true); } }}>← Profilga qaytish</Link>
    {loading ? <section className="profile-settings-loading">Sozlamalar yuklanmoqda…</section> : !customer ? <section className="profile-settings-auth"><h1>Sozlamalar</h1><p>Sozlamalaringizni ko‘rish uchun akkauntga kiring.</p><button type="button" onClick={openAuth}>Kirish / ro‘yxatdan o‘tish</button></section> : <form className="profile-settings-form" onSubmit={save}>
      <header className="profile-settings-hero"><p>AKKAUNT SOZLAMALARI</p><h1>Sozlamalar</h1><span>Profil ma’lumotlari va bildirishnomalaringizni boshqaring.</span>{status && <small className={`profile-settings-status is-${status.type}`} role="status">{status.message}</small>}<button className="profile-settings-save-top" type="submit">O‘zgarishlarni saqlash</button></header>
      <div className="profile-settings-layout">
        <div className="profile-settings-main">
          <section className="profile-settings-card"><header><div><p>SHAXSIY MA’LUMOTLAR</p><h2>Profil ma’lumotlari</h2><span>Buyurtmalarni tezroq rasmiylashtirish uchun ma’lumotlaringizni yangilang.</span></div></header><div className="profile-settings-fields">
            <label><span>Ism</span><input value={form.firstName} onChange={(event) => update("firstName", event.target.value)} autoComplete="given-name" required /></label>
            <label><span>Familiya</span><input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} autoComplete="family-name" required /></label>
            <label><span>Telefon</span><div className="profile-phone-field"><b aria-hidden="true">+</b><input type="tel" value={form.phone.replace(/^\+/, "")} onChange={(event) => update("phone", `+${event.target.value.replace(/\D/g, "")}`)} inputMode="numeric" autoComplete="tel" pattern="[0-9]{7,15}" maxLength={15} title="Telefon raqamini faqat raqamlarda kiriting" required /></div></label>
            <label><span>Viloyat / shahar</span><input value={form.region} onChange={(event) => update("region", event.target.value)} autoComplete="address-level1" required /></label>
            <label className="profile-settings-field--wide"><span>Manzil</span><input value={form.address} onChange={(event) => update("address", event.target.value)} autoComplete="street-address" placeholder="Ko‘cha, uy va xonadon raqami" /></label>
            <label className="profile-settings-field--wide"><span>E-mail</span><input value={customer.email} readOnly aria-readonly="true" /><small>E-mail manzilini xavfsizlik sababli alohida tasdiqlash orqali o‘zgartirish mumkin.</small></label>
          </div></section>
          <section id="notifications" className="profile-settings-card profile-settings-card--notifications"><header><div><p>BILDIRISHNOMALAR</p><h2>Nimalar haqida xabar olay?</h2><span>Kerakli yangiliklarni tanlang. Muhim buyurtma xabarlari doim yuboriladi.</span></div></header><div className="profile-settings-notifications">
            <div className="profile-settings-toggle profile-settings-toggle--locked"><span><b>Asosiy xabarlar</b><small>Buyurtma va akkaunt bo‘yicha muhim xabarlar.</small></span><input type="checkbox" checked disabled aria-label="Asosiy xabarlar doim yoqilgan" /></div>
            {preferenceRows.map((item) => <label className="profile-settings-toggle" key={item.key}><span><b>{item.title}</b><small>{item.description}</small></span><input type="checkbox" checked={form.notificationPreferences[item.key]} onChange={() => toggle(item.key)} /></label>)}
          </div></section>
        </div>
        <aside className="profile-settings-sidebar"><section className="profile-settings-card profile-settings-security"><p>XAVFSIZLIK</p><h2>Akkauntingiz himoyalangan</h2><div><b>{customer.emailVerifiedAt ? "✓ E-mail tasdiqlangan" : "E-mail tasdiqlanishini kutmoqda"}</b><span>{customer.email}</span></div><hr /><h3>Parol</h3><span>Parolni tiklash uchun kirish oynasidagi “Parolni unutdingizmi?” tugmasidan foydalaning.</span><button type="button" onClick={openAuth}>Parolni tiklash</button></section><section className="profile-settings-help"><b>Yordam kerakmi?</b><span>Buyurtma yoki akkaunt bo‘yicha savollaringiz bo‘lsa, biz bilan bog‘laning.</span><a href="mailto:support@sirencloths.uz">support@sirencloths.uz</a></section></aside>
      </div>
      <footer className="profile-settings-save"><span className={status ? `is-${status.type}` : ""}>{status?.message || ""}</span><button type="submit">O‘zgarishlarni saqlash</button></footer>
      {leaveOpen && <div className="profile-settings-confirm-backdrop" role="presentation" onMouseDown={() => setLeaveOpen(false)}><section className="profile-settings-confirm" role="dialog" aria-modal="true" aria-labelledby="unsaved-settings-title" onMouseDown={(event) => event.stopPropagation()}><p>SAQLANMAGAN O‘ZGARISHLAR</p><h2 id="unsaved-settings-title">O‘zgarishlarni saqlaysizmi?</h2><span>Profil ma’lumotlaringiz yangilandi. Chiqishdan oldin saqlashni xohlaysizmi?</span><div><button type="button" onClick={() => setLeaveOpen(false)}>Davom etish</button><button type="button" onClick={() => { setLeaveOpen(false); setInitialForm(form); router.push("/profile"); }}>Saqlamasdan chiqish</button><button type="button" onClick={() => void persist("/profile")}>Saqlash va chiqish</button></div></section></div>}
    </form>}
  </main><Footer /></>;
}

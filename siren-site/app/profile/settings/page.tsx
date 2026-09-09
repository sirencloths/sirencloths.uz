"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { customerApi, useCustomerAuth } from "@/components/CustomerAuthProvider";

export default function ProfileSettingsPage() {
  const { customer, loading, openAuth, refresh } = useCustomerAuth();
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", region: "", address: "" }); const [status, setStatus] = useState("");
  useEffect(() => { if (customer) setForm({ firstName: customer.firstName || "", lastName: customer.lastName || "", phone: customer.phone || "", region: customer.region || "", address: customer.address || "" }); }, [customer]);
  const save = async (event: FormEvent) => { event.preventDefault(); const token = localStorage.getItem("siren-customer-token"); if (!token) return; setStatus(""); try { await customerApi("/auth/customer/me", form, token, "PATCH"); await refresh(); setStatus("СОХРАНЕНО"); } catch (e) { setStatus(e instanceof Error ? e.message : "Ошибка"); } };
  return <><FixedTop /><main className="profile-page"><Link href="/profile">← ПРОФИЛЬ</Link>{loading ? null : !customer ? <section className="profile-box"><button type="button" onClick={openAuth}>SIGN IN / REGISTER</button></section> : <form className="profile-box profile-address-form" onSubmit={save}><h1>НАСТРОЙКИ</h1>{([ ["firstName", "ИМЯ"], ["lastName", "ФАМИЛИЯ"], ["phone", "ТЕЛЕФОН"], ["region", "РЕГИОН"], ["address", "АДРЕС"] ] as const).map(([key, label]) => <label key={key}><b>{label}</b><input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={key !== "address"} /></label>)}<label><b>E-MAIL</b><input value={customer.email} readOnly aria-readonly="true" /></label><button type="submit">СОХРАНИТЬ</button>{status && <p>{status}</p>}<p>Пароль меняется только после подтверждения по e-mail. Используйте «Забыли пароль?» в окне входа.</p></form>}</main><Footer /></>;
}

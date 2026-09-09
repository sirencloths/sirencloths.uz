"use client";

import Link from "next/link";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";

export default function ProfilePage() {
  const { customer, loading, openAuth, signOut } = useCustomerAuth();
  return <><FixedTop /><main className="profile-page">
    {loading ? <section className="profile-box"><p className="profile-empty">ЗАГРУЗКА...</p></section> : !customer ? <section className="profile-box profile-empty"><p>ВОЙДИТЕ, ЧТОБЫ УВИДЕТЬ ПРОФИЛЬ И ЗАКАЗЫ</p><button type="button" onClick={openAuth}>SIGN IN / REGISTER</button></section> : <>
      <section className="profile-box profile-details"><p className="profile-name">{customer.firstName} {customer.lastName}</p><p>{customer.email}</p>{customer.emailVerifiedAt && <small>✓ EMAIL VERIFIED</small>}</section>
      <section className="profile-box profile-addresses"><div className="profile-address-heading"><b>ПРОФИЛЬ</b><Link href="/profile/settings">НАСТРОЙКИ</Link></div><p>{customer.phone || "Телефон не указан"}</p><p>{customer.region || "Регион не указан"}</p>{customer.address && <p>{customer.address}</p>}</section>
      {customer.welcomeDiscountEligible && <section className="profile-box"><b>WELCOME OFFER</b><p>Ваша скидка {customer.welcomeDiscountPercent || 15}% будет применена к первой покупке.</p></section>}
      <section className="profile-actions"><button type="button" onClick={signOut}>ВЫЙТИ</button></section>
    </>}
  </main><Footer /></>;
}

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./tailadmin/ui/table";
import { Modal } from "./tailadmin/ui/modal";

type ProductVariant = { id: string; sku?: string | null; color?: string | null; size?: string | null };
type Product = { id: string; title: string; metadata?: { article?: string | null }; variants?: ProductVariant[] };
type Partner = { id: string; name: string; type: string; email?: string; phone?: string; promoCode?: string; discountPercent: number; productIds: string[]; isActive: boolean; usageCount: number; commentCount: number; latestComment?: string | null; createdAt: string };
type PartnerDetails = { partner: Partner; comments: Array<{ id: string; body: string; createdAt: string }>; promo: { uses: number; discount: number; revenue: number } };
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const PARTNER_TABS = [["all", "Barcha"], ["sponsor", "Sponsorlar"], ["influencer", "Influencerlar"], ["affiliate", "Affiliate"], ["referral", "Referral"], ["archive", "Arxiv"]] as const;

async function request(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Xatolik yuz berdi.");
  return body;
}

export default function PartnerManager({ token, products, onNotice }: { token: string; products: Product[]; onNotice: (message: string) => void }) {
  const [rows, setRows] = useState<Partner[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [details, setDetails] = useState<PartnerDetails | null>(null);
  const [draft, setDraft] = useState({ name: "", type: "sponsor", email: "", phone: "", promoCode: "", discountPercent: 10, note: "", productIds: [] as string[] });
  const load = useCallback(async () => setRows(await request(`/admin/partners?archived=${type === "archive"}`, token)), [token, type]);
  useEffect(() => { void load().catch((error) => onNotice(error.message)); }, [load, onNotice]);

  const selectedTab = PARTNER_TABS.find(([value]) => value === type)?.[1] ?? "Hamkorlar";
  const filtered = rows.filter((partner) => (type === "all" || type === "archive" || partner.type === type) && `${partner.name} ${partner.promoCode ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const usesPromo = draft.type === "influencer" || draft.type === "referral";
  const productResults = useMemo(() => {
    const needle = productQuery.trim().toLocaleLowerCase();
    if (!needle) return products;
    return products.filter((product) => [product.title, product.metadata?.article, ...(product.variants ?? []).flatMap((variant) => [variant.sku, variant.color, variant.size])].filter(Boolean).join(" ").toLocaleLowerCase().includes(needle));
  }, [products, productQuery]);
  const toggleProduct = (productId: string) => setDraft((current) => ({ ...current, productIds: current.productIds.includes(productId) ? current.productIds.filter((id) => id !== productId) : [...current.productIds, productId] }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    try { await request("/admin/partners", token, { method: "POST", body: JSON.stringify(draft) }); setOpen(false); setProductQuery(""); await load(); onNotice("Hamkor qo‘shildi."); }
    catch (error) { onNotice(error instanceof Error ? error.message : "Xatolik yuz berdi."); }
  };
  const formatDateTime = (value: string) => new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const openDetails = async (partnerId: string) => { try { setDetails(await request(`/admin/partners/${partnerId}`, token)); } catch (error) { onNotice(error instanceof Error ? error.message : "Ma’lumot yuklanmadi."); } };

  return <section className="tailadmin-partners-page">
    <header className="tailadmin-page-heading"><div><p className="ui-overline">Hamkorlar</p><h2>{selectedTab}</h2><span>Sponsor, influencer, affiliate va referral hamkorlar.</span></div><Button onClick={() => setOpen(true)}>+ Hamkor qo‘shish</Button></header>
    <div className="tailadmin-segmented-tabs" role="tablist" aria-label="Hamkorlar bo‘limlari">{PARTNER_TABS.map(([value, label]) => <button type="button" key={value} className={type === value ? "is-active" : ""} onClick={() => setType(value)}>{label}</button>)}</div>
    <div className="tailadmin-data-card">
          <div className="tailadmin-data-card-toolbar admin-table-tools"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hamkor yoki promokodni qidiring" /></div>
          <div className="inventory-table-wrap"><Table className="inventory-table partner-table"><TableHeader><TableRow>{["Nomi", "Turi", "Kontakt", "Promokod", "Chegirma", "Mahsulotlar", "Ishlatilgan", "Izohlar", "Sana / vaqt", "Holat", ""].map((label, index) => <TableCell isHeader key={`${label}-${index}`}>{label}</TableCell>)}</TableRow></TableHeader><TableBody>
            {filtered.map((partner) => <TableRow key={partner.id}><TableCell><button className="partner-table-link" onClick={() => void openDetails(partner.id)}>{partner.name}</button></TableCell><TableCell>{partner.type}</TableCell><TableCell>{partner.email || partner.phone || "—"}</TableCell><TableCell>{partner.promoCode ? <button className="partner-table-link partner-table-link--code" onClick={() => void openDetails(partner.id)}>{partner.promoCode}</button> : "—"}</TableCell><TableCell>{partner.promoCode ? `−${partner.discountPercent}%` : "—"}</TableCell><TableCell>{partner.productIds.length ? `${partner.productIds.length} ta` : "Barchasi"}</TableCell><TableCell>{partner.promoCode ? `${partner.usageCount} marta` : "—"}</TableCell><TableCell className="partner-comment-cell">{partner.latestComment || "—"}</TableCell><TableCell>{formatDateTime(partner.createdAt)}</TableCell><TableCell>{partner.isActive ? "Faol" : "O‘chirilgan"}</TableCell><TableCell>{type !== "archive" && <><Button size="sm" variant="outline" onClick={async () => { await request(`/admin/partners/${partner.id}/active`, token, { method: "PATCH", body: JSON.stringify({ isActive: !partner.isActive }) }); void load(); }}>{partner.isActive ? "O‘chirish" : "Yoqish"}</Button>{" "}<Button size="sm" variant="outline" onClick={async () => { if (confirm("Hamkor arxivga o‘tkazilsinmi?")) { await request(`/admin/partners/${partner.id}/archive`, token, { method: "POST" }); void load(); } }}>Arxiv</Button></>}</TableCell></TableRow>)}
            {!filtered.length && <TableRow><TableCell>Hozircha hamkor yo‘q.</TableCell></TableRow>}
          </TableBody></Table></div>
    </div>
    <Modal isOpen={open} onClose={() => setOpen(false)} className="max-w-3xl !bg-white dark:!bg-white" showCloseButton>
      <form className="inventory-confirm" onSubmit={save}>
      <h3>Hamkor qo‘shish</h3>
      <label>Turi<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option value="sponsor">Sponsor</option><option value="influencer">Influencer</option><option value="affiliate">Affiliate</option><option value="referral">Referral</option></select></label>
      <label>Nomi<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Email<input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
      <label>Telefon<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
      <label>Izoh<textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Hamkor haqida qisqa izoh yozing" /></label>
      {usesPromo && <><label>Promokod<input required value={draft.promoCode} onChange={(event) => setDraft({ ...draft, promoCode: event.target.value.toUpperCase() })} /></label><label>Chegirma %<input type="number" min="1" max="99" value={draft.discountPercent} onChange={(event) => setDraft({ ...draft, discountPercent: Number(event.target.value) })} /></label><small>{draft.type === "referral" ? "Referral promokodi: har bir mijoz faqat 1 marta ishlata oladi." : "Influencer promokodi uchun umumiy foydalanish limiti yo‘q."}</small></>}
      <section className="partner-product-picker" aria-label="Mahsulot tanlash">
        <div className="partner-product-picker-head"><b>Mahsulotlar</b><button type="button" onClick={() => setDraft({ ...draft, productIds: draft.productIds.length ? [] : products.map((product) => product.id) })}>{draft.productIds.length ? "Tanlovni tozalash" : "Barcha mahsulotlar"}</button></div>
        <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="SKU, rang, razmer yoki mahsulot nomi" />
        <div className="partner-product-picker-list">{productResults.map((product) => <label className="partner-product-picker-row" key={product.id}><input type="checkbox" checked={draft.productIds.includes(product.id)} onChange={() => toggleProduct(product.id)} /><span><b>{product.title}</b>{product.metadata?.article && <small>Artikul: {product.metadata.article}</small>}</span><em>{(product.variants ?? []).map((variant) => [variant.sku, variant.color, variant.size].filter(Boolean).join(" · ")).filter(Boolean).join("; ") || "Variant ma’lumoti yo‘q"}</em></label>)}{!productResults.length && <p className="partner-product-picker-empty">Mos mahsulot topilmadi.</p>}</div>
        <small>{draft.productIds.length ? `${draft.productIds.length} ta mahsulot tanlandi.` : "Tanlanmasa promokod barcha tovarlarga amal qiladi."}</small>
      </section>
      <div className="inventory-confirm-actions"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Bekor</Button><Button>Saqlash</Button></div>
      </form>
    </Modal>
    <Modal isOpen={Boolean(details)} onClose={() => setDetails(null)} className="max-w-2xl !bg-white dark:!bg-white" showCloseButton>
      {details && <section className="inventory-confirm partner-details" role="dialog" aria-modal="true"><p className="ui-overline">HAMKOR MA’LUMOTLARI</p><h3>{details.partner.name}</h3><div className="partner-details-grid"><div><span>Turi</span><b>{details.partner.type}</b></div><div><span>Holat</span><b>{details.partner.isActive ? "Faol" : "O‘chirilgan"}</b></div><div><span>Kontakt</span><b>{details.partner.email || details.partner.phone || "—"}</b></div><div><span>Qo‘shilgan</span><b>{formatDateTime(details.partner.createdAt)}</b></div></div>{details.partner.promoCode && <section className="partner-promo-summary"><p className="ui-overline">PROMOKOD</p><h4>{details.partner.promoCode} <small>−{details.partner.discountPercent}%</small></h4><div><span><b>{details.promo.uses}</b>Ishlatilgan</span><span><b>{Math.round(details.promo.revenue).toLocaleString("uz-UZ")} UZS</b>Jami savdo</span><span><b>{Math.round(details.promo.discount).toLocaleString("uz-UZ")} UZS</b>Jami chegirma</span></div></section>}<section className="partner-details-comments"><p className="ui-overline">IZOHLAR</p>{details.comments.length ? details.comments.map((comment) => <article key={comment.id}><p>{comment.body}</p><time>{formatDateTime(comment.createdAt)}</time></article>) : <p>Izoh yozilmagan.</p>}</section></section>}
    </Modal>
  </section>;
}

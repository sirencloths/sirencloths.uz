import Image from "next/image";
import { getStorefrontSocialLinks, storefrontAssetUrl, type StorefrontSocialLinks } from "@/lib/api";

export default async function SocialPage() {
  const social: StorefrontSocialLinks = await getStorefrontSocialLinks().catch(() => ({ profile: {}, items: [] }));
  const profile = social.profile ?? {};
  return <main className="social-page"><section className="social-page__card"><div className="social-page__brand"><div className="social-page__logo-stage"><Image className="social-page__symbol" src="/brand/symbol-main.svg" alt="PREVAILEN" width={512} height={512} priority /></div><span>{profile.handle || "@PREVAILEN"}</span></div><h1>{profile.title || "BIZ BILAN BOG‘LANING"}</h1><p>{profile.subtitle || "Yangi drop, yangilik va barcha rasmiy sahifalarimiz bir joyda."}</p><div className="social-page__links">{social.items.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer"><span className="social-page__icon">{item.iconUrl ? <img src={storefrontAssetUrl(item.iconUrl)} style={{ width: item.iconSize || 24, height: item.iconSize || 24 }} alt="" /> : <b>↗</b>}</span><span><b>{item.label}</b>{item.text && <small>{item.text}</small>}</span><i>↗</i></a>)}{!social.items.length && <div className="social-page__empty">Ijtimoiy tarmoq havolalari tez orada qo‘shiladi.</div>}</div></section></main>;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const languages = [
  { code: "uz", label: "O'zbekcha", flag: "🇺🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
] as const;

type Locale = (typeof languages)[number]["code"];
type Dictionary = Record<string, string>;

const common: Dictionary = {
  shop: "Shop", collections: "Collections", lookbook: "Lookbook", blog: "Blog",
  search: "Search", favorites: "Favorites", cart: "Cart", profile: "Profile",
  newCollection: "New collection", go: "Go", accessories: "Accessories", merch: "Merch",
  tactical: "Tactical", records: "Records", playlist: "Go to playlist", readMore: "Read more",
  customers: "For customers", contacts: "Contacts", payments: "Payment methods",
  delivery: "Delivery and payment", exchange: "Exchange and returns", sizeGuide: "Size guide",
  support: "Support", privacy: "Privacy policy", terms: "Terms of service",
  language: "Language", confirm: "Confirm", location: "Tashkent", sale: "New arrivals with 20% off",
  album: "Album: SIREN", articleTitle: "We need more skaters", allProducts: "All products",
  home: "Home", description: "Description", notFound: "Product not found",
  name: "Name", color: "Color", size: "Size", discountCode: "Discount code", enterCode: "Enter code",
  apply: "Apply", orderSummary: "Order summary", subtotal: "Subtotal", estimatedDelivery: "Estimated delivery",
  total: "Total", checkout: "Place order", select: "Select item", unselect: "Unselect item",
  decrease: "Decrease quantity", increase: "Increase quantity",
  chooseColor: "Choose color",
  chooseSize: "Choose size", sizeHelp: "What is my size?", addToCart: "Add to cart", goToCart: "Go to cart",
  favoriteAdd: "Add to favorites", freeDelivery: "Free delivery on orders over 2,000,000 UZS",
  darkGray: "Dark gray", black: "Black", cream: "Cream", pink: "Pink",
  classicTee: "Classic T-shirt", graphicPrint: "Printed graphic on front and back", cotton: "100% cotton",
  standardFit: "Regular fit", article: "Article: 165264270", processing: "Order processing takes 1–2 days",
  beforeNoon: "Orders placed before 12:00 CET ship the same business day", shipping: "Orders are shipped by UPS ground delivery and to access points",
  returns: "Items can be returned within 30 days of purchase", returnPolicy: "Return policy",
  gray: "Gray", previous: "Previous", next: "Next", back: "Back", playTrack: "Play track",
  articleDate: "Mon, Dec 22 2025", articleBody: "Mark McGowan discovered Shepard Fairey's work 20 years ago when he first moved from England to America. He was struck by the contradictions embedded in American culture.",
};

const translations: Record<Locale, Dictionary> = {
  en: common,
  uz: { ...common, shop: "Do'kon", collections: "Kolleksiyalar", lookbook: "Lukbuk", blog: "Blog", search: "Qidiruv", favorites: "Sevimlilar", cart: "Savat", profile: "Profil", newCollection: "Yangi kolleksiya", go: "O'tish", accessories: "Aksessuarlar", merch: "Merch", tactical: "Taktik", records: "Yozuvlar", playlist: "Pleylistga o'tish", readMore: "Davomini o'qish", customers: "Xaridorlarga", contacts: "Kontaktlar", payments: "To'lov turlari", delivery: "Yetkazib berish va to'lov", exchange: "Almashtirish va qaytarish", sizeGuide: "O'lchamlar jadvali", support: "Qo'llab-quvvatlash", privacy: "Maxfiylik siyosati", terms: "Foydalanish shartlari", language: "Til", confirm: "Tasdiqlash", location: "Toshkent", sale: "Yangi mahsulotlarga 20% chegirma", articleTitle: "Bizga ko'proq skeyterlar kerak", allProducts: "Barcha mahsulotlar", home: "Bosh sahifa", description: "Tavsif", notFound: "Mahsulot topilmadi", chooseColor: "Rangni tanlang", chooseSize: "O'lchamni tanlang", sizeHelp: "Mening o'lchamim qaysi?", addToCart: "Savatga qo'shish", goToCart: "Savatga o'tish", favoriteAdd: "Sevimlilarga qo'shish", freeDelivery: "2 000 000 so'mdan ortiq buyurtmalarga bepul yetkazib berish", darkGray: "To'q kulrang", black: "Qora", cream: "Krem", pink: "Pushti", classicTee: "Klassik futbolka", graphicPrint: "Old va orqadagi bosma grafika", cotton: "100% paxta", standardFit: "Standart bichim", article: "Artikul: 165264270", processing: "Buyurtmani qayta ishlash 1–2 kun davom etadi", beforeNoon: "12:00 CET gacha berilgan buyurtmalar shu ish kunida yuboriladi", shipping: "Buyurtmalar UPS yer usti yetkazib berishi orqali jo'natiladi", returns: "Mahsulot xariddan keyin 30 kun ichida qaytarilishi mumkin", returnPolicy: "Qaytarish siyosati" },
  ru: { ...common, shop: "Магазин", collections: "Коллекции", lookbook: "Лукбук", blog: "Блог", search: "Поиск", favorites: "Избранное", cart: "Корзина", profile: "Профиль", newCollection: "Новая коллекция", go: "Перейти", accessories: "Аксессуары", tactical: "Тактичные", records: "Записи", playlist: "Перейти в плейлист", readMore: "Читать дальше", customers: "Покупателю", contacts: "Контакты", payments: "Виды оплаты", delivery: "Доставка и оплата", exchange: "Обмен и возврат", sizeGuide: "Размерная сетка", support: "Поддержка", privacy: "Политика конфиденциальности", terms: "Пользовательское соглашение", language: "Язык", confirm: "Подтвердить", location: "Ташкент", sale: "Новые поступления со скидкой 20%", album: "Альбом: SIREN", articleTitle: "Нам нужно больше скейтеров", articleDate: "Пн, 22 дек. 2025", articleBody: "Марк Макгоуэн открыл для себя работы Шепарда Фейри 20 лет назад, когда впервые переехал из Англии в Америку. Его поразили противоречия, заложенные в американской культуре.", allProducts: "Все товары", home: "Главная", description: "Описание", notFound: "Товар не найден", name: "Название", color: "Цвет", size: "Размер", discountCode: "Скидочный код", enterCode: "Введите код", apply: "Применить", orderSummary: "Сводка заказа", subtotal: "Промежуточный итог", estimatedDelivery: "Предполагаемая доставка", total: "Общий", checkout: "ОФОРМИТЬ ЗАКАЗ", select: "Выбрать товар", unselect: "Убрать товар", decrease: "Уменьшить количество", increase: "Увеличить количество", chooseColor: "Выберите цвет", chooseSize: "Выберите размер", sizeHelp: "Какой у меня размер?", addToCart: "Добавить в корзину", goToCart: "Перейти в корзину", favoriteAdd: "Добавить в избранное", freeDelivery: "Бесплатная доставка при заказе от 2 000 000 СУМ", darkGray: "Тёмно-серый", black: "Чёрный", cream: "Кремовый", pink: "Розовый", gray: "Серый", classicTee: "Классическая футболка", graphicPrint: "Графический принт спереди и сзади", cotton: "100% хлопок", standardFit: "Стандартная посадка", article: "Артикул: 165264270", processing: "Обработка заказа занимает 1–2 дня", beforeNoon: "Заказы, оформленные до 12:00 CET, отправляются в тот же рабочий день", shipping: "Заказы доставляются наземной службой UPS", returns: "Товар можно вернуть в течение 30 дней после покупки", returnPolicy: "Политика возврата", previous: "Предыдущее", next: "Следующее", back: "Назад", playTrack: "Воспроизвести трек" },
  ja: { ...common, shop: "ショップ", collections: "コレクション", lookbook: "ルックブック", blog: "ブログ", search: "検索", favorites: "お気に入り", cart: "カート", profile: "プロフィール", newCollection: "新作コレクション", go: "見る", accessories: "アクセサリー", merch: "グッズ", tactical: "タクティカル", records: "レコード", playlist: "プレイリストへ", readMore: "続きを読む", customers: "お客様へ", contacts: "お問い合わせ", payments: "支払い方法", delivery: "配送と支払い", exchange: "交換・返品", sizeGuide: "サイズガイド", support: "サポート", privacy: "プライバシーポリシー", terms: "利用規約", language: "言語", confirm: "確認", location: "タシケント", sale: "新着商品 20%オフ", articleTitle: "もっとスケーターが必要", allProducts: "すべての商品", home: "ホーム", description: "説明", notFound: "商品が見つかりません" },
  tr: { ...common, shop: "Mağaza", collections: "Koleksiyonlar", lookbook: "Lookbook", blog: "Blog", search: "Ara", favorites: "Favoriler", cart: "Sepet", profile: "Profil", newCollection: "Yeni koleksiyon", go: "Git", accessories: "Aksesuarlar", tactical: "Taktik", records: "Kayıtlar", playlist: "Çalma listesine git", readMore: "Devamını oku", customers: "Müşteriler için", contacts: "İletişim", payments: "Ödeme yöntemleri", delivery: "Teslimat ve ödeme", exchange: "Değişim ve iade", sizeGuide: "Beden tablosu", support: "Destek", privacy: "Gizlilik politikası", terms: "Kullanım koşulları", language: "Dil", confirm: "Onayla", location: "Taşkent", sale: "Yeni ürünlerde %20 indirim", articleTitle: "Daha fazla kaykaycıya ihtiyacımız var", allProducts: "Tüm ürünler", home: "Ana sayfa", description: "Açıklama", notFound: "Ürün bulunamadı" },
  ko: { ...common, shop: "스토어", collections: "컬렉션", lookbook: "룩북", blog: "블로그", search: "검색", favorites: "찜", cart: "장바구니", profile: "프로필", newCollection: "새 컬렉션", go: "보기", accessories: "액세서리", tactical: "택티컬", records: "레코드", playlist: "플레이리스트로", readMore: "더 보기", customers: "고객 안내", contacts: "문의", payments: "결제 방법", delivery: "배송 및 결제", exchange: "교환 및 반품", sizeGuide: "사이즈 가이드", support: "고객 지원", privacy: "개인정보 처리방침", terms: "이용 약관", language: "언어", confirm: "확인", location: "타슈켄트", sale: "신상품 20% 할인", articleTitle: "더 많은 스케이터가 필요해", allProducts: "전체 상품", home: "홈", description: "설명", notFound: "상품을 찾을 수 없습니다" },
  de: { ...common, shop: "Shop", collections: "Kollektionen", lookbook: "Lookbook", blog: "Blog", search: "Suche", favorites: "Favoriten", cart: "Warenkorb", profile: "Profil", newCollection: "Neue Kollektion", go: "Ansehen", accessories: "Accessoires", tactical: "Taktisch", records: "Aufnahmen", playlist: "Zur Playlist", readMore: "Weiterlesen", customers: "Für Kunden", contacts: "Kontakte", payments: "Zahlungsarten", delivery: "Lieferung und Zahlung", exchange: "Umtausch und Rückgabe", sizeGuide: "Größentabelle", support: "Support", privacy: "Datenschutz", terms: "Nutzungsbedingungen", language: "Sprache", confirm: "Bestätigen", location: "Taschkent", sale: "20% Rabatt auf Neuheiten", articleTitle: "Wir brauchen mehr Skater", allProducts: "Alle Produkte", home: "Startseite", description: "Beschreibung", notFound: "Produkt nicht gefunden" },
  fr: { ...common, shop: "Boutique", collections: "Collections", lookbook: "Lookbook", blog: "Blog", search: "Recherche", favorites: "Favoris", cart: "Panier", profile: "Profil", newCollection: "Nouvelle collection", go: "Voir", accessories: "Accessoires", tactical: "Tactique", records: "Disques", playlist: "Voir la playlist", readMore: "Lire la suite", customers: "Clients", contacts: "Contacts", payments: "Moyens de paiement", delivery: "Livraison et paiement", exchange: "Échange et retour", sizeGuide: "Guide des tailles", support: "Assistance", privacy: "Politique de confidentialité", terms: "Conditions d'utilisation", language: "Langue", confirm: "Confirmer", location: "Tachkent", sale: "-20% sur les nouveautés", articleTitle: "Nous avons besoin de plus de skateurs", allProducts: "Tous les produits", home: "Accueil", description: "Description", notFound: "Produit introuvable" },
  es: { ...common, shop: "Tienda", collections: "Colecciones", lookbook: "Lookbook", blog: "Blog", search: "Buscar", favorites: "Favoritos", cart: "Carrito", profile: "Perfil", newCollection: "Nueva colección", go: "Ver", accessories: "Accesorios", tactical: "Táctico", records: "Discos", playlist: "Ir a la lista", readMore: "Leer más", customers: "Clientes", contacts: "Contacto", payments: "Métodos de pago", delivery: "Entrega y pago", exchange: "Cambios y devoluciones", sizeGuide: "Guía de tallas", support: "Soporte", privacy: "Política de privacidad", terms: "Términos de uso", language: "Idioma", confirm: "Confirmar", location: "Taskent", sale: "20% de descuento en novedades", articleTitle: "Necesitamos más skaters", allProducts: "Todos los productos", home: "Inicio", description: "Descripción", notFound: "Producto no encontrado" },
  zh: { ...common, shop: "商店", collections: "系列", lookbook: "型录", blog: "博客", search: "搜索", favorites: "收藏", cart: "购物车", profile: "个人资料", newCollection: "新系列", go: "查看", accessories: "配饰", tactical: "机能", records: "唱片", playlist: "前往播放列表", readMore: "阅读更多", customers: "客户服务", contacts: "联系方式", payments: "支付方式", delivery: "配送与付款", exchange: "换货和退货", sizeGuide: "尺码指南", support: "支持", privacy: "隐私政策", terms: "使用条款", language: "语言", confirm: "确认", location: "塔什干", sale: "新品八折", articleTitle: "我们需要更多滑板手", allProducts: "全部商品", home: "主页", description: "描述", notFound: "未找到商品" },
  it: { ...common, shop: "Negozio", collections: "Collezioni", lookbook: "Lookbook", blog: "Blog", search: "Cerca", favorites: "Preferiti", cart: "Carrello", profile: "Profilo", newCollection: "Nuova collezione", go: "Vai", accessories: "Accessori", tactical: "Tattico", records: "Dischi", playlist: "Vai alla playlist", readMore: "Leggi tutto", customers: "Clienti", contacts: "Contatti", payments: "Metodi di pagamento", delivery: "Consegna e pagamento", exchange: "Cambio e reso", sizeGuide: "Guida alle taglie", support: "Supporto", privacy: "Privacy", terms: "Termini di utilizzo", language: "Lingua", confirm: "Conferma", location: "Tashkent", sale: "20% di sconto sui nuovi arrivi", articleTitle: "Ci servono più skater", allProducts: "Tutti i prodotti", home: "Home", description: "Descrizione", notFound: "Prodotto non trovato" },
};

type LanguageContextValue = {
  locale: Locale;
  language: (typeof languages)[number];
  t: (key: keyof typeof common) => string;
  openLanguageSelector: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ru");
  const [isOpen, setIsOpen] = useState(false);
  const [pendingLocale, setPendingLocale] = useState<Locale>("ru");

  useEffect(() => {
    const stored = localStorage.getItem("siren-locale") as Locale | null;
    if (stored && languages.some((item) => item.code === stored)) {
      setLocale(stored);
      setPendingLocale(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
    localStorage.setItem("siren-locale", locale);
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    language: languages.find((item) => item.code === locale) ?? languages[1],
    t: (key) => translations[locale][key] ?? common[key] ?? key,
    openLanguageSelector: () => {
      setPendingLocale(locale);
      setIsOpen(true);
    },
  }), [locale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
      {isOpen && (
        <div className="language-modal-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section className="language-modal" role="dialog" aria-modal="true" aria-label={value.t("language")} onMouseDown={(event) => event.stopPropagation()}>
            <h2>{value.t("language")}</h2>
            <div className="language-options">
              {languages.map((item) => (
                <button key={item.code} type="button" className={pendingLocale === item.code ? "is-selected" : ""} onClick={() => setPendingLocale(item.code)}>
                  <span aria-hidden="true">{item.flag}</span><span>{item.label}</span><small>{item.code.toUpperCase()}</small>
                </button>
              ))}
            </div>
            <button type="button" className="language-confirm" onClick={() => { setLocale(pendingLocale); setIsOpen(false); }}>{value.t("confirm")}</button>
          </section>
        </div>
      )}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

export function T({ text }: { text: keyof typeof common }) {
  const { t } = useLanguage();
  return <>{t(text)}</>;
}

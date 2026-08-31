export type Product = {
  id: string;
  image: string;
  alt: string;
  title: string;
  color: string;
  price: string;
};

export const heroProducts: Product[] = [
  {
    id: "legacy-drop-arm-tank-1",
    image: "/images/p1.jpg",
    alt: "LEGACY DROP ARM TANK",
    title: "LEGACY DROP ARM TANK",
    color: "GRAY",
    price: "930.000 СУМ",
  },
  {
    id: "legacy-drop-arm-tank-2",
    image: "/images/p2.jpg",
    alt: "LEGACY DROP ARM TANK",
    title: "LEGACY DROP ARM TANK",
    color: "GRAY",
    price: "930.000 СУМ",
  },
  {
    id: "legacy-drop-arm-tank-3",
    image: "/images/p3.jpg",
    alt: "LEGACY DROP ARM TANK",
    title: "LEGACY DROP ARM TANK",
    color: "GRAY",
    price: "930.000 СУМ",
  },
  {
    id: "legacy-drop-arm-tank-4",
    image: "/images/p4.jpg",
    alt: "LEGACY DROP ARM TANK",
    title: "LEGACY DROP ARM TANK",
    color: "GRAY",
    price: "930.000 СУМ",
  },
];

export const collectionSideProducts: Product[] = [
  {
    id: "legacy-drop-arm-tank-1",
    image: "/images/p1.jpg",
    alt: "LEGACY DROP ARM TANK",
    title: "LEGACY DROP ARM TANK",
    color: "GRAY",
    price: "930.000 СУМ",
  },
  {
    id: "legacy-drop-arm-tank-2",
    image: "/images/p1.jpg",
    alt: "LEGACY DROP ARM TANK",
    title: "LEGACY DROP ARM TANK",
    color: "GRAY",
    price: "930.000 СУМ",
  },
];

export const newArrivals: Product[] = [
  {
    id: "legacy-drop-arm-tank-4",
    image: "/images/p4.jpg",
    alt: "LEGACY DROP ARM TANK",
    title: "LEGACY DROP ARM TANK",
    color: "GRAY",
    price: "930.000 СУМ",
  },
  {
    id: "legacy-drop-arm-tank-3",
    image: "/images/p3.jpg",
    alt: "LEGACY DROP ARM TANK",
    title: "LEGACY DROP ARM TANK",
    color: "GRAY",
    price: "930.000 СУМ",
  },
  {
    id: "legacy-drop-arm-tank-2",
    image: "/images/p2.jpg",
    alt: "LEGACY DROP ARM TANK",
    title: "LEGACY DROP ARM TANK",
    color: "GRAY",
    price: "930.000 СУМ",
  },
  {
    id: "legacy-drop-arm-tank-1",
    image: "/images/p1.jpg",
    alt: "LEGACY DROP ARM TANK",
    title: "LEGACY DROP ARM TANK",
    color: "GRAY",
    price: "930.000 СУМ",
  },
];

export type LookbookItem = {
  id: string;
  image: string;
  alt: string;
};

/* Kept as data so an API response can replace this array without changing
   the lookbook grid component. */
export const lookbookItems: LookbookItem[] = [
  { id: "look-01", image: "/images/large-banner.jpg", alt: "Lookbook look 01" },
  { id: "look-02", image: "/images/p4.jpg", alt: "Lookbook look 02" },
  { id: "look-03", image: "/images/p2.jpg", alt: "Lookbook look 03" },
  { id: "look-04", image: "/images/small-banner.jpg", alt: "Lookbook look 04" },
  { id: "look-05", image: "/images/p1.jpg", alt: "Lookbook look 05" },
  { id: "look-06", image: "/images/collection-banner.jpg", alt: "Lookbook look 06" },
];

export type BlogArticle = {
  id: string;
  title: string;
  date: string;
  body: string;
  cover: string;
  gallery: string[];
};

/* API-ready blog shape: replace this array with a CMS/API response later. */
export const blogArticles: BlogArticle[] = [
  {
    id: "more-skaters-01",
    title: "Нам нужно больше скейтеров",
    date: "Пон, Dec 22 2025",
    body: "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.",
    cover: "/images/large-banner.jpg",
    gallery: ["/images/p1.jpg", "/images/p2.jpg", "/images/p3.jpg"],
  },
  {
    id: "more-skaters-02",
    title: "Нам нужно больше скейтеров",
    date: "Пон, Dec 22 2025",
    body: "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.",
    cover: "/images/small-banner.jpg",
    gallery: ["/images/p4.jpg", "/images/p3.jpg", "/images/p2.jpg"],
  },
];

export type Record = {
  image: string;
  color: string;
  title: string;
  genre: string;
};

export const records: Record[] = [
  {
    image: "/images/p1.jpg",
    color: "record-card--blue",
    title: "Lil cover",
    genre: "Rap",
  },
  {
    image: "/images/banner.jpg",
    color: "record-card--pink",
    title: "Cyberbonk",
    genre: "Тесno",
  },
  {
    image: "/images/collection-banner.jpg",
    color: "record-card--brown",
    title: "Given up",
    genre: "Nu metal",
  },
  {
    image: "/images/large-banner.jpg",
    color: "record-card--red",
    title: "Leech",
    genre: "Rapcore/nu metal",
  },
  {
    image: "/images/small-banner.jpg",
    color: "record-card--green",
    title: "Lil cover",
    genre: "Alternative",
  },
  {
    image: "/images/p4.jpg",
    color: "record-card--yellow",
    title: "Let it happen",
    genre: "Indie",
  },
];

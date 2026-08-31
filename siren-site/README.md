# SIREN — Next.js 16

Статический сайт SIREN, полностью переписанный с HTML/CSS на **Next.js 16** (App Router + TypeScript).
UI полностью сохранён — вся вёрстка и стили идентичны оригиналу.

## Стек

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript**
- `next/font/local` — локальный шрифт Gilroy Extrabold
- `next/image` — оптимизация изображений и иконок

## Запуск

```bash
npm install
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000).

Production-сборка:

```bash
npm run build
npm run start
```

## Структура

```
app/
  layout.tsx        # корневой layout, подключение шрифта Gilroy
  page.tsx          # главная страница — сборка всех секций
  globals.css       # все стили (идентичны оригинальному style.css)
components/
  FixedTop.tsx      # фиксированная шапка (topbar + header)
  TopBar.tsx        # верхняя чёрная полоса с бегущей строкой
  Header.tsx        # навигация и иконки
  Hero.tsx          # первый экран
  Products.tsx      # сетка/слайдер товаров
  ProductCard.tsx   # карточка товара
  Collection.tsx    # блок «Новая коллекция»
  Promo.tsx         # промо-баннеры (аксессуары / мерч)
  CategoryStrip.tsx # полоса категорий
  Records.tsx       # секция «Записи»
  RecordPlayer.tsx  # проигрыватель с вращающейся пластинкой (client component)
  Blog.tsx          # блог
  Footer.tsx        # футер
lib/
  data.ts           # данные товаров и записей
public/
  images/ icons/ fonts/   # статические ассеты
```

## Заметки

- Единственная интерактивность оригинала (`script.js` — вращение пластинки по клику)
  перенесена в клиентский компонент `RecordPlayer.tsx` через `useState`.
- Оригинальные файлы остались в папке `siren-site/` как референс.

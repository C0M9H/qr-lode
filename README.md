# QR & Barcode Scanner PWA — Vue 3

Aplicație PWA pentru scanare coduri QR și coduri de bare (1D/2D), construită cu Vue 3, Vite și ZXing.

## Funcționalități

- 📷 **Scanare live** prin cameră (back/front)
- 📊 **Suport coduri de bare** — QR, Code128, EAN, UPC, DataMatrix, și mai multe
- 📁 **Import imagine** din galerie/fișiere
- ⚡ **Flash/Lanternă** (dispozitive compatibile)
- 📋 **Copiere & Share** rezultate
- 🔗 **Deschide link-uri** direct din rezultat
- 🕒 **Istoric** complet al scanărilor (max 200)
- ⭐ **Favorite** — marchează scanările importante
- 🔍 **Căutare** în istoric
- 📴 **Offline ready** — funcționează fără internet
- 📱 **Instalabil pe Android** ca PWă nativă

## Stack Tehnologic

| Librărie | Versiune | Rol |
|----------|----------|-----|
| Vue 3 | 3.4+ | Framework UI (Composition API) |
| Vite | 5.x | Build tool & dev server |
| vite-plugin-pwa | 0.20+ | Service Worker + Manifest |
| @zxing/library | 0.21+ | Decodare QR & Coduri de bare |
| Vue Router | 4.x | Navigare SPA |

## Instalare & Rulare

```bash
# Instalează dependențele
npm install

# Server de dezvoltare
npm run dev

# Build pentru producție
npm run build

# Preview build
npm run preview
```

## Structura Proiectului

```
qr-scanner-pwa/
├── public/
│   ├── favicon.svg
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── composables/
│   │   ├── useQRScanner.js   # Logica cameră + detecție QR
│   │   └── useHistory.js     # Management istoric (localStorage)
│   ├── components/
│   │   ├── ScannerView.vue   # Pagina principală scanner
│   │   └── HistoryView.vue   # Pagina istoric
│   ├── App.vue               # Root + navigație
│   ├── main.js               # Entry point + router
│   └── style.css             # CSS global + variabile
├── index.html
├── vite.config.js            # Configurare Vite + PWA
└── package.json
```

## Instalare ca PWA pe Android

1. Rulează `npm run build` și deploy-uiește fișierele din `dist/`
2. Deschide site-ul în Chrome pe Android
3. Chrome va afișa banner-ul "Adaugă pe ecranul principal"
4. Sau: meniu ⋮ → „Instalează aplicația" / „Adaugă pe ecranul principal"

> **Important:** PWA funcționează doar pe HTTPS (sau localhost pentru development)

## Permisiuni Necesare

- **Camera** — pentru scanare live (obligatorie)
- **Storage** — pentru importul imaginilor (opțional)

## Personalizare

Culorile principale pot fi schimbate în `src/style.css`:

```css
:root {
  --bg: #0f0f14;        /* fundal principal */
  --accent: #00e5a0;    /* culoare accent (verde) */
}
```

## Browser Support

| Browser | Suport |
|---------|--------|
| Chrome Android | ✅ Complet |
| Samsung Internet | ✅ Complet |
| Firefox Android | ⚠️ Fără flash |
| Safari iOS | ⚠️ Fără install prompt |

# Suport Coduri de Bare — Documentație Tehnică

## Tipuri de Coduri Suportate

Aplicația acum suportă o gamă largă de coduri QR și coduri de bare (1D și 2D):

### Coduri 2D
- **QR Code** — Cod QR standard
- **Data Matrix** — Cod de matrice de date
- **Aztec Code** — Cod Aztec
- **PDF417** — Format PDF 417

### Coduri 1D (Bare)
- **Code 128** — Cod standard pentru retail
- **Code 39** — Cod care conține 39 caractere
- **Code 93** — Versiune îmbunătățită a Code 39
- **EAN-13** — Standard european de 13 cifre
- **EAN-8** — Versiune compactă de 8 cifre
- **UPC-A** — Universal Product Code (USA)
- **UPC-E** — Versiune compactă a UPC
- **ITF (Interleaved 2 of 5)** — Format de 14 cifre

## Utilizare

### Scanare în Timp Real
1. Deschide aplicația pe `/scan`
2. Apasă butonul "Activează Camera"
3. Îndreaptă camera spre codul de bare
4. Aplicația detectează automat tipul de cod și îl decodează

### Încărcare Imagine
1. Click pe butonul de galerie (din controalele camerei)
2. Selectează o imagine cu cod de bare
3. Aplicația scanează automat imaginea

### Tipuri de Coduri în Istoric
Fiecare intrare în istoric arată:
- **Emoji** — Indetificare rapidă a tipului
- **Tip** — Denumirea exactă a codului (QR Code, Code 128, etc.)
- **Timestamp** — Când a fost scanat
- **Conținut** — Datele decodate

## Detalii Implementare

### Librărie Utilizată
- **@zxing/library** — Port JavaScript al faimosului ZXing library
- Suportă detectare și decodare multiformat
- Optimizat pentru browser (WebAssembly în unele cazuri)

### Componente Vue
- `useCodeScanner.js` — Composable pentru scanare
- `ScannerView.vue` — Interfață de scanare
- `HistoryView.vue` — Afișare istoric cu tipuri de coduri

### Stocare Informații
Fiecare cod scanat este stocat cu:
```javascript
{
  id: "unique-id",
  data: "cod-data",
  type: "url|email|phone|sms|wifi|contact|event|location|text",
  format: "QR_CODE|CODE_128|EAN_13|...",
  timestamp: "ISO-8601-date",
  favorite: boolean
}
```

## Exemplu de Utilizare

### Cod QR cu URL
```
Format: QR_CODE
Conținut: https://example.com
Tip autodetectat: URL 🔗
```

### Cod EAN-13 (Produs)
```
Format: EAN_13
Conținut: 5901234123457
Tip autodetectat: Text 📝
```

### Cod Code 128 (Logistică)
```
Format: CODE_128
Conținut: ABC-123456
Tip autodetectat: Text 📝
```

## Limitări și Note

1. **Performanță** — Scanarea în timp real este optimizată dar depinde de calitatea camerei și a codului
2. **Iluminare** — Codurile au nevoie de iluminare bună pentru decodare corectă
3. **Unghi** — Înclinația codului nu trebuie să fie prea mare
4. **Rezoluție** — Codurile prea mici pot fi greu de scanat
5. **Storage** — Sunt stocate maxim 200 scanări în localStorage

## Depanare

### Nu se detectează codul
- Asigură-te că codul este în cămpul vizual
- Verifică iluminarea - trebuie să fie bună
- Muta camera mai aproape dacă codul este mic
- Rotește dispozitivul pentru unghi mai bun

### Eroare cameră
- Verifică permisiunile browserului pentru cameră
- Reîncarcă pagina
- Incearcă o altă cameră (dacă sunt mai multe dispozitive)

## Viitor

Posibile îmbunătățiri:
- [ ] Support pentru mai multe coduri în aceeași imagine
- [ ] Recunoaștere automată a tipului de produs (EAN)
- [ ] Integrare barcode lookup API
- [ ] Export istoric în format CSV/PDF
- [ ] Recunoaștere OCR pentru text în imagini

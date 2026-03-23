# Hormuz Simulator — Rozšíření o kaskádové dopady

## Zadání pro Claude Code

### Kontext

Existující web: https://davidnavratil.github.io/hormuz-simulator/
Repo: https://github.com/davidnavratil/hormuz-simulator

Web je single-page React aplikace (Recharts, Tailwind) s bílým podkladem a FT/Economist estetikou. Aktuálně obsahuje 4 sekce zaměřené na ropný a plynový šok (hero, klíčové závěry, vizualizace, simulátor). Celý web je v **češtině**.

**Úkol:** Přidat novou sekci „Kaskádové dopady" — komodity za ropou (síra, helium, hnojiva, propan/butan, methanol, polymery). Tato sekce se zařadí **za existující ropný/plynový obsah** jako přirozené pokračování. Měla by zachovat identický vizuální styl (barvy, typografie, spacing) a fungovat jako integrální součást webu, ne jako přilepený addon.

**DŮLEŽITÉ — co NEZAHRNOVAT:** Dopady na českou inflaci a HDP. Žádné CPI odhady, žádné HDP scénáře. Sekce ukazuje komoditní expozice, kaskádové řetězce a alternativní trasy — ne makroekonomické projekce.

---

## Nová sekce: Kaskádové dopady (Sekce 5)

### 5.1 Intro blok

Nadpis: **„Za ropou je ještě něco horšího"**
Podtitulek: *„Síra, helium, močovina a další komodity, které rozhodnou o cenách potravin a budoucnosti průmyslu"*

Krátký úvodní odstavec (3–4 věty):
> Hormuz není jen ropná brána. Přes průliv prochází 45–50 % globálně obchodované síry, třetina světového helia, 30 % exportované močoviny a 35–40 % zkapalněných ropných plynů. Na rozdíl od ropy, která má alternativní trasy pro 22–30 % zálivové produkce, chemikálie a hnojiva mají obchvat jen pro 7–10 %.

Pod tím **3 stat karty** (stejný styl jako hero sekce):

| Stat | Hodnota | Popis |
|---|---|---|
| Chemický obchvat | 7–10 % | vs. 22–30 % u ropy |
| Komodit bez substitutu | 2 | Síra a helium — fyzikálně nenahraditelné |
| Hodnota uvězněných exportů | >80 mld. $ | Petrochemie + hnojiva ročně |

---

### 5.2 Interaktivní přehled komodit (hlavní vizualizace)

**Horizontální bar chart** s přepínačem metriky.

Uživatel si volí, co chce vidět:
- [ ] Hormuzská expozice (% globálního obchodu)
- [ ] Cenový nárůst (% od začátku krize)
- [ ] Nahraditelnost (škála: žádná → částečná → plná)

**Data pro bar chart:**

```javascript
const CASCADE_COMMODITIES = [
  {
    name: "Síra",
    category: 1,   // 1 = kritická, 2 = významná, 3 = mírná
    hormuzPct: 47.5, // střed rozsahu 45–50
    priceChange: 12,  // +12 % (zatím; pre-crisis rally)
    substitution: 0,  // 0 = žádný, 0.5 = částečný, 1 = plný
    czChannel: "Zemědělství → potraviny",
    keyFact: "Žádná strategická rezerva nikde na světě. Ceny rostly 440 % už před krizí.",
    color: "#DC2626",  // red
  },
  {
    name: "Helium",
    category: 1,
    hormuzPct: 33,
    priceChange: 85,   // střed 70–100
    substitution: 0,
    czChannel: "Čipy, magnetická rezonance, věda",
    keyFact: "Odpaří se z kontejneru za 35–48 dní. Nevratná ztráta. Katar vyhlásil vyšší moc.",
    color: "#DC2626",
  },
  {
    name: "Močovina",
    category: 1,
    hormuzPct: 30,
    priceChange: 35,
    substitution: 0,
    czChannel: "Zemědělství → potraviny",
    keyFact: "QAFCO (Katar): 5,6 mil. tun/rok — největší exportér. Čína zakázala vývoz do 8/2026.",
    color: "#B45309",  // amber
  },
  {
    name: "Propan/butan",
    category: 1,
    hormuzPct: 37.5,  // střed 35–40
    priceChange: 25,   // střed 20–30
    substitution: 0.3,
    czChannel: "Petrochemie, 50–60 tis. domácností",
    keyFact: "18 mil. tun čínských závodů závisí výhradně na zálivovém propanu.",
    color: "#B45309",
  },
  {
    name: "Methanol",
    category: 1,
    hormuzPct: 40,
    priceChange: 15,   // střed 10–20
    substitution: 0.2,
    czChannel: "Dřevozpracující průmysl, benzín",
    keyFact: "Írán = světová jednička. 55 % čínského dovozu. Přes Nizozemsko do ČR.",
    color: "#B45309",
  },
  {
    name: "Polyetylen/polypropylen",
    category: 2,
    hormuzPct: 17.5,  // střed 15–20
    priceChange: 52.5, // střed PE 50–80, PP 25
    substitution: 0.6,
    czChannel: "Plasty, automobilový průmysl",
    keyFact: "USA a Yanbu nabízejí alternativu. Cenový šok, ne fyzický nedostatek.",
    color: "#475569",  // gray
  },
  {
    name: "Amoniak",
    category: 2,
    hormuzPct: 30,
    priceChange: 15,
    substitution: 0.5,
    czChannel: "Hnojiva",
    keyFact: "Nové US kapacity 2,3 mil. t pomáhají. Evropa ale trvale ztratila vlastní výrobu.",
    color: "#475569",
  },
  {
    name: "Nafta (petrochemická)",
    category: 2,
    hormuzPct: 24,
    priceChange: 25,
    substitution: 0.6,
    czChannel: "Krakovací surovina",
    keyFact: "Ruská nafta se slevou, přechod na propan. Unipetrol se přizpůsobí za 2–4 týdny.",
    color: "#475569",
  },
];
```

**Design:**
- Horizontální bary, seřazené od nejvyšší expozice
- Barvy podle kategorie: červená (1. kat.), amber (1. kat. s částečným substitutem), šedá (2.+3. kat.)
- Po kliknutí na bar se rozbalí detail s `keyFact` a `czChannel`
- Nad grafem toggle: "Expozice" | "Cena" | "Nahraditelnost"

---

### 5.3 Kaskádový řetězec — síra (interaktivní diagram)

**Vertikální flow diagram** ukazující řetězec:

```
Uzavření Hormuzu
    ↓
45–50 % globálních exportů síry blokováno
    ↓
Nedostatek kyseliny sírové
(60–70 % jde do fosfátových hnojiv)
    ↓
Výpadek fosfátových hnojiv
(Maroko/OCP: −3,7 mil. tun zálivové síry)
    ↓
Vyšší ceny potravin
(prodleva 3–6 měsíců)
```

**Interaktivita:** Při najetí na každý krok se zobrazí detailní vysvětlení v postranním panelu (nebo expandovatelný box).

**Vpravo od diagramu:** Klíčová čísla (stejný layout jako sulfur stats v prezentaci):
- 85 mil. tun — globální produkce/rok
- 45–50 % — zálivový podíl na exportech
- ~$577/t — aktuální dovozní cena Čína (Argus, 9. 3. 2026)
- 0 tun — strategická rezerva (nikde na světě)

---

### 5.4 Helium — nevratná ztráta (vizualizace odpařování)

**Animovaný countdown:**

Vizualizace 200 kryogenních kontejnerů (jako grid malých ikon). Uživatel vidí slider „Dny od uzavření" (0–90). Jak posouvá slider:
- Den 0: všech 200 kontejnerů plných (modrá)
- Den 35: kontejnery začínají blednout/mizet
- Den 48: většina pryč (šedá/prázdná)
- Den 90: všechny ztracené

Pod tím tři sektorové karty (stejný design jako v prezentaci):
- **Polovodiče:** Litografie pro čipy. Jižní Korea: 64,7 % helia z Kataru.
- **Zdravotnictví:** ~140–150 přístrojů MR v Česku. Méně než 5 % bez helia.
- **Věda:** ELI Beamlines (Dolní Břežany). Žádná alternativa k tekutému heliu.

---

### 5.5 Alternativní trasy — ropa vs. chemie (srovnávací vizualizace)

**Dva půlkruhové „gauge" grafy** vedle sebe:

| | Ropa | Petrochemie a hnojiva |
|---|---|---|
| Obchvat | 22–30 % | 7–10 % |
| Barva | Teal | Červená |
| Pod textem | Ropovody East-West, ADCOP | Yanbu 4–5 mil. t + Omán 3–4 mil. t |

Pod gauges: **4 karty „Kdo je uvězněn":**

```javascript
const STRANDED = [
  { country: "Katar", capacity: "~17,7 mil. t", bypass: "0 %", note: "Hnojiva, plasty, helium — vše za Hormuzem" },
  { country: "Spoj. arab. emiráty", capacity: "~10 mil. t", bypass: "0 %", note: "Borouge (6,4 mil. t plastů) — žádná alt. trasa" },
  { country: "Kuvajt", capacity: "6+ mil. t", bypass: "0 %", note: "Kuvajtská petrochemie — žádná infrastruktura" },
  { country: "Saúd. Arábie (Jubail)", capacity: "~55 mil. t", bypass: "~8 %", note: "Hnojiva i fosfáty za Hormuzem" },
];
```

---

### 5.6 Hnojivový dvojitý šok (dusík + fosfor)

**Dva sloupce vedle sebe** (amber + červená):

**Levý sloupec — DUSÍK (N):**
- Močovina: 30 % exportů za Hormuzem
- Katarský QAFCO: 5,6 mil. tun/rok
- Čína: zakázala vývoz do 8/2026
- EU kapacita: trvale snížena (Yara, BASF)
- Cena: +35 % na tříleté maximum

**Pravý sloupec — FOSFOR (P):**
- Síra → fosfáty: 45–50 % exportů za Hormuzem
- Maroko (OCP): 3,7 mil. tun zálivové síry chybí
- Čína: fosfáty zakázány do 8/2026
- Ma'aden (Saúdská Arábie): za Hormuzem — třetí zdroj pryč
- Cena síry: +12 % (rally předběhla krizi)

Pod sloupci callout box:
> **Dvojitý šok:** Poprvé simultánní výpadek obou hlavních makro-živin. V 2022 šlo jen o dusík (přes cenu plynu). Načasování zasahuje jarní setbu.

---

### 5.7 Přístavní kongesce (volitelné — nice to have)

**Mapa Evropy** (zjednodušená SVG) s 4 přístavy a vizuální indikací přetížení:

| Přístav | Nárůst čekací doby | Problém |
|---|---|---|
| Rotterdam | +100 % | Stávky, nízká hladina Rýna |
| Antverpy | +37 % | Přetížení terminálů |
| Hamburk | +49 % | Železniční překladiště na limitu |
| Bremerhaven | +77 % | Nedostatek pracovní síly |

Pod mapou: „Suez tranzit −57 % | Objížďka přes mys Dobré naděje: +10–14 dní"

Poznámka: Data o přístavech pocházejí z období hútíjské krize 2024–25; aktuální hormuzská eskalace trend prohlubuje.

---

## Navigace

Přidat do existující navigace (pokud existuje top nav nebo scroll-to menu) odkaz „Kaskádové dopady" vedoucí na novou sekci.

Pokud web nemá navigaci, přidat jednoduchou sticky navigaci nahoře:
`Ropný šok | Kaskádové dopady`

---

## Design guidelines

### Barvy (konzistentní s existujícím webem)

```javascript
const COLORS = {
  navy: "#1A1A2E",       // titulky, dark bg
  white: "#FFFFFF",
  offWhite: "#F8FAFC",   // card bg
  red: "#DC2626",        // kritické komodity, žádný substitut
  amber: "#B45309",      // středně kritické
  blue: "#11457E",       // helium sektor
  teal: "#0D9488",       // ropa (pozitivní bypass)
  textDark: "#1E293B",
  textMid: "#475569",
  textLight: "#94A3B8",
  border: "#E2E8F0",
  redLight: "#FEE2E2",
  amberLight: "#FEF3C7",
  blueLight: "#DBEAFE",
  tealLight: "#CCFBF1",
};
```

### Typografie

- Nadpisy: Georgia (serif), bold
- Body text: system-ui / Calibri, regular
- Stat numbers: Georgia, 28–42pt, bold
- Labels: Calibri, 10–11pt, text-light barva

### Layout

- Max-width: 1100px, centered
- Card shadow: `0 1px 3px rgba(0,0,0,0.06)`
- Accent bar na kartách: 4px levý border v barvě kategorie
- Žádné accent lines pod titulky (AI estetika)
- Bílý podklad všude (kromě hero/outro pokud existují)

### Jazyk

**VŠECHNO v češtině.** Žádné anglicismy:
- bypass → obchvat / alternativní trasa
- feedstock → surovina
- hub → přepravní uzel
- yield → výtěžnost
- rationing → příděly
- force majeure → vyšší moc
- LPG → propan a butan / zkapalněné ropné plyny
- PE/PP → polyetylen / polypropylen (plný název)
- MT → mil. tun
- MCM → mil. m³
- CPI → inflace (ale **nepoužívat** — viz omezení níže)

---

## Co NEDĚLAT

1. **Žádné české makro projekce** — žádný CPI dopad, žádný HDP dopad, žádné „inflace +X p.b." Tato sekce ukazuje globální komoditní expozice a transmisní řetězce.
2. **Žádné tmavé pozadí** (kromě případného outro)
3. **Žádné animace při loadu** — žádné fade-in sekce
4. **Žádné modální okna**
5. **Nekombinovat s existujícím ropným simulátorem** — kaskádová sekce je samostatná, jen vizuálně navazuje
6. **Žádné anglicismy** — viz seznam výše
7. **Žádné „dashboardové" barvy** (neonová zelená, modrá gradients) — FT/Economist estetika

---

## Datové zdroje (uvést na konci sekce)

```
Zdroje: USGS (síra, helium), NDSU Agricultural Trade Monitor březen 2026 (hnojiva),
Argus Media (ceny síry), Kornbluth Helium Consulting (helium),
StoneX (močovina), IEA/EIA (alternativní trasy, Hormuz toky),
OECD/ÚZIS (magnetická rezonance), Cooperative Logistics Network (přístavy).
Analýza: David Navrátil, hlavní ekonom České spořitelny · Březen 2026
```

---

## Validace po implementaci

Ověř:

1. **Konzistence dat** — čísla v grafech a kartách musí odpovídat hodnotám v `CASCADE_COMMODITIES` objektu
2. **Responsive** — sekce musí fungovat na mobilu (Substack embed). Bary, karty a diagramy se musí stackovat vertikálně na malém viewportu
3. **Vizuální konzistence** — nová sekce musí vypadat jako integrální součást webu, ne jako addon. Stejné fonty, barvy, spacing, card styl
4. **Kaskádový diagram síry** — 5 kroků, šipky mezi nimi, klikatelné detaily
5. **Heliový countdown** — slider 0–90 dní, vizuální úbytek kontejnerů
6. **Bypass gauge** — dva půlkruhy, 22–30 % vs. 7–10 %, správné barvy
7. **Žádné anglicismy** v UI — grep kód na: bypass, feedstock, hub, yield, LPG, PE/PP, MT, MCM, CPI, GDP, buffer, spot, benchmark, rationing

---

## Implementační poznámky

- Web je hostovaný na GitHub Pages — po push do `main` branch se automaticky deployne
- Existující kód je pravděpodobně jeden velký JSX soubor nebo několik React komponent
- Přidávej nové komponenty do existující struktury, nerozbíjej to co funguje
- Pokud je web příliš velký pro jeden soubor, rozděl na `components/CascadeSection.jsx` a importuj
- Recharts pro grafy — stejná knihovna jako v existujícím webu
- Tailwind pro styling — konzistentní s existujícím
- Testuj na `npm run dev` nebo `npm start` podle toho, co repo používá

---

## Struktura souborů (orientační)

```
hormuz-simulator/
├── src/
│   ├── App.jsx              (existující — přidat import CascadeSection)
│   ├── components/
│   │   ├── ...              (existující komponenty)
│   │   └── CascadeSection.jsx   ← NOVÝ
│   ├── data/
│   │   └── cascadeData.js       ← NOVÝ (CASCADE_COMMODITIES + STRANDED)
│   └── ...
├── public/
│   └── index.html
└── package.json
```

Pokud repo nepoužívá `src/components/` strukturu, přizpůsob se existujícímu layoutu.

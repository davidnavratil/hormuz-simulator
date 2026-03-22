/* ============================================================
   Hormuz Crisis Simulator
   David Navrátil · Peníze, procenta a prosperita · Březen 2026
   ============================================================ */

import { useState, useMemo, useCallback, useEffect, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ReferenceLine, ResponsiveContainer, Cell, LabelList
} from 'recharts';

const html = htm.bind(createElement);

// ============================================================
// LIVE PRICE LOADING
// ============================================================

let livePrices = null;
try {
  const resp = await fetch('prices.json');
  if (resp.ok) livePrices = await resp.json();
} catch { /* use defaults */ }

// ============================================================
// CONSTANTS & DATA
// ============================================================

const REFERENCE_DATA = {
  hormuzFlow: { oil: 20, lng: 112, oilPct: 25, lngPct: 19 },
  bypassCapacity: { min: 3.5, max: 5.5 },
  globalConsumption: 103,
  iaeRelease: 400,
  gulfStorage: { total: 350, available: 100 },
  qatarLNG: { capacity: 77, globalShare: 0.19 },
  usLNG: { capacity: 14.6, utilization: 1.0 },
  czech: {
    oilSPR: 20.3, oilSPRDays: 90,
    gasStorage: 3.3, gasStorageDays: 140,
    debtToGDP: 43, cpiAmplification: 2.0,
    currentCPI: 1.4, cnbRate: 3.50,
    energyIntensityAboveEU: 20,
  },
  currentCrisis: {
    preCrisisBrent: livePrices?.preCrisisBrent ?? 68,
    currentBrent: livePrices?.brent ?? 112,
    peakBrent: livePrices?.peakBrent ?? 126,
    preCrisisTTF: livePrices?.preCrisisTTF ?? 36,
    currentTTF: livePrices?.ttf ?? 60,
  },
  pricesUpdated: livePrices?.updated ?? null,
};

const SENSITIVITY_DATA = [
  { label: 'εd=−0,07 εs=0,03', shock10: 136, shock20: 204 },
  { label: 'εd=−0,10 εs=0,05', shock10: 113, shock20: 158 },
  { label: 'εd=−0,10 εs=0,10', shock10: 102, shock20: 136 },
  { label: 'εd=−0,14 εs=0,15', shock10: 91,  shock20: 115 },
];

const STOCKPILE_DATA = [
  { label: '10 % × 1 měsíc',   need: 217,  color: '#22C55E' },
  { label: '10 % × 3 měsíce',  need: 586,  color: '#EAB308' },
  { label: '10 % × 6 měsíců',  need: 1150, color: '#DC2626' },
  { label: '20 % × 1 měsíc',   need: 434,  color: '#EAB308' },
  { label: '20 % × 6 měsíců',  need: 2230, color: '#DC2626' },
];

const DESTRUCTION_OIL = [
  { range: '90–110',  label: 'Minimální dopad',   color: '#22C55E', desc: 'Drobné omezování spotřeby, méně jízd autem' },
  { range: '110–130', label: 'Počáteční destrukce', color: '#EAB308', desc: 'Chemie, cement, keramika zpomalují' },
  { range: '130–155', label: 'Výrazná destrukce',  color: '#F97316', desc: 'Petrochemie, automobilky omezují výrobu' },
  { range: '155+',    label: 'Plošná destrukce',   color: '#DC2626', desc: 'Ropa > 5,2 % HDP → historický práh recese' },
];

const DESTRUCTION_GAS = [
  { range: '35–50',  label: 'Coal switch',        color: '#22C55E', desc: 'Elektrárny přechází na uhlí' },
  { range: '50–100', label: 'Průmyslové odstávky', color: '#EAB308', desc: 'Sklárny, hutnictví pod breakeven' },
  { range: '100–150', label: 'Plošná destrukce',   color: '#F97316', desc: 'Amoniak, ocel, keramika stojí' },
  { range: '150+',   label: 'Energetická krize',   color: '#DC2626', desc: 'Režim roku 2022, cenové stropy' },
];

const CZECH_SCENARIOS = [
  { name: '10 % (3 měs.)', brent: '91–136', ttf: '50–75', cpi: '+2 až +6', gdp: '−1,0 až −2,5', severity: 'moderate' },
  { name: '20 % (3 měs.)', brent: '115–204', ttf: '65–140', cpi: '+5 až +12', gdp: '−2,0 až −4,5', severity: 'significant' },
  { name: '20 % (6 měs.)', brent: '105–170', ttf: '60–120', cpi: '+4 až +10', gdp: '−2,5 až −5,5', severity: 'significant' },
  { name: '20 % + panika (3 měs.)', brent: '205–285', ttf: '100–200+', cpi: '+10 až +18', gdp: '−3,5 až −7,0', severity: 'severe' },
  { name: 'Katar izolovaně', brent: '~75–80', ttf: '85–140', cpi: '+3 až +7', gdp: '−1,0 až −2,0', severity: 'moderate' },
];

const HISTORICAL_SHOCKS = [
  { name: 'Ropné embargo',     year: 1973, deficit: '~7 %',   priceChange: '+300 %',  precaut: 'Vysoký',           gdp: '−3,2 % US' },
  { name: 'Íránská revoluce',  year: 1979, deficit: '~4 %',   priceChange: '+163 %',  precaut: '~80 % nárůstu',    gdp: '−3,0 % US' },
  { name: 'Válka v Zálivu',    year: 1990, deficit: '~6 %',   priceChange: '+180 %',  precaut: 'Téměř výhradně',   gdp: '−1,0 % US' },
  { name: 'Válka v Iráku',     year: 2003, deficit: '~0 %',   priceChange: 'Postupný', precaut: 'Nulový',           gdp: '0' },
  { name: 'Ruský šok (plyn)',  year: 2022, deficit: '~15 % EU', priceChange: 'TTF +800 %', precaut: 'Vysoký',       gdp: '−0,5 % EU' },
  { name: 'Hormuz 2026',       year: 2026, deficit: '8–10 %', priceChange: '+80 % (dosud)', precaut: 'Probíhá',     gdp: '?', highlight: true },
];

const KEY_FINDINGS = [
  {
    num: 1,
    title: 'Modely podhodnocují cenové peaky o 30–80 %',
    text: 'Precautionary demand (poptávka ze strachu) je historicky dominantním amplifikátorem. Fundamentální rovnováha při 20% šoku: ~158 $/bbl. S panikou: 205–285 $/bbl.',
  },
  {
    num: 2,
    title: 'GDP ztráty 2–7 p.b. pro ČR — a jsou asymetrické',
    text: 'Hamilton (2003): růst cen ropy škodí HDP 3–4× více než pokles pomáhá. Ekonomická škoda je z velké části ireverzibilní.',
  },
  {
    num: 3,
    title: 'Storage constraint: produkční šok za 3–7 dní',
    text: 'Zálivové zásobníky se zaplní za 6–7 dní. Irák musel zastavit produkci do 3 dnů. Třetina vrtů se po dlouhé odstávce nikdy neobnoví.',
  },
  {
    num: 4,
    title: 'Strategické rezervy pokryjí krátký šok, ne dlouhodobý',
    text: 'IEA v březnu 2026 schválila uvolnění rekordních 400 mil. bbl strategických rezerv (rozloženo na 6 měsíců). Stačí na 10 % × 1–2 měsíce. Scénář 20 % × 6 měsíců vyžaduje 2,23 mld. bbl — zásobově nepřeklenutelné.',
  },
  {
    num: 5,
    title: 'Pojistný trh je binding constraint, ne vojenská síla',
    text: 'Konvojový režim: 7–13 % průchodu. Ne kvůli vojenské kapacitě, ale kvůli pojistitelům. Ceasefire > eskalace.',
  },
];

const PRESETS = [
  { name: 'Aktuální stav',      shock: 10, duration: 3,  ed: -0.10, es: 0.05, panicOn: true,  panic: 1.3, brent: 68, ttf: 36 },
  { name: 'Írán 1979',          shock: 5,  duration: 6,  ed: -0.07, es: 0.03, panicOn: true,  panic: 1.8, brent: 68, ttf: 36 },
  { name: 'Plná blokáda',       shock: 20, duration: 6,  ed: -0.10, es: 0.05, panicOn: true,  panic: 1.5, brent: 68, ttf: 36 },
  { name: 'Worst case',         shock: 25, duration: 12, ed: -0.07, es: 0.03, panicOn: true,  panic: 1.8, brent: 68, ttf: 36 },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const fmtNum = (n, decimals = 0) =>
  new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);

// ============================================================
// COMPUTATION MODEL
// ============================================================

function computeSimulation(params) {
  const {
    shock, duration, epsilonD, epsilonS,
    panicOn, panicMultiplier, preCrisisBrent, preCrisisTTF
  } = params;

  const supplyShock = shock / 100;
  const timeMultiplier = 1 + (duration - 1) * 0.08;
  const effectiveEpsilonD = Math.abs(epsilonD) * timeMultiplier;
  const effectiveEpsilonS = epsilonS * timeMultiplier;

  const denom = effectiveEpsilonD + effectiveEpsilonS;
  const pctChangeFundamental = denom > 0 ? supplyShock / denom : 0;
  const activePanicMultiplier = panicOn ? panicMultiplier : 1.0;
  const pctChangeWithPanic = pctChangeFundamental * activePanicMultiplier;

  const brentFundamental = preCrisisBrent * (1 + pctChangeFundamental);
  const brentWithPanic = preCrisisBrent * (1 + pctChangeWithPanic);

  const ttfMult = 1.2;
  const ttfFundamental = preCrisisTTF * (1 + pctChangeFundamental * ttfMult);
  const ttfWithPanic = preCrisisTTF * (1 + pctChangeWithPanic * ttfMult);

  const dailyDeficit = supplyShock * REFERENCE_DATA.globalConsumption;
  const totalStockpileNeed = dailyDeficit * duration * 30;
  const stockpileSufficiency = totalStockpileNeed > 0 ? REFERENCE_DATA.iaeRelease / totalStockpileNeed : Infinity;

  const energyPriceIncrease = pctChangeWithPanic * 100;
  const cpiImpactCZ = energyPriceIncrease * 0.04 * REFERENCE_DATA.czech.cpiAmplification;
  const gdpImpactCZ = -(energyPriceIncrease / 10) * 1.4 * 1.5;

  const demandDestruction = denom > 0
    ? Math.abs(supplyShock * REFERENCE_DATA.globalConsumption * effectiveEpsilonD / denom)
    : 0;

  const gasolineCZK = brentWithPanic * 0.42 + 12;

  return {
    brentFundamental, brentWithPanic,
    ttfFundamental, ttfWithPanic,
    pctChangeFundamental, pctChangeWithPanic,
    totalStockpileNeed, stockpileSufficiency,
    cpiImpactCZ, gdpImpactCZ,
    demandDestruction,
    gasolineCZK, dailyDeficit,
  };
}

function generateTrajectory(basePrice, peakPrice, months, pctChangeFund) {
  const points = [];
  for (let m = 0; m <= 12; m++) {
    if (m === 0) {
      points.push({ month: 0, price: basePrice });
    } else if (m <= months) {
      const progress = m / months;
      const decay = Math.exp(-progress * 2);
      const fundPrice = basePrice * (1 + pctChangeFund * (1 - progress * 0.3));
      const premium = (peakPrice - fundPrice) * decay;
      points.push({ month: m, price: fundPrice + premium });
    } else {
      const recovery = (m - months) / (12 - months);
      const residual = 0.15;
      const cur = peakPrice * (1 - recovery * (1 - residual));
      points.push({ month: m, price: Math.max(basePrice * (1 + residual), cur) });
    }
  }
  return points;
}

// ============================================================
// URL HASH
// ============================================================

function encodeParams(p) {
  return `#s=${p.shock}&d=${p.duration}&ed=${Math.round(Math.abs(p.epsilonD)*100)}&es=${Math.round(p.epsilonS*100)}&po=${p.panicOn?1:0}&p=${Math.round(p.panicMultiplier*10)}&b=${p.preCrisisBrent}&t=${p.preCrisisTTF}`;
}

function decodeParams(hash) {
  if (!hash || hash.length < 2) return null;
  try {
    const u = new URLSearchParams(hash.slice(1));
    const g = (k, d) => { const v = u.get(k); return v !== null ? Number(v) : d; };
    return {
      shock: g('s',10), duration: g('d',3),
      epsilonD: -g('ed',10)/100, epsilonS: g('es',5)/100,
      panicOn: g('po',1)===1, panicMultiplier: g('p',15)/10,
      preCrisisBrent: g('b',68), preCrisisTTF: g('t',36),
    };
  } catch { return null; }
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

function SectionHeader({ title, subtitle }) {
  return html`
    <div class="mb-8">
      <h2 class="font-serif text-2xl sm:text-3xl font-bold text-brand-dark">${title}</h2>
      ${subtitle && html`<p class="mt-2 text-brand-gray text-base">${subtitle}</p>`}
      <div class="section-divider mt-4" />
    </div>
  `;
}

function StatCard({ label, value, description, accent }) {
  const bc = accent === 'orange' ? 'border-l-brand-orange'
    : accent === 'blue' ? 'border-l-brand-blue'
    : accent === 'red' ? 'border-l-brand-red'
    : 'border-l-brand-gray';
  return html`
    <div class="bg-brand-card rounded-lg p-5 border-l-4 ${bc}">
      <p class="text-sm text-brand-gray font-sans">${label}</p>
      <p class="text-2xl sm:text-3xl font-bold font-mono text-brand-dark mt-1 stat-value">${value}</p>
      ${description && html`<p class="text-xs text-brand-gray mt-2">${description}</p>`}
    </div>
  `;
}

// ============================================================
// SECTION 1: HERO
// ============================================================

function HeroSection() {
  return html`
    <section class="pt-12 pb-10 sm:pt-16 sm:pb-14">
      <div class="mb-2">
        <span class="text-xs font-sans uppercase tracking-widest text-brand-orange font-semibold">Analýza</span>
      </div>
      <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-dark leading-tight">
        Když se zavře brána
      </h1>
      <p class="mt-3 text-lg sm:text-xl text-brand-gray font-serif italic max-w-2xl">
        Anatomie největšího ropného šoku v historii
      </p>
      <p class="mt-4 text-sm text-brand-gray">
        David Navrátil · <a href="https://davidnavratil.substack.com" target="_blank" rel="noopener"
          class="text-brand-orange hover:underline">Peníze, procenta a prosperita</a> · Březen 2026
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
        <${StatCard} label="Ropa přes Hormuz" value="20 mb/d" description="~20 % světové spotřeby ropy" accent="orange" />
        <${StatCard} label="Katarský LNG" value="82 MT" description="19 % globálního obchodu se zkapalněným plynem" accent="orange" />
        <${StatCard} label="Ropa Brent" value="~${Math.round(REFERENCE_DATA.currentCrisis.currentBrent)} $/bbl" description="Předkrizová cena: ~${Math.round(REFERENCE_DATA.currentCrisis.preCrisisBrent)} $/bbl" accent="red" />
        <${StatCard} label="Plyn TTF" value="~${Math.round(REFERENCE_DATA.currentCrisis.currentTTF)} €/MWh" description="Evropský benchmark ceny plynu. Před krizí: ~${Math.round(REFERENCE_DATA.currentCrisis.preCrisisTTF)} €/MWh" accent="red" />
      </div>
    </section>
  `;
}

// ============================================================
// SECTION 2: KEY FINDINGS
// ============================================================

function KeyFindings() {
  return html`
    <section class="py-10 sm:py-14">
      <${SectionHeader} title="Klíčové závěry" subtitle="Pět věcí, které považuji za nejdůležitější" />
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${KEY_FINDINGS.map(f => html`
          <div key=${f.num} class="bg-brand-card rounded-lg p-6 border border-brand-line">
            <span class="inline-flex w-8 h-8 rounded-full bg-brand-orange text-white text-sm font-bold items-center justify-center mb-3">
              ${f.num}
            </span>
            <h3 class="font-serif font-bold text-brand-dark text-base leading-snug mb-2">${f.title}</h3>
            <p class="text-sm text-brand-gray leading-relaxed">${f.text}</p>
          </div>
        `)}
      </div>
    </section>
  `;
}

// ============================================================
// SECTION 3: VISUALIZATIONS
// ============================================================

function SensitivityTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return html`
    <div class="bg-white border border-brand-line rounded-lg p-3 shadow-sm text-sm">
      <p class="font-semibold text-brand-dark mb-1">${label}</p>
      ${payload.map((p, i) => html`
        <p key=${i} style=${{ color: p.color }}>
          ${p.name}: <span class="font-mono font-bold">${fmtNum(p.value)} $/bbl</span>
        </p>
      `)}
      ${payload[0]?.payload?.shock10 === 113 && html`
        <p class="text-xs text-brand-gray mt-2 border-t border-brand-line pt-2">
          Centrální odhad 10 % šoku (113) ≈ aktuální Brent (112) — model konzistentní s trhem
        </p>
      `}
    </div>
  `;
}

function BrentSensitivityChart() {
  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">Citlivostní matice Brent</h3>
      <p class="text-sm text-brand-gray mb-4">Dopad na cenu ropy při různých kombinacích elasticit. Předkrizový Brent: 68 $/bbl.</p>
      <${ResponsiveContainer} width="100%" height=${360}>
        <${BarChart} data=${SENSITIVITY_DATA} barCategoryGap="25%" barGap=${4}>
          <${CartesianGrid} strokeDasharray="3 3" vertical=${false} />
          <${XAxis} dataKey="label" tick=${{ fontSize: 11 }} interval=${0} />
          <${YAxis} domain=${[60, 220]} tick=${{ fontSize: 12 }} label=${{ value: '$/bbl', position: 'insideTopLeft', offset: -5, style: { fontSize: 11, fill: '#94A3B8' } }} />
          <${Tooltip} content=${html`<${SensitivityTooltip} />`} />
          <${Legend} wrapperStyle=${{ fontSize: 13 }} />
          <${ReferenceLine} y=${112} stroke="#1A1D23" strokeDasharray="6 3" label=${{ value: 'Aktuální Brent 112', position: 'right', style: { fontSize: 11, fill: '#1A1D23' } }} />
          <${ReferenceLine} y=${68} stroke="#94A3B8" strokeDasharray="3 3" label=${{ value: 'Předkrizový 68', position: 'right', style: { fontSize: 11, fill: '#94A3B8' } }} />
          <${Bar} dataKey="shock10" name="Šok 10 %" fill="#B45309" radius=${[3, 3, 0, 0]}>
            <${LabelList} dataKey="shock10" position="top" style=${{ fontSize: 11, fill: '#B45309', fontWeight: 600 }} />
          <//>
          <${Bar} dataKey="shock20" name="Šok 20 %" fill="#DC2626" radius=${[3, 3, 0, 0]}>
            <${LabelList} dataKey="shock20" position="top" style=${{ fontSize: 11, fill: '#DC2626', fontWeight: 600 }} />
          <//>
        <//>
      <//>
    </div>
  `;
}

function StockpileTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const ok = d.need <= 400;
  return html`
    <div class="bg-white border border-brand-line rounded-lg p-3 shadow-sm text-sm">
      <p class="font-semibold text-brand-dark">${d.label}</p>
      <p class="font-mono">${fmtNum(d.need)} mil. bbl</p>
      <p class="text-xs mt-1 ${ok ? 'text-green-600' : 'text-red-600'}">
        ${ok ? 'Uvolněné rezervy IEA (400 mil.) stačí' : `Rezervy IEA pokrývají ${fmtNum(400/d.need*100, 0)} %`}
      </p>
    </div>
  `;
}

function StockpileBreakevenChart() {
  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">Zásobový break-even</h3>
      <p class="text-sm text-brand-gray mb-4">Kolik milionů barelů je potřeba k překlenutí krize vs. uvolnění strategických rezerv IEA (400 mil. bbl, schváleno v březnu 2026 — rozloženo na 6 měsíců čerpání).</p>
      <${ResponsiveContainer} width="100%" height=${280}>
        <${BarChart} data=${STOCKPILE_DATA} layout="vertical" barSize=${28}>
          <${CartesianGrid} strokeDasharray="3 3" horizontal=${false} />
          <${XAxis} type="number" domain=${[0, 2400]} tick=${{ fontSize: 12 }} tickFormatter=${v => fmtNum(v)} />
          <${YAxis} type="category" dataKey="label" width=${130} tick=${{ fontSize: 12 }} />
          <${Tooltip} content=${html`<${StockpileTooltip} />`} />
          <${ReferenceLine} x=${400} stroke="#1A1D23" strokeDasharray="6 3" label=${{ value: 'Uvolněné rezervy IEA: 400 mil.', position: 'top', style: { fontSize: 11, fill: '#1A1D23' } }} />
          <${Bar} dataKey="need" radius=${[0, 3, 3, 0]}>
            ${STOCKPILE_DATA.map((d, i) => html`<${Cell} key=${i} fill=${d.color} />`)}
            <${LabelList} dataKey="need" position="right" formatter=${v => `${fmtNum(v)} mil.`} style=${{ fontSize: 11, fill: '#64748B' }} />
          <//>
        <//>
      <//>
    </div>
  `;
}

function DemandDestructionViz() {
  const curB = REFERENCE_DATA.currentCrisis.currentBrent;
  const curT = REFERENCE_DATA.currentCrisis.currentTTF;
  const bz = curB < 110 ? 0 : curB < 130 ? 1 : curB < 155 ? 2 : 3;
  const tz = curT < 50 ? 0 : curT < 100 ? 1 : curT < 150 ? 2 : 3;

  const renderZone = (zones, activeIdx, current, unit) => html`
    <div class="space-y-0">
      ${zones.map((z, i) => html`
        <div key=${i} class="destruction-zone ${i === activeIdx ? 'ring-2 ring-brand-dark ring-inset' : ''}"
          style=${{ borderLeftColor: z.color, background: z.color + '10' }}>
          <div class="flex items-center justify-between">
            <span class="font-mono text-sm font-semibold text-brand-dark">${z.range}</span>
            <span class="text-xs font-semibold" style=${{ color: z.color }}>${z.label}</span>
          </div>
          <p class="text-xs text-brand-gray mt-0.5">${z.desc}</p>
          ${i === activeIdx && html`
            <div class="mt-1 text-xs font-semibold text-brand-dark">▶ Aktuální: ${current} ${unit}</div>
          `}
        </div>
      `)}
    </div>
  `;

  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">Hierarchie destrukce poptávky</h3>
      <p class="text-sm text-brand-gray mb-4">Jaké cenové úrovně spouštějí destrukci poptávky. Ukazatel na aktuální ceně.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-serif font-bold text-sm text-brand-dark mb-3">Ropa — Brent ($/bbl)</h4>
          ${renderZone(DESTRUCTION_OIL, bz, curB, '$/bbl')}
        </div>
        <div>
          <h4 class="font-serif font-bold text-sm text-brand-dark mb-3">Plyn — TTF (€/MWh)</h4>
          ${renderZone(DESTRUCTION_GAS, tz, curT, '€/MWh')}
        </div>
      </div>
    </div>
  `;
}

function CzechScenariosTable() {
  const badge = (s) => {
    const cls = s === 'severe' ? 'bg-red-100 text-red-700' : s === 'significant' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700';
    return cls;
  };
  return html`
    <div class="mb-8">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">Scénáře pro Českou republiku</h3>
      <p class="text-sm text-brand-gray mb-4">Partial equilibrium model: cena ropy = předkrizový Brent × (1 + šok / (εd + εs)), kde εd = −0,10 a εs = 0,05 (centrální odhady). TTF amplifikace 1,2×. CPI dopad: IMF pravidlo +10 % energie ≈ +0,4 p.b. inflace (EU), pro ČR 2× amplifikace (vyšší váha energií ve spotřebním koši). HDP dopad: Hamiltonův koeficient −1,4 % na 10 % nárůst ceny ropy, pro ČR 1,5× (vyšší energetická náročnost). Rozpětí odráží nejistotu v elasticitách.</p>
      <div class="overflow-x-auto">
        <table class="w-full scenario-table text-sm">
          <thead><tr><th>Scénář</th><th>Brent ($/bbl)</th><th>TTF (€/MWh)</th><th>CPI dopad (p.b.)</th><th>HDP dopad (p.b.)</th></tr></thead>
          <tbody>
            ${CZECH_SCENARIOS.map((s, i) => html`
              <tr key=${i} class=${s.severity === 'severe' ? 'highlight' : ''}>
                <td class="font-semibold text-brand-dark">${s.name}</td>
                <td class="font-mono">${s.brent}</td>
                <td class="font-mono">${s.ttf}</td>
                <td><span class="inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge(s.severity)}">${s.cpi}</span></td>
                <td><span class="inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge(s.severity)}">${s.gdp}</span></td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function Visualizations() {
  return html`
    <section class="py-10 sm:py-14">
      <${SectionHeader} title="Vizualizace" subtitle="Data a modely za klíčovými závěry" />
      <${BrentSensitivityChart} />
      <${StockpileBreakevenChart} />
      <${DemandDestructionViz} />
      <${CzechScenariosTable} />
    </section>
  `;
}

// ============================================================
// SECTION 4: SIMULATOR
// ============================================================

function SliderInput({ label, helper, value, min, max, step, unit, onChange, id }) {
  return html`
    <div class="mb-5">
      <div class="flex items-center justify-between mb-1">
        <label for=${id} class="text-sm font-semibold text-brand-dark">${label}</label>
        <span class="font-mono text-sm font-bold text-brand-orange">
          ${typeof value === 'number' && !isNaN(value) ? fmtNum(value, step < 1 ? 2 : 0) : value}${unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input type="range" id=${id} min=${min} max=${max} step=${step} value=${value}
        onInput=${e => onChange(Number(e.target.value))} aria-label=${label} class="w-full" />
      ${helper && html`<p class="text-xs text-brand-gray mt-1">${helper}</p>`}
    </div>
  `;
}

function NumberInput({ label, value, onChange, unit, id }) {
  return html`
    <div class="mb-5">
      <label for=${id} class="text-sm font-semibold text-brand-dark block mb-1">${label}</label>
      <div class="flex items-center gap-2">
        <input type="number" id=${id} value=${value} onInput=${e => onChange(Number(e.target.value))}
          class="w-24 px-3 py-2 border border-brand-line rounded-md text-sm font-mono text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
          aria-label=${label} />
        ${unit && html`<span class="text-sm text-brand-gray">${unit}</span>`}
      </div>
    </div>
  `;
}

function ToggleWithSlider({ label, helper, enabled, onToggle, value, onValueChange, min, max, step, id }) {
  return html`
    <div class="mb-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="toggle-switch ${enabled ? 'active' : ''}" onClick=${onToggle}
          role="switch" aria-checked=${enabled} aria-label=${label} tabIndex=${0}
          onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }}} />
        <label class="text-sm font-semibold text-brand-dark">${label}</label>
        ${enabled && html`<span class="font-mono text-sm font-bold text-brand-orange ml-auto">${fmtNum(value, 1)}×</span>`}
      </div>
      ${enabled && html`
        <input type="range" id=${id} min=${min} max=${max} step=${step} value=${value}
          onInput=${e => onValueChange(Number(e.target.value))} aria-label="${label} multiplikátor" class="w-full" />
      `}
      ${helper && html`<p class="text-xs text-brand-gray mt-1">${helper}</p>`}
    </div>
  `;
}

function TrajectoryChart({ results, params }) {
  const fundTraj = useMemo(() =>
    generateTrajectory(params.preCrisisBrent, results.brentFundamental, params.duration, results.pctChangeFundamental),
    [params.preCrisisBrent, results.brentFundamental, params.duration, results.pctChangeFundamental]
  );
  const panicTraj = useMemo(() =>
    generateTrajectory(params.preCrisisBrent, results.brentWithPanic, params.duration, results.pctChangeFundamental),
    [params.preCrisisBrent, results.brentWithPanic, params.duration, results.pctChangeFundamental]
  );
  const data = useMemo(() =>
    fundTraj.map((p, i) => ({
      month: p.month,
      baseline: params.preCrisisBrent,
      fundamental: Math.round(p.price),
      panic: Math.round(panicTraj[i].price),
    })),
    [fundTraj, panicTraj, params.preCrisisBrent]
  );
  const maxP = Math.max(results.brentWithPanic, results.brentFundamental, 150);

  return html`
    <div class="mt-6">
      <h4 class="font-serif font-bold text-sm text-brand-dark mb-3">Cenová trajektorie Brent ($/bbl)</h4>
      <${ResponsiveContainer} width="100%" height=${300}>
        <${LineChart} data=${data}>
          <${CartesianGrid} strokeDasharray="3 3" vertical=${false} />
          <${XAxis} dataKey="month" tick=${{ fontSize: 12 }} label=${{ value: 'Měsíc', position: 'insideBottomRight', offset: -5, style: { fontSize: 11, fill: '#94A3B8' } }} />
          <${YAxis} domain=${[0, Math.ceil(maxP / 50) * 50 + 50]} tick=${{ fontSize: 12 }} />
          <${Tooltip} formatter=${(v, name) => [`${fmtNum(v)} $/bbl`, name === 'baseline' ? 'Předkrizový' : name === 'fundamental' ? 'Fundamentální' : 'S panikou']}
            labelFormatter=${l => `Měsíc ${l}`} />
          <${Legend} formatter=${v => v === 'baseline' ? 'Předkrizový' : v === 'fundamental' ? 'Fundamentální' : 'S panikou'} wrapperStyle=${{ fontSize: 12 }} />
          <${ReferenceLine} y=${112} stroke="#94A3B8" strokeDasharray="3 3" label=${{ value: 'Aktuální 112', position: 'right', style: { fontSize: 10, fill: '#94A3B8' } }} />
          <${Line} type="monotone" dataKey="baseline" stroke="#94A3B8" strokeDasharray="6 3" dot=${false} strokeWidth=${1} isAnimationActive=${false} />
          <${Line} type="monotone" dataKey="fundamental" stroke="#1A1D23" dot=${false} strokeWidth=${2} isAnimationActive=${false} />
          <${Line} type="monotone" dataKey="panic" stroke="#DC2626" dot=${false} strokeWidth=${2} isAnimationActive=${false} />
        <//>
      <//>
    </div>
  `;
}

function WarningPanel({ results, params }) {
  const warnings = [];
  if (results.brentWithPanic > 200) {
    warnings.push({ type: 'danger', text: `Brent překračuje 200 $/bbl (${fmtNum(results.brentWithPanic, 0)} $) — úroveň, při které Bernstein Research předpovídá plošnou destrukci poptávky a recesi.` });
  }
  if (results.stockpileSufficiency < 0.5 && results.totalStockpileNeed > 0) {
    warnings.push({ type: 'danger', text: `IEA strategické rezervy (400 mil. bbl) pokrývají méně než polovinu potřeby (${fmtNum(results.totalStockpileNeed, 0)} mil. bbl). Destrukce poptávky je nevyhnutelná.` });
  }
  if (results.gdpImpactCZ < -3) {
    warnings.push({ type: 'danger', text: `Dopad na český HDP přesahuje 3 p.b. (${fmtNum(results.gdpImpactCZ, 1)} p.b.) — srovnatelné s krizí 2022. ČNB bude pravděpodobně nucena agresivně zpřísnit.` });
  }
  if (results.cpiImpactCZ > 10) {
    warnings.push({ type: 'caution', text: `CPI dopad na ČR přesahuje 10 p.b. (${fmtNum(results.cpiImpactCZ, 1)} p.b.) — repríza stagflačního šoku 2022.` });
  }
  if (!params.panicOn) {
    warnings.push({ type: 'info', text: 'Precautionary demand je vypnutý — výsledky jsou dolní mezí krátkodobého cenového peaku.' });
  }
  if (warnings.length === 0) return null;
  return html`
    <div class="mt-6 space-y-3">
      ${warnings.map((w, i) => html`<div key=${i} class="warning-box ${w.type}">${w.text}</div>`)}
    </div>
  `;
}

function HistoricalTable({ results, params }) {
  const yours = {
    name: 'Váš scénář', year: 2026,
    deficit: `${params.shock} %`,
    priceChange: `+${fmtNum(results.pctChangeWithPanic * 100, 0)} %`,
    precaut: params.panicOn ? `${fmtNum(params.panicMultiplier, 1)}×` : 'Vypnuto',
    gdp: `${fmtNum(results.gdpImpactCZ, 1)} % ČR`,
    highlight: true, isYours: true,
  };
  const rows = [...HISTORICAL_SHOCKS, yours];
  return html`
    <div class="mt-8">
      <h4 class="font-serif font-bold text-sm text-brand-dark mb-3">Srovnání s historickými šoky</h4>
      <div class="overflow-x-auto">
        <table class="w-full scenario-table text-sm">
          <thead><tr><th>Epizoda</th><th>Rok</th><th>Fyzický deficit</th><th>Cenový nárůst</th><th>Precaut. demand</th><th>GDP dopad</th></tr></thead>
          <tbody>
            ${rows.map((s, i) => html`
              <tr key=${i} class=${s.highlight ? 'highlight' : ''}>
                <td class="font-semibold ${s.isYours ? 'text-brand-orange' : 'text-brand-dark'}">${s.name}</td>
                <td class="font-mono">${s.year}</td>
                <td class="font-mono">${s.deficit}</td>
                <td class="font-mono">${s.priceChange}</td>
                <td>${s.precaut}</td>
                <td class="font-mono">${s.gdp}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function Simulator() {
  const defaultParams = {
    shock: 10, duration: 3, epsilonD: -0.10, epsilonS: 0.05,
    panicOn: true, panicMultiplier: 1.5, preCrisisBrent: 68, preCrisisTTF: 36,
  };
  const [params, setParams] = useState(() => decodeParams(window.location.hash) || defaultParams);
  const [activePreset, setActivePreset] = useState(null);
  const [copied, setCopied] = useState(false);

  const update = useCallback((key, value) => {
    setParams(p => ({ ...p, [key]: value }));
    setActivePreset(null);
  }, []);

  const applyPreset = useCallback((preset, idx) => {
    setParams({
      shock: preset.shock, duration: preset.duration,
      epsilonD: preset.ed, epsilonS: preset.es,
      panicOn: preset.panicOn, panicMultiplier: preset.panic,
      preCrisisBrent: preset.brent, preCrisisTTF: preset.ttf,
    });
    setActivePreset(idx);
  }, []);

  const results = useMemo(() => computeSimulation(params), [params]);

  const shareURL = useCallback(() => {
    const hash = encodeParams(params);
    window.history.replaceState(null, '', hash);
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [params]);

  const sev = results.brentWithPanic > 200 || results.gdpImpactCZ < -5
    ? { label: 'Kritický', color: '#DC2626', bg: 'bg-red-50' }
    : results.brentWithPanic > 150 || results.gdpImpactCZ < -3
    ? { label: 'Závažný', color: '#F97316', bg: 'bg-orange-50' }
    : results.brentWithPanic > 110
    ? { label: 'Mírný', color: '#EAB308', bg: 'bg-yellow-50' }
    : { label: 'Minimální', color: '#22C55E', bg: 'bg-green-50' };

  const valColor = (v, t1, t2) => v > t2 || v < -t2 ? '#DC2626' : v > t1 || v < -t1 ? '#F97316' : '#1A1D23';

  return html`
    <section class="py-10 sm:py-14" id="simulator">
      <${SectionHeader} title="Simulátor" subtitle="Nastavte parametry a sledujte dopady v reálném čase" />

      <div class="flex flex-wrap gap-2 mb-6">
        <span class="text-xs text-brand-gray self-center mr-1">Scénáře:</span>
        ${PRESETS.map((p, i) => html`
          <button key=${i} class="preset-btn ${activePreset === i ? 'active' : ''}" onClick=${() => applyPreset(p, i)}>${p.name}</button>
        `)}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <!-- Parameters -->
        <div class="lg:col-span-2 bg-brand-card rounded-xl p-6 border border-brand-line">
          <h3 class="font-serif font-bold text-brand-dark mb-5">Parametry</h3>
          <${SliderInput} id="shock" label="Výpadek nabídky" unit="%" helper='10 % ≈ aktuální stav; 20 % ≈ plná blokáda'
            value=${params.shock} min=${0} max=${25} step=${1} onChange=${v => update('shock', v)} />
          <${SliderInput} id="duration" label="Délka krize (měsíce)" unit=""
            value=${params.duration} min=${1} max=${12} step=${1} onChange=${v => update('duration', v)} />
          <${SliderInput} id="epsilonD" label="Elasticita poptávky (εd)" unit=""
            helper="Nižší abs. hodnota = tvrdší poptávka = vyšší cenový dopad"
            value=${params.epsilonD} min=${-0.25} max=${-0.03} step=${0.01} onChange=${v => update('epsilonD', v)} />
          <${SliderInput} id="epsilonS" label="Elasticita nabídky (εs)" unit=""
            helper="Non-OPEC ≈ 0; s OPEC spare capacity ≈ 0,05–0,10"
            value=${params.epsilonS} min=${0} max=${0.20} step=${0.01} onChange=${v => update('epsilonS', v)} />
          <${ToggleWithSlider} id="panic" label="Precautionary demand" enabled=${params.panicOn}
            onToggle=${() => update('panicOn', !params.panicOn)}
            value=${params.panicMultiplier} onValueChange=${v => update('panicMultiplier', v)}
            min=${1.0} max=${2.0} step=${0.1}
            helper="1979 Írán ≈ 1,8; 1990 Kuvajt ≈ 1,7; 2003 Irák = 1,0" />
          <div class="grid grid-cols-2 gap-4">
            <${NumberInput} id="brent" label="Předkrizový Brent" value=${params.preCrisisBrent} onChange=${v => update('preCrisisBrent', v)} unit="$/bbl" />
            <${NumberInput} id="ttf" label="Předkrizový TTF" value=${params.preCrisisTTF} onChange=${v => update('preCrisisTTF', v)} unit="€/MWh" />
          </div>
          <div class="mt-4 pt-4 border-t border-brand-line">
            <button class="copy-btn ${copied ? 'copied' : ''}" onClick=${shareURL}>
              ${copied ? 'Zkopírováno!' : 'Sdílet scénář'}
            </button>
          </div>
        </div>

        <!-- Results -->
        <div class="lg:col-span-3">
          <div class="${sev.bg} rounded-lg px-4 py-3 mb-5 flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" style=${{ background: sev.color }} />
            <span class="text-sm font-semibold" style=${{ color: sev.color }}>Závažnost scénáře: ${sev.label}</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">Brent — fundamentální</p>
              <p class="text-xl font-bold font-mono text-brand-dark stat-value">${fmtNum(results.brentFundamental, 0)} $</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">Brent — s panikou</p>
              <p class="text-xl font-bold font-mono stat-value" style=${{ color: valColor(results.brentWithPanic, 150, 200) }}>${fmtNum(results.brentWithPanic, 0)} $</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">TTF — s panikou</p>
              <p class="text-xl font-bold font-mono stat-value" style=${{ color: valColor(results.ttfWithPanic, 100, 150) }}>${fmtNum(results.ttfWithPanic, 0)} €</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">Zásobová potřeba</p>
              <p class="text-xl font-bold font-mono text-brand-dark stat-value">${fmtNum(results.totalStockpileNeed, 0)}</p>
              <p class="text-xs text-brand-gray">mil. bbl · Rezervy IEA pokrývají ${results.stockpileSufficiency < 100 ? fmtNum(results.stockpileSufficiency * 100, 0) : '∞'} %</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">CPI dopad ČR</p>
              <p class="text-xl font-bold font-mono stat-value" style=${{ color: valColor(results.cpiImpactCZ, 5, 10) }}>+${fmtNum(results.cpiImpactCZ, 1)} p.b.</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">HDP dopad ČR</p>
              <p class="text-xl font-bold font-mono stat-value" style=${{ color: valColor(results.gdpImpactCZ, -1.5, -3) }}>${fmtNum(results.gdpImpactCZ, 1)} p.b.</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-2">
            <div class="bg-brand-card rounded-lg p-3 border border-brand-line">
              <p class="text-xs text-brand-gray">Odhad ceny benzínu ČR</p>
              <p class="text-lg font-bold font-mono text-brand-dark">${fmtNum(results.gasolineCZK, 0)} Kč/l</p>
              <p class="text-xs text-brand-gray">Aktuálně ~37 Kč/l</p>
            </div>
            <div class="bg-brand-card rounded-lg p-3 border border-brand-line">
              <p class="text-xs text-brand-gray">Destrukce poptávky</p>
              <p class="text-lg font-bold font-mono text-brand-dark">${fmtNum(results.demandDestruction, 1)} mb/d</p>
              <p class="text-xs text-brand-gray">${fmtNum(results.demandDestruction / REFERENCE_DATA.globalConsumption * 100, 1)} % glob. spotřeby</p>
            </div>
          </div>

          <${TrajectoryChart} results=${results} params=${params} />
          <${WarningPanel} results=${results} params=${params} />
          <${HistoricalTable} results=${results} params=${params} />
        </div>
      </div>
    </section>
  `;
}

// ============================================================
// FOOTER
// ============================================================

function Footer() {
  return html`
    <footer class="py-10 mt-8 border-t border-brand-line">
      <div class="bg-brand-card rounded-lg p-5 border border-brand-line mb-6 text-sm text-brand-gray leading-relaxed">
        <p class="font-semibold text-brand-dark mb-1">Disclaimer</p>
        <p>Simulátor používá zjednodušený partial equilibrium model. Skutečné cenové dopady budou ovlivněny faktory, které model nezahrnuje (finanční panika, geopolitické zpětné vazby, regulační zásahy).</p>
      </div>
      <p class="text-xs text-brand-gray leading-relaxed">
        Analýza: David Navrátil · <a href="https://davidnavratil.substack.com" target="_blank" rel="noopener" class="text-brand-orange hover:underline">Peníze, procenta a prosperita</a>.
        Model vychází z akademické literatury: Kilian (2009, AER), Hamilton (2003, JoE), Caldara, Cavallo ${'&'} Iacoviello (2019, JME), Baumeister ${'&'} Hamilton (2019, AER), Blanchard ${'&'} Galí (2007, NBER).
        Tržní data: IEA, EIA, Bloomberg, S${'&'}P Global. Březen 2026.
      </p>
      ${REFERENCE_DATA.pricesUpdated && html`
        <p class="text-xs text-brand-gray mt-2">
          Ceny aktualizovány: ${new Date(REFERENCE_DATA.pricesUpdated).toLocaleDateString('cs-CZ')} · Zdroj: Yahoo Finance
        </p>
      `}
    </footer>
  `;
}

// ============================================================
// APP
// ============================================================

function App() {
  return html`
    <div class="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
      <${HeroSection} />
      <div class="section-divider" />
      <${KeyFindings} />
      <div class="section-divider" />
      <${Visualizations} />
      <div class="section-divider" />
      <${Simulator} />
      <${Footer} />
    </div>
  `;
}

// Mount
createRoot(document.getElementById('root')).render(html`<${App} />`);

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
import { t, getLang, getLocale } from './translations.js';

const html = htm.bind(createElement);

// ============================================================
// LIVE PRICE LOADING
// ============================================================

let livePrices = null;
try {
  const basePath = getLang() === 'en' ? '../' : '';
  const resp = await fetch(basePath + 'prices.json');
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
    debtToGDP: 43, cpiAmplification: 1.2,
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

const SENSITIVITY_DATA = () => [
  { label: t('sensLabel1'), subtitle: '\u03b5d=\u22120,07 \u03b5s=0,03', shock10: 136, shock20: 204, desc: t('sensDesc1'), isBaseline: false },
  { label: t('sensLabel2'), subtitle: '\u03b5d=\u22120,10 \u03b5s=0,05', shock10: 113, shock20: 158, desc: t('sensDesc2'), isBaseline: true },
  { label: t('sensLabel3'), subtitle: '\u03b5d=\u22120,10 \u03b5s=0,10', shock10: 102, shock20: 136, desc: t('sensDesc3'), isBaseline: false },
  { label: t('sensLabel4'), subtitle: '\u03b5d=\u22120,14 \u03b5s=0,15', shock10: 91,  shock20: 115, desc: t('sensDesc4'), isBaseline: false },
];

const STOCKPILE_DATA = () => [
  { label: t('stockLabel1'), need: 217,  color: '#22C55E' },
  { label: t('stockLabel2'), need: 586,  color: '#EAB308' },
  { label: t('stockLabel3'), need: 1150, color: '#DC2626' },
  { label: t('stockLabel4'), need: 434,  color: '#EAB308' },
  { label: t('stockLabel5'), need: 2230, color: '#DC2626' },
];

const DESTRUCTION_OIL = () => [
  { range: '90\u2013110',  label: t('oilDest1Label'), color: '#22C55E', desc: t('oilDest1Desc') },
  { range: '110\u2013130', label: t('oilDest2Label'), color: '#EAB308', desc: t('oilDest2Desc') },
  { range: '130\u2013155', label: t('oilDest3Label'), color: '#F97316', desc: t('oilDest3Desc') },
  { range: '155+',          label: t('oilDest4Label'), color: '#DC2626', desc: t('oilDest4Desc') },
];

const DESTRUCTION_GAS = () => [
  { range: '35\u201350',   label: t('gasDest1Label'), color: '#22C55E', desc: t('gasDest1Desc') },
  { range: '50\u2013100',  label: t('gasDest2Label'), color: '#EAB308', desc: t('gasDest2Desc') },
  { range: '100\u2013150', label: t('gasDest3Label'), color: '#F97316', desc: t('gasDest3Desc') },
  { range: '150+',          label: t('gasDest4Label'), color: '#DC2626', desc: t('gasDest4Desc') },
];

const CZECH_SCENARIOS = () => [
  { name: t('czechScen1Name'), brent: '96\u2013136', ttf: '54\u201379', cpi: '+1 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' +2', gdp: '\u22120,7 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' \u22121,5', severity: 'moderate' },
  { name: t('czechScen2Name'), brent: '125\u2013204', ttf: '72\u2013122', cpi: '+1 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' +3', gdp: '\u22121,2 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' \u22122,8', severity: 'significant' },
  { name: t('czechScen3Name'), brent: 'Peak 125\u2013204 \u2192 98\u2013139', ttf: 'Peak 72\u2013122 \u2192 55\u201381', cpi: '+2 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' +5', gdp: '\u22121,9 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' \u22124,4', severity: 'significant', note: t('czechScen3Note') },
  { name: t('czechScen4Name'), brent: '142\u2013313', ttf: '83\u2013192', cpi: '+2 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' +5', gdp: '\u22121,5 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' \u22124,6', severity: 'severe' },
  { name: t('czechScen5Name'), brent: 'Peak 142\u2013313 \u2192 105\u2013180', ttf: 'Peak 83\u2013192 \u2192 59\u2013107', cpi: '+3 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' +8', gdp: '\u22122,3 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' \u22126,9', severity: 'severe', note: t('czechScen5Note') },
  { name: t('czechScen6Name'), brent: '~75\u201380', ttf: '85\u2013140', cpi: '+2 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' +4', gdp: '\u22120,8 ' + (getLang() === 'en' ? 'to' : 'a\u017e') + ' \u22121,5', severity: 'moderate' },
];

const HISTORICAL_SHOCKS = () => [
  { name: t('histOilEmbargo'),     year: 1973, deficit: '~7 %',   priceChange: '+300 %',  precaut: t('histPrecautHigh'),    gdp: '\u22123,2 % US' },
  { name: t('histIranRevolution'),  year: 1979, deficit: '~4 %',   priceChange: '+163 %',  precaut: t('histPrecaut80'),      gdp: '\u22123,0 % US' },
  { name: t('histGulfWar'),         year: 1990, deficit: '~6 %',   priceChange: '+180 %',  precaut: t('histPrecautAlmost'),  gdp: '\u22121,0 % US' },
  { name: t('histIraqWar'),         year: 2003, deficit: '~0 %',   priceChange: t('histGradual'), precaut: t('histPrecautZero'), gdp: '0' },
  { name: t('histRussianShock'),    year: 2022, deficit: '~15 % EU', priceChange: 'TTF +800 %', precaut: t('histPrecautHigh'), gdp: '\u22120,5 % EU' },
  { name: t('histHormuz2026'),      year: 2026, deficit: '8\u201310 %', priceChange: '+80 % (' + (getLang() === 'en' ? 'so far' : 'dosud') + ')', precaut: t('histPrecautOngoing'), gdp: '?', highlight: true },
];

const KEY_FINDINGS = () => [
  { num: 1, title: t('kf1Title'), text: t('kf1Text') },
  { num: 2, title: t('kf2Title'), text: t('kf2Text') },
  { num: 3, title: t('kf3Title'), text: t('kf3Text') },
  { num: 4, title: t('kf4Title'), text: t('kf4Text') },
  { num: 5, title: t('kf5Title'), text: t('kf5Text') },
];

const PRESETS = () => [
  { name: t('presetCurrent'),      shock: 10, duration: 3,  ed: -0.10, es: 0.05, panicOn: true,  panic: 1.3, brent: 68, ttf: 36 },
  { name: t('presetIran1979'),     shock: 5,  duration: 6,  ed: -0.07, es: 0.03, panicOn: true,  panic: 1.8, brent: 68, ttf: 36 },
  { name: t('presetFullBlockade'), shock: 20, duration: 6,  ed: -0.10, es: 0.05, panicOn: true,  panic: 1.5, brent: 68, ttf: 36 },
  { name: t('presetWorstCase'),    shock: 25, duration: 12, ed: -0.07, es: 0.03, panicOn: true,  panic: 1.8, brent: 68, ttf: 36 },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const fmtNum = (n, decimals = 0) =>
  new Intl.NumberFormat(getLocale(), { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);

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

  // Peak values (short-term elasticities, no timeMultiplier adjustment)
  const denomPeak = Math.abs(epsilonD) + epsilonS;

  // Demand destruction: peak uses short-term elasticity, avg computed after trajectory
  const pctPeakFund = denomPeak > 0 ? supplyShock / denomPeak : 0;
  const pctPeakPanic = pctPeakFund * activePanicMultiplier;
  const brentPeakFund = preCrisisBrent * (1 + pctPeakFund);
  const brentPeakPanic = preCrisisBrent * (1 + pctPeakPanic);
  const ttfPeakFund = preCrisisTTF * (1 + pctPeakFund * ttfMult);
  const ttfPeakPanic = preCrisisTTF * (1 + pctPeakPanic * ttfMult);

  // 12-month average from trajectory
  const fundTraj = generateTrajectory(preCrisisBrent, brentPeakFund, duration, pctPeakFund);
  const panicTraj = generateTrajectory(preCrisisBrent, brentPeakPanic, duration, pctPeakFund);
  const avgBrentFund = fundTraj.reduce((s, p) => s + p.price, 0) / fundTraj.length;
  const avgBrentPanic = panicTraj.reduce((s, p) => s + p.price, 0) / panicTraj.length;
  const avgTtfPanic = preCrisisTTF * (1 + ((avgBrentPanic / preCrisisBrent - 1)) * ttfMult);

  // Demand destruction: peak (short-term) and avg from 12M price trajectory
  const demandDestructionPeak = denomPeak > 0
    ? Math.abs(supplyShock * REFERENCE_DATA.globalConsumption * Math.abs(epsilonD) / denomPeak)
    : 0;
  const avgPriceIncreasePct = (avgBrentPanic / preCrisisBrent - 1);
  const demandDestructionAvg = REFERENCE_DATA.globalConsumption * Math.abs(epsilonD) * avgPriceIncreasePct;

  // CPI/GDP based on 12M average (more realistic for macro impacts)
  // Hamilton (2003): 10% NOPI → -1.4% annualized quarterly GDP growth
  // For annual GDP level impact: ~1.4/4 = 0.35 per 10% price increase
  // CZ amplification: 1.2× (higher energy intensity, export dependence)
  const hamiltonAnnual = 0.35;
  const energyPriceIncreaseAvg = ((avgBrentPanic / preCrisisBrent) - 1) * 100;
  const cpiImpactCZAvg = energyPriceIncreaseAvg * 0.04 * REFERENCE_DATA.czech.cpiAmplification;
  const gdpImpactCZAvg = -(energyPriceIncreaseAvg / 10) * hamiltonAnnual * 1.2;

  // CPI/GDP based on peak
  const energyPriceIncreasePeak = pctPeakPanic * 100;
  const cpiImpactCZPeak = energyPriceIncreasePeak * 0.04 * REFERENCE_DATA.czech.cpiAmplification;
  const gdpImpactCZPeak = -(energyPriceIncreasePeak / 10) * hamiltonAnnual * 1.2;

  return {
    brentFundamental: avgBrentFund, brentWithPanic: avgBrentPanic,
    brentPeakFund, brentPeakPanic,
    ttfFundamental: preCrisisTTF * (1 + ((avgBrentFund / preCrisisBrent - 1)) * ttfMult),
    ttfWithPanic: avgTtfPanic, ttfPeakFund, ttfPeakPanic,
    pctChangeFundamental: pctPeakFund, pctChangeWithPanic: pctPeakPanic,
    totalStockpileNeed, stockpileSufficiency,
    cpiImpactCZ: cpiImpactCZAvg, cpiImpactCZPeak,
    gdpImpactCZ: gdpImpactCZAvg, gdpImpactCZPeak,
    demandDestructionPeak, demandDestructionAvg,
    dailyDeficit,
  };
}

function generateTrajectory(basePrice, peakPrice, months, pctChangeFund) {
  const points = [];
  let endCrisisPrice = peakPrice;
  for (let m = 0; m <= 12; m++) {
    if (m === 0) {
      points.push({ month: 0, price: basePrice });
    } else if (m <= months) {
      const progress = m / months;
      const decay = Math.exp(-progress * 2);
      const fundPrice = basePrice * (1 + pctChangeFund * (1 - progress * 0.3));
      const premium = (peakPrice - fundPrice) * decay;
      const price = fundPrice + premium;
      points.push({ month: m, price });
      if (m === months) endCrisisPrice = price;
    } else {
      const recovery = (m - months) / (12 - months);
      const residual = 0.15;
      const floor = basePrice * (1 + residual);
      const cur = endCrisisPrice + (floor - endCrisisPrice) * recovery;
      points.push({ month: m, price: Math.max(floor, cur) });
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
        <span class="text-xs font-sans uppercase tracking-widest text-brand-orange font-semibold">${t('heroTag')}</span>
      </div>
      <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-dark leading-tight">
        ${t('heroTitle')}
      </h1>
      <p class="mt-3 text-lg sm:text-xl text-brand-gray font-serif italic max-w-2xl">
        ${t('heroSubtitle')}
      </p>
      <p class="mt-4 text-sm text-brand-gray">
        ${t('heroAuthorLine')} · <a href="https://davidnavratil.substack.com" target="_blank" rel="noopener"
          class="text-brand-orange hover:underline">${t('heroSubstackName')}</a> · ${t('heroMonth')}
      </p>
      <a href="https://davidnavratil.substack.com/p/anatomie-nejvetsiho-ropneho-soku" target="_blank" rel="noopener"
        class="mt-6 block max-w-xl rounded-lg border border-brand-line hover:border-brand-orange transition-colors overflow-hidden bg-brand-card group">
        <div class="flex">
          <div class="flex-shrink-0 w-28 sm:w-36">
            <img src="https://substackcdn.com/image/fetch/w_300,h_300,c_fill,f_auto,q_auto:good/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F101d15bd-150b-4993-a4b7-dbd8721d2003_1024x1024.heic"
              alt="" class="w-full h-full object-cover" loading="lazy" />
          </div>
          <div class="p-3 sm:p-4 flex flex-col justify-center min-w-0">
            <p class="text-xs text-brand-gray mb-1">${t('heroSubstackLinkText')}</p>
            <p class="text-sm font-serif font-bold text-brand-dark leading-snug group-hover:text-brand-orange transition-colors line-clamp-2">${t('heroSubstackTitle')}</p>
            <p class="text-xs text-brand-gray mt-1.5 leading-relaxed line-clamp-2 hidden sm:block">${t('heroSubstackDesc')}</p>
          </div>
        </div>
      </a>
      <a href="https://davidnavratil.substack.com/p/za-ropou-je-jeste-neco-horsiho-kaskadove" target="_blank" rel="noopener"
        class="block mt-3 rounded-lg overflow-hidden bg-brand-card border border-brand-line hover:shadow-md transition-shadow group">
        <div class="flex">
          <div class="flex-shrink-0 w-28 sm:w-36">
            <img src="https://substackcdn.com/image/fetch/w_300,h_300,c_fill,f_auto,q_auto:good/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F651aea6b-c813-4b75-a6f6-2db5bc5a8de6_1024x1024.png"
              alt="" class="w-full h-full object-cover" loading="lazy" />
          </div>
          <div class="p-3 sm:p-4 flex flex-col justify-center min-w-0">
            <p class="text-xs text-brand-gray mb-1">${t('heroCascadeLinkText')}</p>
            <p class="text-sm font-serif font-bold text-brand-dark leading-snug group-hover:text-brand-orange transition-colors line-clamp-2">${t('heroCascadeTitle')}</p>
            <p class="text-xs text-brand-gray mt-1.5 leading-relaxed line-clamp-2 hidden sm:block">${t('heroCascadeDesc')}</p>
          </div>
        </div>
      </a>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
        <${StatCard} label="${t('statOilHormuz')}" value="20 mb/d" description="${t('statOilHormuzDesc')}" accent="orange" />
        <${StatCard} label="${t('statQatarLNG')}" value="82 MT" description="${t('statQatarLNGDesc')}" accent="orange" />
        <${StatCard} label="${t('statBrent')}" value="~${Math.round(REFERENCE_DATA.currentCrisis.currentBrent)} $/bbl" description="${t('statBrentDescPrefix')} ~${Math.round(REFERENCE_DATA.currentCrisis.preCrisisBrent)} $/bbl" accent="red" />
        <${StatCard} label="${t('statTTF')}" value="~${Math.round(REFERENCE_DATA.currentCrisis.currentTTF)} \u20ac/MWh" description="${t('statTTFDesc')} ~${Math.round(REFERENCE_DATA.currentCrisis.preCrisisTTF)} \u20ac/MWh" accent="red" />
      </div>
    </section>
  `;
}

// ============================================================
// SECTION 2: KEY FINDINGS
// ============================================================

function KeyFindings() {
  const findings = KEY_FINDINGS();
  return html`
    <section class="py-10 sm:py-14">
      <${SectionHeader} title="${t('keyFindingsTitle')}" subtitle="${t('keyFindingsSubtitle')}" />
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${findings.map(f => html`
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
  const d = payload[0]?.payload;
  return html`
    <div class="bg-white border border-brand-line rounded-lg p-3 shadow-sm text-sm" style=${{ maxWidth: '320px' }}>
      <p class="font-semibold text-brand-dark mb-1">${label}</p>
      ${payload.map((p, i) => html`
        <p key=${i} style=${{ color: p.color }}>
          ${p.name}: <span class="font-mono font-bold">${fmtNum(p.value)} $/bbl</span>
        </p>
      `)}
      ${d?.desc && html`
        <p class="text-xs text-brand-gray mt-2 border-t border-brand-line pt-2 leading-relaxed">
          ${d.desc}
        </p>
      `}
    </div>
  `;
}

function BrentSensitivityChart() {
  const data = SENSITIVITY_DATA();
  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">${t('sensitivityTitle')}</h3>
      <p class="text-sm text-brand-gray mb-4">${t('sensitivityDesc')}</p>
      <${ResponsiveContainer} width="100%" height=${360}>
        <${BarChart} data=${data} barCategoryGap="25%" barGap=${4}>
          <${CartesianGrid} strokeDasharray="3 3" vertical=${false} />
          <${XAxis} dataKey="label" tick=${({ x, y, payload }) => {
            const d = data.find(s => s.label === payload.value);
            return html`<g transform="translate(${x},${y})">
              <text x=${0} y=${0} dy=${14} textAnchor="middle" fill=${d?.isBaseline ? '#B45309' : '#475569'} fontSize=${11} fontWeight=${d?.isBaseline ? 700 : 500}>${payload.value}</text>
              <text x=${0} y=${0} dy=${28} textAnchor="middle" fill="#94A3B8" fontSize=${10}>${d?.subtitle || ''}</text>
            </g>`;
          }} interval=${0} height=${50} />
          <${YAxis} domain=${[60, 220]} tick=${{ fontSize: 12 }} label=${{ value: '$/bbl', position: 'insideTopLeft', offset: -5, style: { fontSize: 11, fill: '#94A3B8' } }} />
          <${Tooltip} content=${html`<${SensitivityTooltip} />`} />
          <${Legend} wrapperStyle=${{ fontSize: 13 }} />
          <${ReferenceLine} y=${REFERENCE_DATA.currentCrisis.brent} stroke="#1A1D23" strokeDasharray="6 3" label=${{ value: t('sensitivityCurrentBrent') + ' ~' + Math.round(REFERENCE_DATA.currentCrisis.brent), position: 'right', style: { fontSize: 11, fill: '#1A1D23' } }} />
          <${ReferenceLine} y=${68} stroke="#94A3B8" strokeDasharray="3 3" label=${{ value: t('sensitivityPreCrisis'), position: 'right', style: { fontSize: 11, fill: '#94A3B8' } }} />
          <${Bar} dataKey="shock10" name="${t('sensitivityShock10')}" radius=${[3, 3, 0, 0]} fill="#B45309">
            <${LabelList} dataKey="shock10" position="top" style=${{ fontSize: 12, fill: '#92400E', fontWeight: 700 }} />
          <//>
          <${Bar} dataKey="shock20" name="${t('sensitivityShock20')}" radius=${[3, 3, 0, 0]} fill="#DC2626">

            <${LabelList} dataKey="shock20" position="top" style=${{ fontSize: 12, fill: '#B91C1C', fontWeight: 700 }} />
          <//>
        <//>
      <//>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        ${data.map((d, i) => html`
          <div key=${i} class="text-xs p-3 rounded-lg border ${d.isBaseline ? 'bg-orange-50 border-brand-orange' : 'bg-brand-card border-brand-line'}">
            <p class="font-semibold text-brand-dark mb-1">${d.label}</p>
            <p class="text-brand-gray leading-relaxed mb-1">${d.desc}</p>
            <p class="font-mono text-brand-gray" style=${{ fontSize: 10 }}>${d.subtitle}</p>
          </div>
        `)}
      </div>
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
      <p class="font-mono">${fmtNum(d.need)} ${t('mil')}. bbl</p>
      <p class="text-xs mt-1 ${ok ? 'text-green-600' : 'text-red-600'}">
        ${ok ? t('stockpileReservesSuffice') : `${t('stockpileReservesCover')} ${fmtNum(400/d.need*100, 0)} %`}
      </p>
    </div>
  `;
}

function StockpileBreakevenChart() {
  const data = STOCKPILE_DATA();
  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">${t('stockpileTitle')}</h3>
      <p class="text-sm text-brand-gray mb-4">${t('stockpileDesc')}</p>
      <${ResponsiveContainer} width="100%" height=${280}>
        <${BarChart} data=${data} layout="vertical" barSize=${28}>
          <${CartesianGrid} strokeDasharray="3 3" horizontal=${false} />
          <${XAxis} type="number" domain=${[0, 2400]} tick=${{ fontSize: 12 }} tickFormatter=${v => fmtNum(v)} />
          <${YAxis} type="category" dataKey="label" width=${130} tick=${{ fontSize: 12 }} />
          <${Tooltip} content=${html`<${StockpileTooltip} />`} />
          <${ReferenceLine} x=${400} stroke="#1A1D23" strokeDasharray="6 3" label=${{ value: t('stockpileIEALabel'), position: 'top', style: { fontSize: 11, fill: '#1A1D23' } }} />
          <${Bar} dataKey="need" radius=${[0, 3, 3, 0]}>
            ${data.map((d, i) => html`<${Cell} key=${i} fill=${d.color} />`)}
            <${LabelList} dataKey="need" position="right" formatter=${v => `${fmtNum(v)} ${t('mil')}.`} style=${{ fontSize: 11, fill: '#64748B' }} />
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
  const oilZones = DESTRUCTION_OIL();
  const gasZones = DESTRUCTION_GAS();

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
            <div class="mt-1 text-xs font-semibold text-brand-dark">${t('destructionCurrent')} ${current} ${unit}</div>
          `}
        </div>
      `)}
    </div>
  `;

  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">${t('destructionTitle')}</h3>
      <p class="text-sm text-brand-gray mb-4">${t('destructionDesc')}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-serif font-bold text-sm text-brand-dark mb-3">${t('destructionOilTitle')}</h4>
          ${renderZone(oilZones, bz, curB, '$/bbl')}
        </div>
        <div>
          <h4 class="font-serif font-bold text-sm text-brand-dark mb-3">${t('destructionGasTitle')}</h4>
          ${renderZone(gasZones, tz, curT, '\u20ac/MWh')}
        </div>
      </div>
    </div>
  `;
}

function CzechScenariosTable() {
  const scenarios = CZECH_SCENARIOS();
  const badge = (s) => {
    const cls = s === 'severe' ? 'bg-red-100 text-red-700' : s === 'significant' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700';
    return cls;
  };
  return html`
    <div class="mb-8">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">${t('czechTitle')}</h3>
      <p class="text-sm text-brand-gray mb-4">${t('czechMethodology')}</p>
      <div class="overflow-x-auto">
        <table class="w-full scenario-table text-sm">
          <thead><tr><th>${t('czechTableScenario')}</th><th>${t('czechTableBrent')}</th><th>${t('czechTableTTF')}</th><th>${t('czechTableCPI')}</th><th>${t('czechTableGDP')}</th></tr></thead>
          <tbody>
            ${scenarios.flatMap((s, i) => {
              const result = [html`
              <tr key=${i} class=${s.severity === 'severe' ? 'highlight' : ''}>
                <td class="font-semibold text-brand-dark">${s.name}</td>
                <td class="font-mono text-xs">${s.brent}</td>
                <td class="font-mono text-xs">${s.ttf}</td>
                <td><span class="inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge(s.severity)}">${s.cpi}</span></td>
                <td><span class="inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge(s.severity)}">${s.gdp}</span></td>
              </tr>`];
              if (s.note) result.push(html`<tr key="${i}n"><td colSpan="5" class="text-xs text-brand-gray italic pt-0 pb-2 px-3 bg-orange-50 border-t-0">${s.note}</td></tr>`);
              return result;
            })}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function Visualizations() {
  return html`
    <section class="py-10 sm:py-14">
      <${SectionHeader} title="${t('vizTitle')}" subtitle="${t('vizSubtitle')}" />
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
        ${enabled && html`<span class="font-mono text-sm font-bold text-brand-orange ml-auto">${fmtNum(value, 1)}\u00d7</span>`}
      </div>
      ${enabled && html`
        <input type="range" id=${id} min=${min} max=${max} step=${step} value=${value}
          onInput=${e => onValueChange(Number(e.target.value))} aria-label="${t('simPrecautMultiplier')}" class="w-full" />
      `}
      ${helper && html`<p class="text-xs text-brand-gray mt-1">${helper}</p>`}
    </div>
  `;
}

function TrajectoryChart({ results, params }) {
  const fundTraj = useMemo(() =>
    generateTrajectory(params.preCrisisBrent, results.brentPeakFund, params.duration, results.pctChangeFundamental),
    [params.preCrisisBrent, results.brentPeakFund, params.duration, results.pctChangeFundamental]
  );
  const panicTraj = useMemo(() =>
    generateTrajectory(params.preCrisisBrent, results.brentPeakPanic, params.duration, results.pctChangeFundamental),
    [params.preCrisisBrent, results.brentPeakPanic, params.duration, results.pctChangeFundamental]
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
  const maxP = Math.max(results.brentPeakPanic, results.brentPeakFund, 150);

  return html`
    <div class="mt-6">
      <h4 class="font-serif font-bold text-sm text-brand-dark mb-3">${t('trajTitle')}</h4>
      <${ResponsiveContainer} width="100%" height=${300}>
        <${LineChart} data=${data}>
          <${CartesianGrid} strokeDasharray="3 3" vertical=${false} />
          <${XAxis} dataKey="month" tick=${{ fontSize: 12 }} label=${{ value: t('trajMonth'), position: 'insideBottomRight', offset: -5, style: { fontSize: 11, fill: '#94A3B8' } }} />
          <${YAxis} domain=${[0, Math.ceil(maxP / 25) * 25 + 25]} tickCount=${Math.ceil(maxP / 25) + 2} tick=${{ fontSize: 12 }} />
          <${Tooltip} formatter=${(v, name) => [`${fmtNum(v)} $/bbl`, name === 'baseline' ? t('trajPreCrisis') : name === 'fundamental' ? t('trajFundamental') : t('trajWithPanic')]}
            labelFormatter=${l => `${t('trajMonth')} ${l}`} />
          <${Legend} formatter=${v => v === 'baseline' ? t('trajPreCrisis') : v === 'fundamental' ? t('trajFundamental') : t('trajWithPanic')} wrapperStyle=${{ fontSize: 12 }} />
          <${ReferenceLine} y=${REFERENCE_DATA.currentCrisis.brent} stroke="#94A3B8" strokeDasharray="3 3" label=${{ value: t('trajCurrent') + ' ~' + Math.round(REFERENCE_DATA.currentCrisis.brent), position: 'right', style: { fontSize: 10, fill: '#94A3B8' } }} />
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
    warnings.push({ type: 'danger', text: t('warnBrent200')(fmtNum(results.brentWithPanic, 0)) });
  }
  if (results.stockpileSufficiency < 0.5 && results.totalStockpileNeed > 0) {
    warnings.push({ type: 'danger', text: t('warnStockpile')(fmtNum(results.totalStockpileNeed, 0)) });
  }
  if (results.gdpImpactCZ < -3) {
    warnings.push({ type: 'danger', text: t('warnGDP')(fmtNum(results.gdpImpactCZ, 1)) });
  }
  if (results.cpiImpactCZ > 10) {
    warnings.push({ type: 'caution', text: t('warnCPI')(fmtNum(results.cpiImpactCZ, 1)) });
  }
  if (!params.panicOn) {
    warnings.push({ type: 'info', text: t('warnNoPanic') });
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
    name: t('histYourScenario'), year: 2026,
    deficit: `${params.shock} %`,
    priceChange: `+${fmtNum(results.pctChangeWithPanic * 100, 0)} %`,
    precaut: params.panicOn ? `${fmtNum(params.panicMultiplier, 1)}\u00d7` : t('histDisabled'),
    gdp: `${fmtNum(results.gdpImpactCZ, 1)} % ${getLang() === 'en' ? 'CZ' : '\u010cR'}`,
    highlight: true, isYours: true,
  };
  const rows = [...HISTORICAL_SHOCKS(), yours];
  return html`
    <div class="mt-8">
      <h4 class="font-serif font-bold text-sm text-brand-dark mb-3">${t('histTitle')}</h4>
      <div class="overflow-x-auto">
        <table class="w-full scenario-table text-sm">
          <thead><tr><th>${t('histEpisode')}</th><th>${t('histYear')}</th><th>${t('histDeficit')}</th><th>${t('histPriceChange')}</th><th>${t('histPrecaut')}</th><th>${t('histGDP')}</th></tr></thead>
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
  const presets = PRESETS();

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

  const sev = results.brentPeakPanic > 200 || results.gdpImpactCZPeak < -5
    ? { label: t('sevCritical'), color: '#DC2626', bg: 'bg-red-50' }
    : results.brentPeakPanic > 150 || results.gdpImpactCZPeak < -3
    ? { label: t('sevSevere'), color: '#F97316', bg: 'bg-orange-50' }
    : results.brentPeakPanic > 110
    ? { label: t('sevModerate'), color: '#EAB308', bg: 'bg-yellow-50' }
    : { label: t('sevMinimal'), color: '#22C55E', bg: 'bg-green-50' };

  const valColor = (v, t1, t2) => v > t2 || v < -t2 ? '#DC2626' : v > t1 || v < -t1 ? '#F97316' : '#1A1D23';

  return html`
    <section class="py-10 sm:py-14" id="simulator">
      <${SectionHeader} title="${t('simTitle')}" subtitle="${t('simSubtitle')}" />

      <div class="flex flex-wrap gap-2 mb-6">
        <span class="text-xs text-brand-gray self-center mr-1">${t('simScenariosLabel')}</span>
        ${presets.map((p, i) => html`
          <button key=${i} class="preset-btn ${activePreset === i ? 'active' : ''}" onClick=${() => applyPreset(p, i)}>${p.name}</button>
        `)}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <!-- Parameters -->
        <div class="lg:col-span-2 bg-brand-card rounded-xl p-6 border border-brand-line">
          <h3 class="font-serif font-bold text-brand-dark mb-5">${t('simParameters')}</h3>
          <${SliderInput} id="shock" label="${t('simSupplyShock')}" unit="%" helper='${t('simSupplyHelper')}'
            value=${params.shock} min=${0} max=${25} step=${1} onChange=${v => update('shock', v)} />
          <${SliderInput} id="duration" label="${t('simDuration')}" unit=""
            value=${params.duration} min=${1} max=${12} step=${1} onChange=${v => update('duration', v)} />
          <${SliderInput} id="epsilonD" label="${t('simElasticityD')}" unit=""
            helper="${t('simElasticityDHelper')}"
            value=${params.epsilonD} min=${-0.25} max=${-0.03} step=${0.01} onChange=${v => update('epsilonD', v)} />
          <${SliderInput} id="epsilonS" label="${t('simElasticityS')}" unit=""
            helper="${t('simElasticitySHelper')}"
            value=${params.epsilonS} min=${0} max=${0.20} step=${0.01} onChange=${v => update('epsilonS', v)} />
          <${ToggleWithSlider} id="panic" label="${t('simPrecautDemand')}" enabled=${params.panicOn}
            onToggle=${() => update('panicOn', !params.panicOn)}
            value=${params.panicMultiplier} onValueChange=${v => update('panicMultiplier', v)}
            min=${1.0} max=${2.0} step=${0.1}
            helper="${t('simPrecautHelper')}" />
          <div class="grid grid-cols-2 gap-4">
            <${NumberInput} id="brent" label="${t('simPreCrisisBrent')}" value=${params.preCrisisBrent} onChange=${v => update('preCrisisBrent', v)} unit="$/bbl" />
            <${NumberInput} id="ttf" label="${t('simPreCrisisTTF')}" value=${params.preCrisisTTF} onChange=${v => update('preCrisisTTF', v)} unit="\u20ac/MWh" />
          </div>
          <div class="mt-4 pt-4 border-t border-brand-line">
            <button class="copy-btn ${copied ? 'copied' : ''}" onClick=${shareURL}>
              ${copied ? t('simCopied') : t('simShare')}
            </button>
          </div>
        </div>

        <!-- Results -->
        <div class="lg:col-span-3">
          <div class="${sev.bg} rounded-lg px-4 py-3 mb-5 flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" style=${{ background: sev.color }} />
            <span class="text-sm font-semibold" style=${{ color: sev.color }}>${t('simSeverityLabel')} ${sev.label}</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">${t('resBrentFund')}</p>
              <p class="text-lg font-bold font-mono text-brand-dark stat-value">${t('peak')} ${fmtNum(results.brentPeakFund, 0)} $</p>
              <p class="text-sm font-mono text-brand-gray">${t('avg12M')} ${fmtNum(results.brentFundamental, 0)} $</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">${t('resBrentPanic')}</p>
              <p class="text-lg font-bold font-mono stat-value" style=${{ color: valColor(results.brentPeakPanic, 150, 200) }}>${t('peak')} ${fmtNum(results.brentPeakPanic, 0)} $</p>
              <p class="text-sm font-mono text-brand-gray">${t('avg12M')} ${fmtNum(results.brentWithPanic, 0)} $</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">${t('resTTFFund')}</p>
              <p class="text-lg font-bold font-mono text-brand-dark stat-value">${t('peak')} ${fmtNum(results.ttfPeakFund, 0)} \u20ac</p>
              <p class="text-sm font-mono text-brand-gray">${t('avg12M')} ${fmtNum(results.ttfFundamental, 0)} \u20ac</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">${t('resTTFPanic')}</p>
              <p class="text-lg font-bold font-mono stat-value" style=${{ color: valColor(results.ttfPeakPanic, 100, 150) }}>${t('peak')} ${fmtNum(results.ttfPeakPanic, 0)} \u20ac</p>
              <p class="text-sm font-mono text-brand-gray">${t('avg12M')} ${fmtNum(results.ttfWithPanic, 0)} \u20ac</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">${t('resStockpileNeed')}</p>
              <p class="text-xl font-bold font-mono text-brand-dark stat-value">${fmtNum(results.totalStockpileNeed, 0)}</p>
              <p class="text-xs text-brand-gray">${t('resStockpileUnit')} · ${t('resStockpileIEA')} ${results.stockpileSufficiency < 100 ? fmtNum(results.stockpileSufficiency * 100, 0) : '\u221e'} %</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">${t('resCPICZ')}</p>
              <p class="text-lg font-bold font-mono stat-value" style=${{ color: valColor(results.cpiImpactCZPeak, 5, 10) }}>${t('peak')} +${fmtNum(results.cpiImpactCZPeak, 1)} p.b.</p>
              <p class="text-sm font-mono text-brand-gray">${t('avg12M')} +${fmtNum(results.cpiImpactCZ, 1)} p.b.</p>
            </div>
            <div class="bg-brand-card rounded-lg p-4 border border-brand-line">
              <p class="text-xs text-brand-gray">${t('resGDPCZ')}</p>
              <p class="text-lg font-bold font-mono stat-value" style=${{ color: valColor(results.gdpImpactCZ, -1.5, -3) }}>${fmtNum(results.gdpImpactCZ, 1)} p.b.</p>
              <p class="text-xs text-brand-gray">${t('resAtBrent')} ${fmtNum(results.brentWithPanic, 0)} $</p>
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
// CASCADE DATA
// ============================================================

const CASCADE_COMMODITIES = () => [
  { name: t('commSulfur'), category: 1, hormuzPct: 47.5, priceChange: 12, substitution: 0, czChannel: t('commSulfurChannel'), keyFact: t('commSulfurFact'), color: "#DC2626" },
  { name: t('commMethanol'), category: 1, hormuzPct: 40, priceChange: 15, substitution: 0.2, czChannel: t('commMethanolChannel'), keyFact: t('commMethanolFact'), color: "#B45309" },
  { name: t('commPropane'), category: 1, hormuzPct: 37.5, priceChange: 25, substitution: 0.3, czChannel: t('commPropaneChannel'), keyFact: t('commPropaneFact'), color: "#B45309" },
  { name: t('commHelium'), category: 1, hormuzPct: 33, priceChange: 85, substitution: 0, czChannel: t('commHeliumChannel'), keyFact: t('commHeliumFact'), color: "#DC2626" },
  { name: t('commUrea'), category: 1, hormuzPct: 30, priceChange: 35, substitution: 0, czChannel: t('commUreaChannel'), keyFact: t('commUreaFact'), color: "#B45309" },
  { name: t('commAmmonia'), category: 2, hormuzPct: 30, priceChange: 15, substitution: 0.5, czChannel: t('commAmmoniaChannel'), keyFact: t('commAmmoniaFact'), color: "#475569" },
  { name: t('commNaphtha'), category: 2, hormuzPct: 24, priceChange: 25, substitution: 0.6, czChannel: t('commNaphthaChannel'), keyFact: t('commNaphthaFact'), color: "#475569" },
  { name: t('commPolyethylene'), category: 2, hormuzPct: 17.5, priceChange: 52.5, substitution: 0.6, czChannel: t('commPolyethyleneChannel'), keyFact: t('commPolyethyleneFact'), color: "#475569" },
];

const SULFUR_CHAIN = () => [
  { title: t('sulfurStep1'), detail: t('sulfurStep1Detail') },
  { title: t('sulfurStep2'), detail: t('sulfurStep2Detail') },
  { title: t('sulfurStep3'), detail: t('sulfurStep3Detail') },
  { title: t('sulfurStep4'), detail: t('sulfurStep4Detail') },
  { title: t('sulfurStep5'), detail: t('sulfurStep5Detail') },
];

const SULFUR_STATS = () => [
  { label: t('sulfurStat1Label'), value: t('sulfurStat1Value') },
  { label: t('sulfurStat2Label'), value: t('sulfurStat2Value') },
  { label: t('sulfurStat3Label'), value: t('sulfurStat3Value') },
  { label: t('sulfurStat4Label'), value: t('sulfurStat4Value') },
];

const STRANDED = () => [
  { country: t('strandedQatar'), capacity: "~17,7 " + t('mil') + ". t", bypass: "0 %", note: t('strandedQatarNote') },
  { country: t('strandedUAE'), capacity: "~10 " + t('mil') + ". t", bypass: "0 %", note: t('strandedUAENote') },
  { country: t('strandedKuwait'), capacity: "6+ " + t('mil') + ". t", bypass: "0 %", note: t('strandedKuwaitNote') },
  { country: t('strandedSaudi'), capacity: "~55 " + t('mil') + ". t", bypass: "~8 %", note: t('strandedSaudiNote') },
];

const HELIUM_SECTORS = () => [
  { title: t('heliumSemiconductors'), detail: t('heliumSemiDetail'), color: "#11457E" },
  { title: t('heliumHealthcare'), detail: t('heliumHealthDetail'), color: "#11457E" },
  { title: t('heliumScience'), detail: t('heliumScienceDetail'), color: "#11457E" },
];

// ============================================================
// CASCADE SECTION COMPONENTS
// ============================================================

function CascadeIntro() {
  return html`
    <div class="mb-12">
      <p class="uppercase tracking-widest text-xs font-bold text-brand-orange mb-3">${t('cascadeTag')}</p>
      <h2 class="font-serif text-3xl sm:text-4xl font-black text-brand-dark mb-2">${t('cascadeTitle')}</h2>
      <p class="font-serif text-lg text-brand-gray italic mb-6">${t('cascadeSubtitle')}</p>
      <p class="text-base text-brand-mid leading-relaxed mb-8 max-w-3xl">
        ${t('cascadeIntro')}
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <${StatCard} label="${t('cascadeBypassStat')}" value="7\u201310 %" sub="${t('cascadeBypassSub')}" accent="red" />
        <${StatCard} label="${t('cascadeNoSubStat')}" value="2" sub="${t('cascadeNoSubSub')}" accent="red" />
        <${StatCard} label="${t('cascadeStrandedStat')}" value=">80 ${getLang() === 'en' ? 'B' : 'mld.'} $" sub="${t('cascadeStrandedSub')}" accent="orange" />
      </div>
    </div>
  `;
}

function CommodityChart() {
  const [metric, setMetric] = useState('hormuzPct');
  const [expanded, setExpanded] = useState(null);
  const commodities = CASCADE_COMMODITIES();
  const metricLabels = { hormuzPct: t('commodityHormuzMetric'), priceChange: t('commodityPriceMetric'), substitution: t('commoditySubMetric') };
  const metricBtns = [
    { key: 'hormuzPct', label: t('commodityExposure') },
    { key: 'priceChange', label: t('commodityPrice') },
    { key: 'substitution', label: t('commoditySubstitution') },
  ];
  const sorted = [...commodities].sort((a, b) => b[metric] - a[metric]);
  const maxVal = metric === 'substitution' ? 1 : Math.max(...sorted.map(d => d[metric])) * 1.15;

  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">${t('commodityTitle')}</h3>
      <p class="text-sm text-brand-gray mb-4">${metricLabels[metric]}. ${t('commodityClickDetail')}</p>
      <div class="flex gap-2 mb-4">
        ${metricBtns.map(b => html`
          <button key=${b.key} onClick=${() => setMetric(b.key)}
            class="px-3 py-1.5 text-sm rounded-md border transition-colors ${metric === b.key ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-brand-mid border-brand-line hover:border-brand-gray'}">${b.label}</button>
        `)}
      </div>
      <div class="space-y-2">
        ${sorted.map((d, i) => {
          const pct = maxVal > 0 ? (d[metric] / maxVal * 100) : 0;
          const valLabel = metric === 'substitution'
            ? (d.substitution === 0 ? t('commoditySubNone') : d.substitution <= 0.3 ? t('commoditySubLow') : d.substitution <= 0.6 ? t('commoditySubPartial') : t('commoditySubHigh'))
            : (metric === 'priceChange' ? '+' + d[metric] + ' %' : d[metric] + ' %');
          const isOpen = expanded === i;
          return html`
            <div key=${i} class="cursor-pointer" onClick=${() => setExpanded(isOpen ? null : i)}>
              <div class="flex items-center gap-3">
                <div class="w-40 sm:w-48 text-sm font-medium text-brand-dark truncate">${d.name}</div>
                <div class="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500" style=${{ width: pct + '%', backgroundColor: d.color, opacity: 0.85 }} />
                </div>
                <div class="w-16 text-right text-sm font-mono font-semibold" style=${{ color: d.color }}>${valLabel}</div>
              </div>
              ${isOpen && html`
                <div class="mt-2 ml-0 sm:ml-48 p-3 bg-brand-card rounded border-l-4 text-sm" style=${{ borderColor: d.color }}>
                  <p class="text-brand-dark font-medium mb-1">${d.keyFact}</p>
                  <p class="text-brand-gray">${t('commodityTransmission')} ${d.czChannel}</p>
                </div>
              `}
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

function SulfurCascade() {
  const [activeStep, setActiveStep] = useState(null);
  const chain = SULFUR_CHAIN();
  const stats = SULFUR_STATS();
  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">${t('sulfurTitle')}</h3>
      <p class="text-sm text-brand-gray mb-6">${t('sulfurDesc')}</p>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-0">
          ${chain.map((step, i) => html`
            <div key=${i}>
              <div class="flex items-start gap-3 cursor-pointer group" onClick=${() => setActiveStep(activeStep === i ? null : i)}>
                <div class="flex flex-col items-center">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style=${{ backgroundColor: i === 0 ? '#1A1D23' : i === chain.length - 1 ? '#DC2626' : '#B45309' }}>${i + 1}</div>
                  ${i < chain.length - 1 && html`<div class="w-0.5 h-8 bg-gray-200" />`}
                </div>
                <div class="pt-1">
                  <p class="font-semibold text-brand-dark group-hover:text-brand-orange transition-colors text-sm">${step.title}</p>
                  ${activeStep === i && html`<p class="text-sm text-brand-gray mt-1">${step.detail}</p>`}
                </div>
              </div>
            </div>
          `)}
        </div>
        <div class="space-y-3">
          <p class="text-xs uppercase tracking-wider text-brand-gray font-bold mb-2">${t('sulfurKeyNumbers')}</p>
          ${stats.map((s, i) => html`
            <div key=${i} class="bg-brand-card rounded-lg p-3 border-l-4 border-red-500">
              <p class="text-xs text-brand-gray">${s.label}</p>
              <p class="font-serif text-lg font-bold text-brand-dark">${s.value}</p>
            </div>
          `)}
        </div>
      </div>
    </div>
  `;
}

function HeliumCountdown() {
  const [days, setDays] = useState(0);
  const totalContainers = 200;
  const evapStart = 35;
  const evapEnd = 90;
  const surviving = days <= evapStart ? totalContainers
    : days >= evapEnd ? 0
    : Math.round(totalContainers * (1 - (days - evapStart) / (evapEnd - evapStart)));
  const lostPct = Math.round((1 - surviving / totalContainers) * 100);
  const sectors = HELIUM_SECTORS();

  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">${t('heliumTitle')}</h3>
      <p class="text-sm text-brand-gray mb-4">${t('heliumDesc')}</p>

      <div class="flex items-center gap-4 mb-4">
        <span class="text-sm font-mono w-20">${t('heliumDay')} ${days}</span>
        <input type="range" min="0" max="90" value=${days} onInput=${e => setDays(+e.target.value)}
          class="flex-1 accent-blue-700" />
        <span class="text-sm font-mono w-28 text-right" style=${{ color: lostPct > 50 ? '#DC2626' : '#475569' }}>${t('heliumLoss')} ${lostPct} %</span>
      </div>

      <div class="grid grid-cols-20 gap-px mb-6 p-3 bg-brand-card rounded-lg border border-brand-line">
        ${Array.from({ length: totalContainers }, (_, i) => {
          const alive = i < surviving;
          return html`<div key=${i} class="aspect-square rounded-sm transition-all duration-300" style=${{
            backgroundColor: alive ? '#11457E' : '#E2E8F0',
            opacity: alive ? 1 : 0.4,
          }} />`;
        })}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${sectors.map((s, i) => html`
          <div key=${i} class="bg-brand-card rounded-lg p-4 border-l-4" style=${{ borderColor: s.color }}>
            <p class="font-semibold text-brand-dark text-sm mb-1">${s.title}</p>
            <p class="text-sm text-brand-gray">${s.detail}</p>
          </div>
        `)}
      </div>
    </div>
  `;
}

function BypassGauges() {
  const gauges = [
    { label: t('bypassOil'), value: "22\u201330 %", pct: 26, color: "#0D9488", detail: t('bypassOilDetail') },
    { label: t('bypassChem'), value: "7\u201310 %", pct: 8.5, color: "#DC2626", detail: t('bypassChemDetail') },
  ];
  const stranded = STRANDED();

  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">${t('bypassTitle')}</h3>
      <p class="text-sm text-brand-gray mb-6">${t('bypassDesc')}</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        ${gauges.map((g, i) => {
          const angle = (g.pct / 100) * 180;
          return html`
            <div key=${i} class="bg-brand-card rounded-lg p-6 border border-brand-line text-center">
              <svg viewBox="0 0 200 110" class="w-48 mx-auto mb-3">
                <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="#E2E8F0" stroke-width="14" stroke-linecap="round" />
                <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke=${g.color} stroke-width="14" stroke-linecap="round"
                  stroke-dasharray=${Math.PI * 90}
                  stroke-dashoffset=${Math.PI * 90 * (1 - g.pct / 100)} />
                <text x="100" y="90" text-anchor="middle" font-family="Georgia" font-size="28" font-weight="bold" fill=${g.color}>${g.value}</text>
              </svg>
              <p class="font-serif text-lg font-bold text-brand-dark">${g.label}</p>
              <p class="text-sm text-brand-gray mt-1">${g.detail}</p>
            </div>
          `;
        })}
      </div>

      <h4 class="font-serif text-base font-bold text-brand-dark mb-3">${t('bypassStrandedTitle')}</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${stranded.map((s, i) => html`
          <div key=${i} class="bg-brand-card rounded-lg p-4 border-l-4 border-red-500">
            <p class="font-semibold text-brand-dark text-sm">${s.country}</p>
            <p class="font-serif text-xl font-bold text-brand-dark">${s.capacity}</p>
            <p class="text-xs font-mono text-red-600 mb-1">${t('bypassLabel')} ${s.bypass}</p>
            <p class="text-xs text-brand-gray">${s.note}</p>
          </div>
        `)}
      </div>
    </div>
  `;
}

function FertilizerShock() {
  return html`
    <div class="mb-12">
      <h3 class="font-serif text-lg font-bold text-brand-dark mb-1">${t('fertTitle')}</h3>
      <p class="text-sm text-brand-gray mb-6">${t('fertDesc')}</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div class="bg-brand-card rounded-lg p-5 border-l-4 border-amber-600">
          <p class="font-serif text-xl font-bold text-brand-dark mb-3">${t('fertNitrogen')}</p>
          <ul class="space-y-2 text-sm text-brand-mid">
            <li class="flex gap-2"><span class="text-amber-600 font-bold">\u2192</span> ${t('fertN1')}</li>
            <li class="flex gap-2"><span class="text-amber-600 font-bold">\u2192</span> ${t('fertN2')}</li>
            <li class="flex gap-2"><span class="text-amber-600 font-bold">\u2192</span> ${t('fertN3')}</li>
            <li class="flex gap-2"><span class="text-amber-600 font-bold">\u2192</span> ${t('fertN4')}</li>
            <li class="flex gap-2"><span class="text-amber-600 font-bold">\u2192</span> ${t('fertN5')}</li>
          </ul>
        </div>
        <div class="bg-brand-card rounded-lg p-5 border-l-4 border-red-600">
          <p class="font-serif text-xl font-bold text-brand-dark mb-3">${t('fertPhosphorus')}</p>
          <ul class="space-y-2 text-sm text-brand-mid">
            <li class="flex gap-2"><span class="text-red-600 font-bold">\u2192</span> ${t('fertP1')}</li>
            <li class="flex gap-2"><span class="text-red-600 font-bold">\u2192</span> ${t('fertP2')}</li>
            <li class="flex gap-2"><span class="text-red-600 font-bold">\u2192</span> ${t('fertP3')}</li>
            <li class="flex gap-2"><span class="text-red-600 font-bold">\u2192</span> ${t('fertP4')}</li>
            <li class="flex gap-2"><span class="text-red-600 font-bold">\u2192</span> ${t('fertP5')}</li>
          </ul>
        </div>
      </div>

      <div class="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
        <p class="text-sm text-brand-dark"><strong>${t('doubleShockLabel')}</strong> ${t('fertDoubleShock')}</p>
      </div>
    </div>
  `;
}

function CascadeSources() {
  return html`
    <div class="text-xs text-brand-gray leading-relaxed mt-8 pt-6 border-t border-brand-line">
      <p>${t('sourcesText')}</p>
      <p class="mt-1">${t('sourcesAuthor')} · <a href="https://davidnavratil.substack.com" target="_blank" rel="noopener" class="text-brand-orange hover:underline">${t('heroSubstackName')}</a> · ${t('heroMonth')}</p>
    </div>
  `;
}

function CascadeSection() {
  return html`
    <section id="kaskady" class="py-8">
      <${CascadeIntro} />
      <${CommodityChart} />
      <${SulfurCascade} />
      <${HeliumCountdown} />
      <${BypassGauges} />
      <${FertilizerShock} />
      <${CascadeSources} />
    </section>
  `;
}

// ============================================================
// FOOTER
// ============================================================

function Footer() {
  return html`
    <footer class="py-10 mt-8 border-t border-brand-line">
      <div class="bg-white rounded-lg p-6 border border-brand-line mb-6 text-center">
        <p class="text-sm font-semibold text-brand-dark mb-1">${t('footerCTA')}</p>
        <p class="text-sm text-brand-gray mb-3">${t('footerCTADesc')}</p>
        <a href="https://davidnavratil.substack.com/subscribe" target="_blank" rel="noopener"
          class="inline-flex items-center gap-2 px-5 py-2 bg-brand-orange text-white font-semibold text-sm rounded-lg hover:bg-amber-700 transition-colors">
          ${t('footerSubscribe')}
          <span>\u2192</span>
        </a>
      </div>
      <div class="bg-brand-card rounded-lg p-5 border border-brand-line mb-6 text-sm text-brand-gray leading-relaxed">
        <p class="font-semibold text-brand-dark mb-1">${t('footerDisclaimer')}</p>
        <p>${t('footerDisclaimerText')}</p>
      </div>
      <p class="text-xs text-brand-gray leading-relaxed">
        ${t('footerAnalysis')} · <a href="https://davidnavratil.substack.com" target="_blank" rel="noopener" class="text-brand-orange hover:underline">${t('heroSubstackName')}</a>.
        ${t('footerModel')}
        ${t('footerData')}
      </p>
      ${REFERENCE_DATA.pricesUpdated && html`
        <p class="text-xs text-brand-gray mt-2">
          ${t('footerPricesUpdated')} ${new Date(REFERENCE_DATA.pricesUpdated).toLocaleDateString(getLocale())} · ${t('footerPricesSource')}
        </p>
      `}
    </footer>
  `;
}

// ============================================================
// APP
// ============================================================

function StickyNav() {
  const langHref = t('langSwitchHref');
  const langLabel = t('langSwitchLabel');
  return html`
    <nav class="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-brand-line py-2">
      <div class="max-w-content mx-auto px-4 sm:px-6 lg:px-8 flex gap-4 text-sm">
        <a href="https://davidnavratil.com/${getLang() === 'en' ? 'en/' : ''}" class="text-brand-orange hover:text-brand-dark transition-colors font-semibold">${t('navBack')}</a>
        <span class="text-brand-line">|</span>
        <a href="#top" class="text-brand-mid hover:text-brand-dark transition-colors">${t('navOilShock')}</a>
        <span class="text-brand-line">|</span>
        <a href="#kaskady" class="text-brand-mid hover:text-brand-dark transition-colors">${t('navCascade')}</a>
        <span class="text-brand-line">|</span>
        <a href="#simulator" class="text-brand-mid hover:text-brand-dark transition-colors">${t('navSimulator')}</a>
        <span class="ml-auto" />
        <a href=${langHref} class="text-brand-mid hover:text-brand-orange transition-colors font-semibold">${langLabel}</a>
      </div>
    </nav>
  `;
}

function App() {
  return html`
    <${StickyNav} />
    <div id="top" class="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
      <${HeroSection} />
      <div class="section-divider" />
      <${KeyFindings} />
      <div class="section-divider" />
      <${Visualizations} />
      <div class="section-divider" />
      <${CascadeSection} />
      <div class="section-divider" />
      <${Simulator} />
      <${Footer} />
    </div>
  `;
}

// Mount
createRoot(document.getElementById('root')).render(html`<${App} />`);

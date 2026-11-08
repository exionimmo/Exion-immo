import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Analytics } from "@vercel/analytics/react";
import {
  Home as HomeIcon, Building2, LayoutGrid, ClipboardList, User, Plus, ArrowLeft,
  MessageCircle, X, Send, Loader2, Calculator, Landmark, Hammer, ListChecks,
  ChevronRight, ChevronDown, Wallet, TrendingUp, AlertTriangle, Search, Bot, Check,
  PieChart, CreditCard, Calendar, Pencil, ArrowRight, Info, PiggyBank, SlidersHorizontal, BarChart3,
  FileText, Wrench, Sparkles, HelpCircle, Share2, Lock, Zap, Droplet, Thermometer, DoorOpen, PaintBucket, ShieldCheck, Target, Eye, Key, MoreHorizontal,
  Bell, Menu, ArrowUpRight, Download, CheckCircle2, Scale, Receipt, Flame
} from "lucide-react";

/* ============================================================
   EXION IMMO — fidèle à la maquette : fond sombre, cartes
   blanches arrondies, accent vert, nav 5 icônes en bas.
============================================================ */

const C = {
  bg: "#100F2C",
  bgSoft: "#1A1B42",
  card: "#FFFFFF",
  text: "#0F1729",
  textMuted: "#6B7688",
  line: "#E7EAF0",
  green: "#22C55E",
  greenDark: "#16A34A",
  red: "#EF4444",
  onDark: "#E7ECF6",
  onDarkMuted: "#8C97B3",
  gradient: "linear-gradient(135deg, #14F1D9 0%, #8B5CF6 55%, #EC4899 100%)",
  gradientSoft: "linear-gradient(135deg, rgba(20,241,217,0.16) 0%, rgba(139,92,246,0.16) 55%, rgba(236,72,153,0.16) 100%)",
};
const font = { fontFamily: "'Inter', sans-serif" };

const LOGO_IMG = "/img/logo.webp";
const TOOLBOX_IMG = "/img/toolbox.webp";
const HERO_BANNER_IMG = "/img/hero.webp";
const MASCOT_ARMS_IMG = "/img/mascot-bras.webp";
const MASCOT_FRAMES = [
"/img/mascotte-01.webp",
"/img/mascotte-02.webp",
"/img/mascotte-03.webp",
"/img/mascotte-04.webp",
"/img/mascotte-05.webp",
"/img/mascotte-06.webp",
"/img/mascotte-07.webp",
"/img/mascotte-08.webp",
"/img/mascotte-09.webp",
"/img/mascotte-10.webp",
"/img/mascotte-11.webp",
"/img/mascotte-12.webp",
"/img/mascotte-13.webp",
"/img/mascotte-14.webp",
"/img/mascotte-15.webp",
"/img/mascotte-16.webp"
];
function useGlobalStyles() {
  useEffect(() => {
    // Police Inter : chargee directement dans index.html (plus rapide)

    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes exionFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes exionPop { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
      @keyframes exionGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.35); } 50% { box-shadow: 0 0 0 8px rgba(139,92,246,0); } }
      @keyframes exionFloat { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-5px) rotate(2deg); } }
      .exion-fade { animation: exionFadeUp 0.32s ease both; }
      .exion-pop { animation: exionPop 0.28s cubic-bezier(.34,1.56,.64,1) both; }
      .exion-glow { animation: exionGlow 2.2s ease-in-out infinite; }
      .exion-float { animation: exionFloat 3s ease-in-out infinite; }
      .exion-press { transition: transform 0.12s ease, box-shadow 0.12s ease; }
      .exion-press:active { transform: scale(0.96); }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
}

const fmt = (n) => (n === null || n === undefined || isNaN(n) ? "—" : Math.round(n).toLocaleString("fr-FR") + " €");

/* ============================================================
   MOTEUR DE CALCUL (inchangé, validé)
============================================================ */

async function fetchPrixMarche(ville, codePostal, estAppartement) {
  let codeInsee = null;
  try {
    const geoRes = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(ville)}&postcode=${encodeURIComponent(codePostal)}&limit=1`);
    const geoData = await geoRes.json();
    const feat = geoData?.features?.[0];
    if (!feat) throw new Error("geocode vide");
    codeInsee = feat.properties?.citycode || null;
    if (!codeInsee) throw new Error("code commune introuvable");

    // Ventes réelles DVF via l'API Données foncières du Cerema (service public).
    // On garde les ventes de la commune, du même type de bien (111 = une maison,
    // 121 = un appartement), d'abord sur les 4 dernières années, puis sur une
    // période plus longue si la commune a trop peu de ventes récentes.
    const codtypbien = estAppartement ? "121" : "111";
    const anneeActuelle = new Date().getFullYear();
    for (const anneeMin of [anneeActuelle - 4, anneeActuelle - 8]) {
      const prixM2 = await ventesCommuneCerema(codeInsee, codtypbien, anneeMin);
      if (prixM2.length >= 5) {
        const mid = Math.floor(prixM2.length / 2);
        const median = prixM2.length % 2 ? prixM2[mid] : (prixM2[mid - 1] + prixM2[mid]) / 2;
        return { valeur: Math.round(median), source: "DVF", n: prixM2.length, rayonKm: null, perimetre: "commune", anneeMin, codeInsee };
      }
    }
    throw new Error("pas assez de ventes dans la commune");
  } catch (e) {
    return { valeur: estAppartement ? 1900 : 1600, source: "nationale", n: 0, rayonKm: null, codeInsee };
  }
}

async function ventesCommuneCerema(codeInsee, codtypbien, anneeMin) {
  // Passe par le relais /api/dvf (fichier api/dvf.js) : le navigateur ne peut pas appeler le Cerema directement.
  const base = `/api/dvf?code_insee=${encodeURIComponent(codeInsee)}&codtypbien=${codtypbien}&anneemut_min=${anneeMin}`;
  const prixM2 = [];
  for (let page = 1; page <= 4; page++) {
    const res = await fetch(`${base}&page=${page}`);
    if (!res.ok) break;
    const data = await res.json();
    const resultats = Array.isArray(data?.results) ? data.results : [];
    resultats.forEach((v) => {
      const prix = Number(v.valeurfonc);
      const surface = Number(v.sbati);
      // garde-fous : vraie vente, bon type, année récente, prix/m² plausible
      if (v.libnatmut !== "Vente" || String(v.codtypbien) !== codtypbien || Number(v.anneemut) < anneeMin) return;
      if (!(prix > 0 && surface > 0)) return;
      const p = prix / surface;
      if (p > 500 && p < 15000) prixM2.push(p);
    });
    if (!data?.next || resultats.length === 0) break;
  }
  return prixM2.sort((a, b) => a - b);
}

function libelleSourceMarche(m) {
  if (m.source !== "DVF") return "estimation nationale";
  if (m.perimetre === "commune") return `${m.n} ventes réelles dans la commune depuis ${m.anneeMin}`;
  return `${m.n} ventes DVF, rayon ${m.rayonKm} km`;
}

// Loyer moyen au m2/mois par departement, source : Ministere du Logement (DHUP),
// carte des loyers 2023 - donnees reelles issues d'annonces, pas une estimation.
const LOYER_DEP_APP = {"01":11.88,"02":9.93,"03":8.21,"04":11.06,"05":11.05,"06":15.12,"07":9.03,"08":8.35,"09":9.64,"10":8.77,"11":9.66,"12":8.46,"13":15.68,"14":11.5,"15":7.88,"16":9.6,"17":10.97,"18":8.5,"19":8.53,"21":9.55,"22":10.13,"23":7.9,"24":9.58,"25":10.6,"26":10.42,"27":11.24,"28":11.18,"29":10.73,"2A":13.8,"2B":12.19,"30":11.11,"31":10.41,"32":9.23,"33":11.74,"34":11.66,"35":10.51,"36":8.06,"37":9.68,"38":12.15,"39":9.86,"40":10.86,"41":9.41,"42":8.89,"43":8.08,"44":11.73,"45":10.7,"46":9.18,"47":9.59,"48":8.66,"49":10.16,"50":9.58,"51":9.47,"52":7.7,"53":8.24,"54":9.98,"55":8.3,"56":11.22,"57":10.59,"58":8.02,"59":11.34,"60":12.23,"61":8.69,"62":10.94,"63":8.99,"64":10.43,"65":9.42,"66":10.52,"67":12.02,"68":11.89,"69":12.56,"70":8.6,"71":9.14,"72":8.8,"73":13.02,"74":17.37,"75":33.09,"76":10.79,"77":14.36,"78":16.78,"79":9.09,"80":10.77,"81":9.72,"82":9.6,"83":13.69,"84":11.87,"85":10.66,"86":8.78,"87":8.94,"88":8.5,"89":9.37,"90":10.77,"91":16.18,"92":25.03,"93":19.85,"94":21.19,"95":16.93,"971":14.99,"972":15.04,"973":14.45,"974":14.32};
const LOYER_DEP_MAI = {"01":11.22,"02":8.13,"03":7.38,"04":9.79,"05":9.7,"06":15.54,"07":8.65,"08":7.2,"09":8.32,"10":7.77,"11":8.2,"12":7.63,"13":14.9,"14":9.97,"15":7.2,"16":7.76,"17":9.22,"18":7.19,"19":7.44,"21":8.79,"22":8.58,"23":6.89,"24":8.27,"25":10.81,"26":9.44,"27":9.72,"28":9.71,"29":9.43,"2A":11.79,"2B":10.51,"30":9.96,"31":9.63,"32":8.28,"33":10.02,"34":10.44,"35":9.21,"36":6.68,"37":8.6,"38":11.34,"39":9.56,"40":9.76,"41":8.09,"42":8.51,"43":7.37,"44":10.3,"45":9.11,"46":8.05,"47":8.37,"48":7.13,"49":9.17,"50":8.0,"51":8.46,"52":6.81,"53":7.14,"54":9.09,"55":7.65,"56":9.97,"57":9.77,"58":6.98,"59":9.15,"60":10.38,"61":7.41,"62":8.53,"63":8.18,"64":9.75,"65":8.92,"66":9.55,"67":10.67,"68":11.84,"69":11.94,"70":8.3,"71":8.37,"72":7.77,"73":12.26,"74":16.87,"75":24.06,"76":9.39,"77":12.37,"78":15.5,"79":7.61,"80":8.36,"81":8.51,"82":8.76,"83":13.58,"84":10.91,"85":9.2,"86":7.39,"87":7.82,"88":7.81,"89":8.31,"90":10.79,"91":14.39,"92":23.34,"93":18.11,"94":19.0,"95":14.91,"971":13.97,"972":14.68,"973":13.71,"974":13.12};

// Loyer moyen au m2/mois par COMMUNE (code INSEE), source : Ministere du Logement (DHUP/ANIL),
// carte des loyers - donnees reelles issues d'annonces. Precision maximale disponible.
// Tables chargees a la demande depuis /public/data (elles pesaient ~850 Ko dans le JS)
let loyersCommunesPromise = null;
function chargerLoyersCommunes() {
  if (!loyersCommunesPromise) {
    loyersCommunesPromise = fetch("/data/loyers-communes.json")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return loyersCommunesPromise;
}
if (typeof window !== "undefined") {
  // Prechargement discret une fois la page affichee
  window.addEventListener("load", () => setTimeout(chargerLoyersCommunes, 2000));
}

async function loyerM2Commune(codeInsee, estAppartement) {
  if (!codeInsee) return null;
  const tables = await chargerLoyersCommunes();
  if (!tables) return null;
  const table = estAppartement ? tables.app : tables.mai;
  return table[codeInsee] || null;
}

function departementDepuisCodePostal(codePostal) {
  const s = String(codePostal || "").trim();
  if (s.startsWith("97") || s.startsWith("98")) return s.slice(0, 3);
  const d = s.slice(0, 2);
  if (d === "20") {
    const num = parseInt(s.slice(0, 3), 10);
    return num <= 201 ? "2A" : "2B";
  }
  return d;
}

function loyerM2Departement(codePostal, estAppartement) {
  const dep = departementDepuisCodePostal(codePostal);
  const table = estAppartement ? LOYER_DEP_APP : LOYER_DEP_MAI;
  return table[dep] || null;
}

async function estimerLoyerIA(ville, codePostal, typeBien, prixM2Marche) {
  try {
    const res = await fetch(ESTIMER_LOYER_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ville, codePostal, typeBien, prixM2Marche }),
    });
    const brut = await res.text();
    let data;
    try { data = JSON.parse(brut); } catch (e) { return null; }
    if (!res.ok) return null;
    const val = Number(data.loyerM2);
    if (val > 1 && val < 60) return val; // garde-fou : plage plausible en EUR/m2/mois
    return null;
  } catch (e) {
    return null;
  }
}

const GRID_TRAVAUX = {
  rafraichir: { min: 35, probable: 45, max: 55, parM2: true, label: "Peinture + sols" },
  electricite: { min: 85, probable: 100, max: 120, parM2: true, label: "Mise aux normes électricité" },
  plomberie: { min: 85, probable: 100, max: 120, parM2: true, label: "Plomberie" },
  sdb: { min: 6000, probable: 8000, max: 10000, parM2: false, label: "Salle de bain complète" },
  cuisine: { min: 8000, probable: 12000, max: 16000, parM2: false, label: "Cuisine complète" },
  isolation: { min: 55, probable: 70, max: 85, parM2: true, label: "Isolation thermique" },
};

function calculerAnalyse(f, prixM2Marche, loyerM2Estime, sourceLoyerParam) {
  const prixAnnonce = Number(f.prix) || 0;
  const prix = Number(f.prixSimulation) > 0 ? Number(f.prixSimulation) : prixAnnonce;
  const surface = Number(f.surface) || 1;
  const estNeuf = f.ancienNeuf === "Neuf";
  const estCopro = f.copropriete === "Oui";
  const estAppartement = f.typeBien === "Appartement";
  const prixM2Annonce = Math.round(prixAnnonce / surface);
  const ecartMarchePct = Math.round(((prixM2Annonce - prixM2Marche.valeur) / prixM2Marche.valeur) * 100);
  const tauxNotaire = estNeuf ? 0.025 : 0.08;
  const fraisNotaire = Math.round(prix * tauxNotaire);

  let travauxMin = 0, travauxMax = 0, travauxProbable = 0;
  let postesTravaux = [];
  if (typeof f.travauxDetailProbable === "number") {
    // budget precis venant de la checklist "Estimation travaux" (coche par l'utilisateur)
    travauxProbable = Math.round(f.travauxDetailProbable);
    travauxMin = Math.round(travauxProbable * 0.9);
    travauxMax = Math.round(travauxProbable * 1.1);
    postesTravaux = f.travauxDetailLabels || [];
  } else {
    // secours : estimation par mots-cles si la checklist n'a pas ete utilisee
    const postes = new Set();
    if (f.etatBien === "A rafraichir") postes.add("rafraichir");
    if (f.etatBien === "A renover entierement") ["rafraichir", "electricite", "plomberie", "sdb", "cuisine", "isolation"].forEach((p) => postes.add(p));
    if (["E", "F", "G"].includes(f.dpe)) { postes.add("electricite"); postes.add("isolation"); }
    postes.forEach((p) => {
      const g = GRID_TRAVAUX[p];
      const mult = g.parM2 ? surface : 1;
      travauxMin += g.min * mult; travauxMax += g.max * mult; travauxProbable += g.probable * mult;
      postesTravaux.push(g.label);
    });
    travauxMin = Math.round(travauxMin); travauxMax = Math.round(travauxMax); travauxProbable = Math.round(travauxProbable);
  }

  const apport = Number(f.apport) || 0;
  const taux = Number(f.taux) || 0;
  const duree = Number(f.duree) || 20;
  const capitalEmprunte = Math.max(prix + fraisNotaire + travauxProbable - apport, 0);
  const tauxMensuel = taux / 100 / 12;
  const nbMois = duree * 12;
  let mensualite = tauxMensuel > 0 ? (capitalEmprunte * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nbMois)) : capitalEmprunte / nbMois;
  mensualite = Math.round(mensualite || 0);
  const coutTotalCredit = Math.round(mensualite * nbMois);
  const coutInterets = Math.round(coutTotalCredit - capitalEmprunte);
  const fraisDossier = Math.min(Math.round(capitalEmprunte * 0.01), 1000);
  const fraisGarantie = Math.round(capitalEmprunte * 0.013);
  const tauxAssurance = Number(f.tauxAssurance) > 0 ? Number(f.tauxAssurance) : 0.3;
  const assuranceAnnuelle = Math.round(capitalEmprunte * (tauxAssurance / 100));
  const assuranceMensuelle = Math.round(assuranceAnnuelle / 12);
  const mensualiteAvecAssurance = mensualite + assuranceMensuelle;
  const coutTotalCreditReel = capitalEmprunte + coutInterets + fraisDossier + fraisGarantie + assuranceAnnuelle * duree;
  const creditAutorise = Number(f.creditAutorise) || 0;
  const margeCredit = creditAutorise > 0 ? creditAutorise - capitalEmprunte : null;
  const tauxEndettement = null;

  const taxeFonciereEstimee = Math.round(prix * 0.008);
  // Priorite 1 : estimation par IA, basee sur la ville/code postal reels.
  // Repli : grille au m2/mois par tranche de marche si l'IA n'a pas repondu.
  function grilleLoyerM2(prixM2) {
    if (prixM2 < 1500) return { min: 7.5, max: 9.5 };
    if (prixM2 < 2500) return { min: 8.5, max: 10.5 };
    if (prixM2 < 3500) return { min: 10, max: 13 };
    if (prixM2 < 5000) return { min: 13, max: 17 };
    return { min: 17, max: 24 };
  }
  let loyerEstimeMin, loyerEstimeMax, sourceLoyerEstimation;
  if (loyerM2Estime && loyerM2Estime > 0) {
    loyerEstimeMin = Math.round(surface * loyerM2Estime * 0.9);
    loyerEstimeMax = Math.round(surface * loyerM2Estime * 1.1);
    sourceLoyerEstimation = sourceLoyerParam || "IA";
  } else {
    const grille = grilleLoyerM2(prixM2Marche.valeur);
    loyerEstimeMin = Math.round(surface * grille.min);
    loyerEstimeMax = Math.round(surface * grille.max);
    sourceLoyerEstimation = "grille";
  }
  const loyerVise = Number(f.loyerVise) || 0;
  const loyerEstimeCentral = Math.round((loyerEstimeMin + loyerEstimeMax) / 2);

  const exterieurType = f.exterieurType || "Aucun";
  const exterieurSurface = Number(f.exterieurSurface) || 0;
  const EXT_BONUS_BASE = { "Aucun": 0, "Balcon": 0.03, "Terrasse": 0.06, "Jardin": 0.08 };
  const exterieurSurfaceFactor = exterieurSurface > 0 ? Math.min(Math.sqrt(exterieurSurface / 10), 1.5) : 0;
  const tensionMarche = Math.min(Math.max(prixM2Marche.valeur / 3500, 0.6), 1.4);
  const bonusExterieurPct = exterieurType !== "Aucun" ? Math.round(EXT_BONUS_BASE[exterieurType] * exterieurSurfaceFactor * tensionMarche * 1000) / 1000 : 0;

  const loyerRetenu = loyerVise > 0 ? loyerVise : Math.round(loyerEstimeCentral * (1 + bonusExterieurPct));

  const tmiNum = f.tmi && f.tmi.includes("%") ? parseFloat(f.tmi) : 0;
  const tmiConnue = !!(f.tmi && f.tmi.includes("%"));
  const loyerAnnuel = loyerRetenu * 12;
  const revenuImposable = Math.round(loyerAnnuel * 0.7);
  const impotAnnuel = tmiConnue ? Math.round(revenuImposable * (tmiNum / 100 + 0.172)) : 0;
  const impotMensuel = Math.round(impotAnnuel / 12);

  const chargesCopro = estCopro ? Math.round(surface * 3) : 0;
  const assurancePNO = 15;
  const provisionEntretien = Math.round(loyerRetenu * 0.07);
  const vacanceLocativeMensuelle = Math.round(loyerRetenu * 0.04);
  const cashFlowMensuel = Math.round(loyerRetenu - mensualiteAvecAssurance - Math.round(taxeFonciereEstimee / 12) - chargesCopro - assurancePNO - provisionEntretien - vacanceLocativeMensuelle - impotMensuel);

  const budgetTotalProbable = prix + fraisNotaire + travauxProbable;
  const budgetTotalMin = prix + fraisNotaire + travauxMin;
  const budgetTotalMax = prix + fraisNotaire + travauxMax;
  const reventeMin = Math.round(prixM2Marche.valeur * surface * 0.97);
  const reventeMax = Math.round(prixM2Marche.valeur * surface * 1.03);

  const scorePrix = Math.max(0, Math.min(100, 50 - ecartMarchePct * 1.5));
  const scoreCashflow = Math.max(0, Math.min(100, 60 + cashFlowMensuel * 0.5));
  const ratioTravaux = prix > 0 ? travauxProbable / prix : 0;
  const scoreTravaux = Math.max(0, Math.min(100, 100 - ratioTravaux * 100));
  const scoreRisque = ["A", "B", "C", "D"].includes(f.dpe) ? 80 : f.dpe === "E" ? 50 : ["F", "G"].includes(f.dpe) ? 20 : 40;
  const scoreGlobal = Math.round(scorePrix * 0.3 + scoreCashflow * 0.3 + scoreTravaux * 0.2 + scoreRisque * 0.2);
  let verdict = "À approfondir";
  if (scoreGlobal >= 70 && cashFlowMensuel >= 0) verdict = "Rentable";
  else if (scoreGlobal >= 70 && cashFlowMensuel < 0) verdict = "Bon prix, cash-flow négatif";
  else if (scoreGlobal >= 45) verdict = "À négocier";
  else verdict = "Risqué";

  const rendementBrut = prix > 0 ? Math.round(((loyerRetenu * 12) / prix) * 1000) / 10 : 0;
  const rentabiliteNette = budgetTotalProbable > 0
    ? Math.round((((loyerRetenu * 12) - taxeFonciereEstimee - chargesCopro * 12 - assurancePNO * 12 - provisionEntretien * 12 - vacanceLocativeMensuelle * 12 - impotAnnuel) / budgetTotalProbable) * 1000) / 10
    : 0;

  return {
    prix, prixAnnonce, surface, ville: f.ville, codePostal: f.codePostal, typeBien: f.typeBien,
    prixM2Annonce, prixM2Marche, ecartMarchePct, fraisNotaire, estNeuf,
    postesTravaux, travauxMin, travauxProbable, travauxMax,
    capitalEmprunte, mensualite, coutInterets, coutTotalCredit,
    fraisDossier, fraisGarantie, assuranceMensuelle, tauxAssurance, mensualiteAvecAssurance, coutTotalCreditReel,
    creditAutorise, margeCredit, taux, duree, apport,
    taxeFonciereEstimee, chargesCopro, assurancePNO, provisionEntretien, vacanceLocativeMensuelle, tmiConnue, tmiNum, impotAnnuel, impotMensuel,
    loyerEstimeMin, loyerEstimeMax, loyerRetenu, sourceLoyerEstimation, rendementBrut, rentabiliteNette,
    exterieurType, exterieurSurface, bonusExterieurPct,
    cashFlowMensuel, budgetTotalProbable, budgetTotalMin, budgetTotalMax,
    reventeMin, reventeMax, scoreGlobal, verdict,
  };
}

// Recherche par dichotomie du prix d'achat maximum (donc du prix/m² maximum) qui
// conserve un cash-flow au moins egal a cashFlowCible (0 = cash-flow neutre), a loyer,
// apport, taux et duree constants. Reutilise calculerAnalyse pour rester toujours
// parfaitement coherent avec le vrai calcul, meme s'il evolue plus tard.
function trouverPrixMaxRentable(f, prixM2Marche, loyerM2Estime, sourceLoyerParam, cashFlowCible = 0) {
  let lo = 0, hi = 5000000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const test = calculerAnalyse({ ...f, prixSimulation: mid }, prixM2Marche, loyerM2Estime, sourceLoyerParam);
    if (test.cashFlowMensuel >= cashFlowCible) lo = mid; else hi = mid;
  }
  return Math.round(lo);
}

/* ============================================================
   ANALYSE « ACHETER POUR Y VIVRE » (résidence principale)
   Toutes les valeurs sont des estimations indicatives.
============================================================ */

// Coût énergie (chauffage + eau chaude) en €/m²/an selon la classe DPE.
// Ordres de grandeur ; une base de 400 €/an est ajoutée pour l'électricité courante.
const ENERGIE_EURO_M2_AN = { A: 6, B: 9, C: 13, D: 18, E: 24, F: 31, G: 39 };
const LOUER_ACHETER_HYP = { revalorisation: 0.01, hausseLoyer: 0.015, rendementEpargne: 0.02 };

function arrondirA(n, pas) { return Math.round(n / pas) * pas; }

function verdictPrixRP(ecartPct) {
  if (ecartPct <= -7) return "Bonne affaire";
  if (ecartPct <= 5) return "Prix correct";
  if (ecartPct <= 12) return "Un peu au-dessus du marché";
  return "Au-dessus du marché";
}

function calculerAchatRP(f, prixM2Marche, loyerM2Estime, sourceLoyer) {
  const prixAnnonce = Number(f.prix) || 0;
  const prix = Number(f.prixSimulation) > 0 ? Number(f.prixSimulation) : prixAnnonce;
  const surface = Number(f.surface) || 1;
  const estNeuf = f.ancienNeuf === "Neuf";
  const estCopro = f.copropriete === "Oui";
  const estAppartement = f.typeBien === "Appartement";

  // --- Prix vs marché ---
  const prixM2Annonce = Math.round(prixAnnonce / surface);
  const valeurMarche = Math.round(prixM2Marche.valeur * surface);
  const ecartMarchePct = Math.round(((prixM2Annonce - prixM2Marche.valeur) / prixM2Marche.valeur) * 100);
  const ecartMarcheEuros = prixAnnonce - valeurMarche;
  const marcheFiable = prixM2Marche.source === "DVF";
  // Sans ventes réelles, on ne peut pas juger le prix : on ne dit pas « bonne affaire ».
  const verdict = marcheFiable ? verdictPrixRP(ecartMarchePct) : "Prix à vérifier";
  const passoire = ["F", "G"].includes(f.dpe);
  const baseNegociation = marcheFiable ? Math.min(prixAnnonce * 0.97, valeurMarche * (passoire ? 0.95 : 1)) : prixAnnonce * 0.97;
  const prixConseille = Math.max(arrondirA(baseNegociation, 1000), 0);
  const margeNegociation = Math.max(prixAnnonce - prixConseille, 0);

  // --- Travaux (même logique que l'analyse investisseur) ---
  let travauxProbable = 0;
  let postesTravaux = [];
  if (typeof f.travauxDetailProbable === "number") {
    travauxProbable = Math.round(f.travauxDetailProbable);
    postesTravaux = f.travauxDetailLabels || [];
  } else {
    const postes = new Set();
    if (f.etatBien === "A rafraichir") postes.add("rafraichir");
    if (f.etatBien === "A renover entierement") ["rafraichir", "electricite", "plomberie", "sdb", "cuisine", "isolation"].forEach((p) => postes.add(p));
    if (["E", "F", "G"].includes(f.dpe)) { postes.add("electricite"); postes.add("isolation"); }
    postes.forEach((p) => { const g = GRID_TRAVAUX[p]; travauxProbable += g.probable * (g.parM2 ? surface : 1); postesTravaux.push(g.label); });
    travauxProbable = Math.round(travauxProbable);
  }

  // --- Frais d'achat et crédit ---
  const fraisNotaire = Math.round(prix * (estNeuf ? 0.025 : 0.08));
  const apport = Number(f.apport) || 0;
  const taux = Number(f.taux) || 0;
  const duree = Number(f.duree) || 20;
  const capitalEmprunte = Math.max(prix + fraisNotaire + travauxProbable - apport, 0);
  const tauxMensuel = taux / 100 / 12;
  const nbMois = duree * 12;
  let mensualite = tauxMensuel > 0 ? (capitalEmprunte * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nbMois)) : capitalEmprunte / nbMois;
  mensualite = Math.round(mensualite || 0);
  const coutInterets = Math.max(Math.round(mensualite * nbMois - capitalEmprunte), 0);
  const fraisDossier = capitalEmprunte > 0 ? Math.min(Math.round(capitalEmprunte * 0.01), 1000) : 0;
  const fraisGarantie = Math.round(capitalEmprunte * 0.013);
  const tauxAssurance = Number(f.tauxAssurance) > 0 ? Number(f.tauxAssurance) : 0.3;
  const assuranceMensuelle = Math.round((capitalEmprunte * (tauxAssurance / 100)) / 12);
  const mensualiteAvecAssurance = mensualite + assuranceMensuelle;
  const coutTotalCreditReel = capitalEmprunte + coutInterets + fraisDossier + fraisGarantie + assuranceMensuelle * nbMois;
  const budgetTotal = prix + fraisNotaire + travauxProbable + fraisDossier + fraisGarantie;
  const creditAutorise = Number(f.creditAutorise) || 0;

  // --- Loyer de marché de ce bien (sert à la taxe foncière estimée et à « louer ou acheter ») ---
  const loyerMarche = loyerM2Estime > 0 ? Math.round(surface * loyerM2Estime) : 0;

  // --- Coût de possession mensuel ---
  const taxeFonciereConnue = Number(f.taxeFonciereConnue) > 0;
  // Repère courant : la taxe foncière représente environ un mois de loyer du bien.
  const taxeFonciere = taxeFonciereConnue ? Math.round(Number(f.taxeFonciereConnue))
    : loyerMarche > 0 ? arrondirA(loyerMarche, 10) : arrondirA(prix * 0.008, 10);
  const chargesCoproConnues = Number(f.chargesCoproConnues) > 0;
  const chargesCopro = !estCopro ? 0 : chargesCoproConnues ? Math.round(Number(f.chargesCoproConnues)) : Math.round(surface * 2.5);
  const assuranceHabitation = estAppartement ? 15 : 25;
  const dpeCalcul = ENERGIE_EURO_M2_AN[f.dpe] ? f.dpe : "D";
  const energieMensuelle = Math.round((surface * ENERGIE_EURO_M2_AN[dpeCalcul] + 400) / 12);
  const eauMensuelle = estAppartement ? 30 : 40;
  const entretienMensuel = Math.round((prix * (estAppartement ? 0.004 : 0.008)) / 12);
  const coutPossessionMensuel = Math.round(taxeFonciere / 12) + chargesCopro + assuranceHabitation + energieMensuelle + eauMensuelle + entretienMensuel;
  const coutTotalMensuel = mensualiteAvecAssurance + coutPossessionMensuel;

  // --- Budget du foyer ---
  const revenusFoyer = Number(f.revenusFoyer) || 0;
  const creditsEnCours = Number(f.creditsEnCours) || 0;
  const tauxEndettement = revenusFoyer > 0 ? Math.round(((mensualiteAvecAssurance + creditsEnCours) / revenusFoyer) * 1000) / 10 : null;
  const resteAVivre = revenusFoyer > 0 ? revenusFoyer - creditsEnCours - coutTotalMensuel : null;
  const mensualiteMax35 = revenusFoyer > 0 ? Math.max(Math.round(revenusFoyer * 0.35 - creditsEnCours), 0) : null;

  // --- Score acheteur ---
  const clamp = (n) => Math.max(0, Math.min(100, n));
  const scorePrix = marcheFiable ? clamp(70 - ecartMarchePct * 2) : 50;
  const scoreDPE = ["A", "B", "C", "D"].includes(f.dpe) ? 80 : f.dpe === "E" ? 50 : passoire ? 20 : 50;
  const scoreTravaux = clamp(100 - (prix > 0 ? travauxProbable / prix : 0) * 100);
  const scoreBudget = tauxEndettement === null ? null : tauxEndettement <= 30 ? 100 : tauxEndettement <= 35 ? 75 : tauxEndettement <= 40 ? 35 : 10;
  const scoreGlobal = Math.round(scoreBudget === null
    ? scorePrix * 0.6 + scoreDPE * 0.2 + scoreTravaux * 0.2
    : scorePrix * 0.5 + scoreDPE * 0.15 + scoreTravaux * 0.15 + scoreBudget * 0.2);

  return {
    mode: "rp",
    prix, prixAnnonce, surface, ville: f.ville, codePostal: f.codePostal, typeBien: f.typeBien, dpe: f.dpe, estNeuf, estCopro,
    prixM2Annonce, prixM2Marche, valeurMarche, ecartMarchePct, ecartMarcheEuros, marcheFiable, verdict, passoire,
    prixConseille, margeNegociation,
    postesTravaux, travauxProbable,
    fraisNotaire, fraisDossier, fraisGarantie, budgetTotal, apport, capitalEmprunte, creditAutorise,
    taux, duree, tauxAssurance, mensualite, assuranceMensuelle, mensualiteAvecAssurance, coutInterets, coutTotalCreditReel,
    loyerMarche, sourceLoyer,
    taxeFonciere, taxeFonciereConnue, chargesCopro, chargesCoproConnues, assuranceHabitation, energieMensuelle, dpeCalcul,
    eauMensuelle, entretienMensuel, coutPossessionMensuel, coutTotalMensuel,
    revenusFoyer, creditsEnCours, tauxEndettement, resteAVivre, mensualiteMax35,
    scoreGlobal,
  };
}

// Compare, année par année, le coût net d'acheter ce bien et celui de louer le même bien.
// Coût net achat = argent sorti (apport, frais bancaires, mensualités, taxe foncière, entretien) − patrimoine (valeur − capital restant dû).
// Coût net location = loyers payés − intérêts gagnés en plaçant l'argent qui aurait servi à l'achat.
// Énergie, eau, assurance habitation et charges sont payées dans les deux cas : elles s'annulent.
function simulerLouerAcheter(r, loyerInitial) {
  if (!(loyerInitial > 0)) return { pointMort: null, lignes: [] };
  const { revalorisation, hausseLoyer, rendementEpargne } = LOUER_ACHETER_HYP;
  const tm = r.taux / 100 / 12;
  const miseDeDepart = r.apport + r.fraisDossier + r.fraisGarantie;
  let crd = r.capitalEmprunte;
  let sortiAchat = miseDeDepart;
  let loyersCumules = 0;
  let pointMort = null;
  const lignes = [];
  for (let an = 1; an <= 30; an++) {
    for (let m = 0; m < 12; m++) {
      if (crd > 0.5) {
        const interets = crd * tm;
        crd -= Math.min(r.mensualite - interets, crd);
        sortiAchat += r.mensualiteAvecAssurance;
      }
    }
    sortiAchat += r.taxeFonciere + r.entretienMensuel * 12;
    loyersCumules += loyerInitial * 12 * Math.pow(1 + hausseLoyer, an - 1);
    const patrimoine = r.prix * Math.pow(1 + revalorisation, an) - Math.max(crd, 0);
    const coutNetAchat = Math.round(sortiAchat - patrimoine);
    const coutNetLocation = Math.round(loyersCumules - miseDeDepart * (Math.pow(1 + rendementEpargne, an) - 1));
    if (pointMort === null && coutNetAchat <= coutNetLocation) pointMort = an;
    lignes.push({ an, coutNetAchat, coutNetLocation });
  }
  return { pointMort, lignes };
}

/* ============================================================
   UI KIT
============================================================ */

function Badge({ verdict }) {
  const map = {
    "Rentable": { bg: "#DCFCE7", fg: C.greenDark },
    "Bon prix, cash-flow négatif": { bg: "#FEF3C7", fg: "#B45309" },
    "À négocier": { bg: "#FEF3C7", fg: "#B45309" },
    "Risqué": { bg: "#FEE2E2", fg: "#B91C1C" },
    "À approfondir": { bg: "#E5E7EB", fg: "#374151" },
  };
  const s = map[verdict] || map["À approfondir"];
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.fg, ...font }}>{verdict}</span>;
}
function Card({ children, className = "", onClick }) {
  return (
 <div onClick={onClick} className={`p-4 exion-fade exion-press ${className}`} style={{ borderRadius: '26px',  background: C.card, boxShadow: "0 10px 28px rgba(0,0,0,0.22)" }}>
      {children}
    </div>
  );
}
function CircularProgress({ percent, color = "#8B5CF6", size = 40, stroke = 4 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#2A3A5C" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
 <span className="absolute font-bold" style={{ fontSize: '9.5px', color: C.onDark, ...font }}>{clamped}%</span>
    </div>
  );
}
function Field({ label, children, error }) {
  return (
    <label className="block mb-3.5">
 <span className="block font-medium mb-1.5" style={{ fontSize: '13px',  color: C.onDarkMuted, ...font }}>{label}</span>
      {children}
 {error && <span className="block mt-1" style={{ fontSize: '12px',  color: "#F87171", ...font }}>{error}</span>}
    </label>
  );
}
const inputBase = { background: C.bgSoft, border: `1px solid #2A3A5C`, color: C.onDark, ...font };
function TextInput(props) { return <input {...props} style={{ ...inputBase, fontSize: '15px' }} className="w-full px-4 py-3 rounded-2xl outline-none focus:border-[#8B5CF6] transition-colors" />; }
function Select({ children, ...props }) { return <select {...props} style={{ ...inputBase, fontSize: '15px' }} className="w-full px-4 py-3 rounded-2xl outline-none focus:border-[#8B5CF6] transition-colors">{children}</select>; }
function PrimaryButton({ children, ...props }) {
  return (
 <button {...props} className="w-full flex items-center justify-center gap-2 py-4 rounded-full font-bold text-white disabled:opacity-50 exion-press"
      style={{ fontSize: '15px', background: C.gradient, boxShadow: "0 8px 22px rgba(139,92,246,0.35)", ...font }}>
      {children}
    </button>
  );
}
function Ligne({ label, valeur, accent, sub }) {
  return (
    <div className="flex items-start justify-between py-2.5" style={{ borderBottom: `1px solid #22304C` }}>
      <div>
 <div className="" style={{ fontSize: '14px',  color: C.onDark, ...font }}>{label}</div>
 {sub && <div className="mt-0.5" style={{ fontSize: '12px',  color: C.onDarkMuted, ...font }}>{sub}</div>}
      </div>
 <span className="font-semibold shrink-0 ml-3" style={{ fontSize: '15px',  color: accent || "#fff", ...font }}>{valeur}</span>
    </div>
  );
}
function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-[26px] p-4 mb-3 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} color={C.green} />
 <span className="font-semibold uppercase tracking-wide" style={{ fontSize: '13px',  color: C.onDarkMuted, ...font }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function ScreenTitle({ children }) {
  return <h2 className="text-xl font-bold mb-4" style={{ color: C.onDark, ...font }}>{children}</h2>;
}
function BackHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-5 pb-1">
      <button onClick={onBack} aria-label="Retour"><ArrowLeft size={20} color={C.onDark} /></button>
 <span className="font-semibold uppercase tracking-wide" style={{ fontSize: '13px',  color: C.onDarkMuted, ...font }}>{title}</span>
    </div>
  );
}

/* ============================================================
   ACCUEIL — fidèle à la maquette
============================================================ */

const OUTILS = [
  { id: "calculateur", icon: Calculator, label: "Calculateur de rentabilité", desc: "Estime ta rentabilité nette et ton cash-flow", descLong: "Estime ta rentabilité nette, ton cash-flow et ton TRI.", color: "#3B82F6" },
  { id: "credit", icon: Landmark, label: "Simulation de crédit", desc: "Calcule ta capacité d'emprunt", descLong: "Calcule ta capacité d'emprunt et simule tes mensualités.", color: "#8B5CF6" },
  { id: "travaux", icon: Hammer, label: "Estimation travaux", desc: "Évalue tes travaux et ton budget", descLong: "Évalue le coût de tes travaux et optimise ton budget.", color: "#10B981" },
  { id: "checklist", icon: ListChecks, label: "Check-list investissement", desc: "Ne loupe aucune étape clé", descLong: "Ne loupe aucune étape clé avant d'investir.", color: "#6366F1" },
  { id: "lexique", icon: HelpCircle, label: "Lexique & FAQ", desc: "TMI, LMNP, SCI... tout expliqué", descLong: "TMI, LMNP, SCI, charges... tous les termes de l'investissement locatif expliqués simplement.", color: "#EC4899" },
];

const VERDICT_DOT = {
  "Rentable": "#22C55E",
  "Bon prix, cash-flow négatif": "#F59E0B",
  "À négocier": "#F59E0B",
  "Risqué": "#EF4444",
  "À approfondir": "#9CA3AF",
  "Bonne affaire": "#22C55E",
  "Prix correct": "#4ADE80",
  "Un peu au-dessus du marché": "#F59E0B",
  "Au-dessus du marché": "#EF4444",
  "Prix à vérifier": "#9CA3AF",
};

function ProjectCard({ p, onOpen, onSupprimer }) {
  const dotColor = VERDICT_DOT[p.verdict] || VERDICT_DOT["À approfondir"];
  const progress = Math.round(p.scoreGlobal || 0);
  const estRP = p.mode === "rp";
  function handleSupprimer(e) {
    e.stopPropagation();
    if (window.confirm("Supprimer cette analyse ? Cette action est définitive.")) {
      onSupprimer(p.id);
    }
  }
  return (
    <div className="w-full text-left exion-fade">
      <div className="p-3.5 rounded-[22px]" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
        <button onClick={() => onOpen(p)} className="w-full text-left exion-press">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: C.gradientSoft }}>
              {estRP ? <Key size={20} color="#14F1D9" /> : <HomeIcon size={20} color="#8B5CF6" />}
            </div>
            <div className="min-w-0 flex-1">
 <div className="font-semibold truncate" style={{ fontSize: '14px', color: C.onDark, ...font }}>{p.typeBien} · {p.ville} ({p.codePostal})</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
 <span style={{ fontSize: '11.5px', color: C.onDarkMuted, ...font }}>{estRP ? `Pour y vivre · ${p.verdict}` : p.verdict}</span>
              </div>
            </div>
            <ChevronRight size={18} color={C.onDarkMuted} className="shrink-0" />
          </div>
          {estRP ? (
          <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid #22304C" }}>
            <div>
 <div style={{ fontSize: '10.5px', color: C.onDarkMuted, ...font }}>Écart au marché</div>
 <div className="font-bold" style={{ fontSize: '14px', color: !p.marcheFiable ? C.onDarkMuted : p.ecartMarchePct <= 5 ? C.green : C.red, ...font }}>{!p.marcheFiable ? "—" : `${p.ecartMarchePct > 0 ? "+" : ""}${p.ecartMarchePct}%`}</div>
            </div>
            <div>
 <div style={{ fontSize: '10.5px', color: C.onDarkMuted, ...font }}>Coût réel / mois</div>
 <div className="font-bold" style={{ fontSize: '14px', color: C.onDark, ...font }}>{fmt(p.coutTotalMensuel)}</div>
            </div>
            <div>
 <div className="text-center mb-1" style={{ fontSize: '10.5px', color: C.onDarkMuted, ...font }}>Score</div>
              <CircularProgress percent={progress} color="#14F1D9" size={38} />
            </div>
          </div>
          ) : (
          <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid #22304C" }}>
            <div>
 <div style={{ fontSize: '10.5px', color: C.onDarkMuted, ...font }}>Rentabilité nette</div>
 <div className="font-bold" style={{ fontSize: '14px', color: C.green, ...font }}>{(p.rentabiliteNette ?? 0).toFixed(1).replace(".", ",")}%</div>
            </div>
            <div>
 <div style={{ fontSize: '10.5px', color: C.onDarkMuted, ...font }}>Cash-flow / mois</div>
 <div className="font-bold" style={{ fontSize: '14px', color: p.cashFlowMensuel >= 0 ? C.green : C.red, ...font }}>{p.cashFlowMensuel >= 0 ? "+" : ""}{fmt(p.cashFlowMensuel)}</div>
            </div>
            <div>
 <div className="text-center mb-1" style={{ fontSize: '10.5px', color: C.onDarkMuted, ...font }}>Progression</div>
              <CircularProgress percent={progress} color="#8B5CF6" size={38} />
            </div>
          </div>
          )}
        </button>
        {onSupprimer && (
          <button onClick={handleSupprimer} className="w-full mt-2.5 pt-2.5 flex items-center justify-center gap-1.5 exion-press" style={{ borderTop: "1px solid #22304C", fontSize: "12px", color: C.red, ...font }}>
            <X size={13} /> Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

function VueProjets({ projets, onNouveau, onOuvrir, onSupprimer }) {
  return (
    <div className="px-5 pt-6 pb-28">
      <div className="flex items-center justify-between mb-5 exion-fade">
        <ScreenTitle>Mes projets</ScreenTitle>
        <button onClick={onNouveau} className="font-semibold flex items-center gap-1" style={{ fontSize: "13px", color: "#8B5CF6", ...font }}>
          <Plus size={14} /> Nouveau
        </button>
      </div>

      {projets.length === 0 ? (
        <div className="rounded-[22px] p-6 exion-fade text-center" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: C.gradientSoft }}>
            <Building2 size={22} color="#8B5CF6" />
          </div>
 <p className="font-semibold mb-1" style={{ fontSize: '14px', color: C.onDark, ...font }}>Aucun projet pour l'instant</p>
 <p className="mb-4" style={{ fontSize: '12.5px', color: C.onDarkMuted, lineHeight: '1.4', ...font }}>Lance ta première analyse pour la retrouver ici.</p>
          <button onClick={onNouveau} className="px-5 py-2.5 rounded-full font-bold exion-press" style={{ fontSize: '13.5px', color: "#fff", background: C.gradient, ...font }}>
            Nouvelle analyse
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {projets.map((p) => <ProjectCard key={p.id} p={p} onOpen={onOuvrir} onSupprimer={onSupprimer} />)}
        </div>
      )}
    </div>
  );
}


function VueAccueil({ projets, onNouveau, onOuvrir, onSupprimer, onOutil, onVoirBiens, onVoirOutils, onProfil, profil }) {
  const initiales = profil?.nom ? profil.nom.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() : null;
  return (
    <div className="px-5 pb-24 pt-4">
      <div className="flex items-center justify-between mb-3 exion-fade">
        <div className="flex items-center gap-2.5">
          <img src={LOGO_IMG} alt="Exion Immo" style={{ height: "22px", width: "auto" }} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onProfil} aria-label="Profil" className="relative w-9 h-9 rounded-full flex items-center justify-center exion-press" style={{ background: C.gradient }}>
            {initiales ? (
 <span className="font-bold" style={{ fontSize: '12px', color: "#fff", ...font }}>{initiales}</span>
            ) : (
              <User size={16} color="#fff" />
            )}
            {!profil?.nom && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#100F2C", border: "1.5px solid #100F2C" }}>
                <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: "#22C55E" }}><Plus size={9} color="#06280F" strokeWidth={3} /></span>
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="relative rounded-[26px] overflow-hidden mb-4 exion-fade" style={{ height: "215px" }}>
        <img src={HERO_BANNER_IMG} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
      </div>

      <button onClick={onVoirBiens} className="w-full flex items-center gap-2.5 px-4 py-3.5 rounded-full mb-4 exion-press" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
        <Search size={16} color={C.onDarkMuted} />
 <span className="flex-1 text-left" style={{ fontSize: '14px', color: C.onDarkMuted, ...font }}>Rechercher un bien</span>
 <span className="font-semibold" style={{ fontSize: '12px', color: "#8B5CF6", ...font }}>LeBonCoin, SeLoger…</span>
        <ChevronRight size={16} color={C.onDarkMuted} />
      </button>

      <button onClick={onNouveau} className="w-full text-left mb-5 exion-press">
        <div className="flex items-center justify-between p-4" style={{ borderRadius: "26px", background: "linear-gradient(135deg, #2D2B7A 0%, #4C3A9C 55%, #7C3AED 100%)", boxShadow: "0 10px 30px rgba(124,58,237,0.35)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.14)" }}>
              <BarChart3 size={20} color="#fff" />
            </div>
            <div className="min-w-0">
 <div className="font-bold" style={{ fontSize: '15px', color: "#fff", ...font }}>Lance ta première analyse</div>
 <div className="truncate" style={{ fontSize: '12.5px', color: "rgba(255,255,255,0.75)", ...font }}>Investir ou acheter pour y vivre</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center exion-glow" style={{ background: C.gradient }}><Plus size={20} color="#fff" /></div>
            <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
          </div>
        </div>
      </button>

      <div className="flex items-center justify-between mb-3">
 <span className="font-semibold uppercase tracking-wide" style={{ fontSize: '13px', color: C.onDarkMuted, ...font }}>Mes outils rapides</span>
 <button onClick={onVoirOutils} className="font-semibold flex items-center gap-0.5" style={{ fontSize: '12.5px', color: "#8B5CF6", ...font }}>
          Voir tous <ChevronRight size={13} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {OUTILS.slice(0, 4).map((o) => (
          <button key={o.id} onClick={() => onOutil(o.id)} className="text-left exion-press">
            <div className="rounded-2xl p-2.5 h-full flex flex-col" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: `${o.color}26` }}>
                <o.icon size={16} color={o.color} />
              </div>
 <div className="font-semibold leading-tight mb-1" style={{ fontSize: '11px', color: C.onDark, ...font }}>{o.label}</div>
 <div className="leading-tight" style={{ fontSize: '9px', color: C.onDarkMuted, ...font }}>{o.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
 <span className="font-semibold uppercase tracking-wide" style={{ fontSize: '13px', color: C.onDarkMuted, ...font }}>Mes projets</span>
 <button onClick={onNouveau} className="font-semibold flex items-center gap-1" style={{ fontSize: '13px', color: "#8B5CF6", ...font }}>
          <Plus size={14} /> Nouveau projet
        </button>
      </div>

      {projets.length === 0 ? (
        <div className="p-4 rounded-[22px]" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
 <p style={{ fontSize: '14px', color: C.onDarkMuted, ...font }}>Aucun projet pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projets.map((p) => <ProjectCard key={p.id} p={p} onOpen={onOuvrir} onSupprimer={onSupprimer} />)}
        </div>
      )}
    </div>
  );
}

const PLATEFORMES = [
  { nom: "LeBonCoin", desc: "Le plus grand volume d'annonces", url: "https://www.leboncoin.fr/recherche?category=9", couleur: "#EC5B24" },
  { nom: "SeLoger", desc: "Annonces d'agences et particuliers", url: "https://www.seloger.com/", couleur: "#E4032E" },
  { nom: "PAP", desc: "Particulier à particulier, sans agence", url: "https://www.pap.fr/", couleur: "#0088CE" },
  { nom: "Bien'ici", desc: "Recherche par carte, données de quartier", url: "https://www.bienici.com/", couleur: "#00B2A9" },
  { nom: "Logic-Immo", desc: "Annonces d'agences immobilières", url: "https://www.logic-immo.com/", couleur: "#8DC63F" },
  { nom: "Orpi", desc: "Réseau d'agences, biens exclusifs", url: "https://www.orpi.com/", couleur: "#E2001A" },
  { nom: "Century21", desc: "Réseau d'agences national", url: "https://www.century21.fr/", couleur: "#B99358" },
  { nom: "Figaro Immo", desc: "Annonces et estimations", url: "https://immobilier.lefigaro.com/", couleur: "#0F3D68" },
];

function VueBiens({ onBack, onNouveau }) {
  return (
    <div>
      <BackHeader title="Rechercher un bien" onBack={onBack} />
      <div className="px-5 pt-3 pb-28">
        <p className="mb-4 exion-fade" style={{ fontSize: "13px", color: C.onDarkMuted, lineHeight: "1.5", ...font }}>
          Les sites d'annonces bloquent la recherche automatisée, donc Exion ne peut pas encore te remonter les biens directement. En attendant, voici les plateformes où chercher — puis colle les infos de l'annonce dans "Nouvelle analyse".
        </p>

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {PLATEFORMES.map((p) => (
            <a key={p.nom} href={p.url} target="_blank" rel="noopener noreferrer" className="exion-fade exion-press">
              <div className="rounded-2xl p-3.5 h-full" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold" style={{ background: `${p.couleur}26`, color: p.couleur, fontSize: "14px", ...font }}>
                    {p.nom[0]}
                  </div>
                  <ArrowUpRight size={15} color={C.onDarkMuted} />
                </div>
                <div className="font-bold" style={{ fontSize: "14px", color: C.onDark, ...font }}>{p.nom}</div>
                <div className="mt-0.5 leading-snug" style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>{p.desc}</div>
              </div>
            </a>
          ))}
        </div>

        <div className="rounded-[22px] p-4 exion-fade" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
          <div className="flex items-start gap-2 mb-2">
            <Search size={16} color="#8B5CF6" className="mt-0.5 shrink-0" />
            <p className="font-semibold" style={{ fontSize: "14px", color: C.onDark, ...font }}>Trouvé une annonce ?</p>
          </div>
          <p className="mb-3.5" style={{ fontSize: "12.5px", color: C.onDarkMuted, lineHeight: "1.5", ...font }}>
            Colle le prix, la surface, la ville et le DPE dans une nouvelle analyse pour obtenir le score, la rentabilité et le cash-flow.
          </p>
          <button onClick={onNouveau} className="w-full text-center py-3 rounded-full font-bold exion-press" style={{ fontSize: "14px", color: "#fff", background: C.gradient, ...font }}>
            Nouvelle analyse manuelle
          </button>
        </div>
      </div>
    </div>
  );
}

const BAIL_TEXTE = `CONTRAT DE LOCATION
Logement non meublé — Résidence principale du locataire
Contrat type conforme à la loi n°89-462 du 6 juillet 1989 et au décret n°2015-587 du 29 mai 2015

⚠️ À LIRE AVANT UTILISATION
Ce document reprend la trame légale obligatoire d'un bail de location vide. Il couvre les mentions exigées par la loi, mais chaque situation a ses particularités (zone d'encadrement des loyers, copropriété, colocation...). Fais-le relire par un professionnel (notaire, agence, juriste) avant signature. Ce n'est pas un conseil juridique personnalisé.

Entre les soussignés :

ARTICLE 1 — DÉSIGNATION DES PARTIES

Le bailleur
Nom et prénom (ou dénomination sociale) : ……………………………………
Domicile (ou siège social) : ……………………………………
Qualité du bailleur : personne physique ☐  SCI ☐  autre personne morale ☐
Email / téléphone : ……………………………………
Ci-après dénommé « le bailleur »

Le(s) locataire(s)
Nom et prénom : ……………………………………
Domicile actuel : ……………………………………
Email / téléphone : ……………………………………
Ci-après dénommé « le locataire »

Il a été convenu ce qui suit :

ARTICLE 2 — OBJET DU CONTRAT
Le présent contrat a pour objet la location d'un logement dont la désignation suit :

2.1 — Consistance du logement
Adresse du logement : ……………………………………
Type d'habitat : immeuble collectif ☐  immeuble individuel ☐
Régime juridique de l'immeuble : copropriété ☐  mono-propriété ☐
Période de construction : avant 1949 ☐  1949-1974 ☐  1975-1989 ☐  1990-2005 ☐  après 2005 ☐
Surface habitable : ……… m²
Nombre de pièces principales : ………
Autres parties (cave, parking, jardin, balcon...) : ……………………………………
Équipements du logement : ……………………………………
Chauffage : individuel ☐  collectif ☐ — énergie : ……………
Production d'eau chaude sanitaire : individuelle ☐  collective ☐

2.2 — Performance énergétique (DPE)
Classe énergie (A à G) : ………
Classe climat / émissions de gaz à effet de serre (A à G) : ………

2.3 — Destination des locaux
Usage : habitation exclusivement ☐  usage mixte professionnel et habitation ☐

ARTICLE 3 — DATE DE PRISE D'EFFET ET DURÉE DU CONTRAT
Le présent contrat prend effet à compter du : …… / …… / ……
Il est conclu pour une durée de :
- 3 ans si le bailleur est une personne physique (ou une SCI familiale)
- 6 ans si le bailleur est une personne morale (société, SCI non familiale...)
Le contrat se renouvelle ensuite tacitement pour la même durée, sauf congé donné dans les formes et délais légaux.

ARTICLE 4 — CONDITIONS FINANCIÈRES

4.1 — Loyer
Montant du loyer mensuel hors charges : ……… €
Date ou périodicité de paiement : ……………………………………
Modalités de paiement : virement ☐  prélèvement ☐  chèque ☐  espèces ☐
(Si le logement est en zone d'encadrement des loyers, indiquer aussi le loyer de référence et le loyer de référence majoré.)

4.2 — Révision du loyer
Le loyer sera révisé chaque année à la date anniversaire du contrat, selon la variation de l'Indice de Référence des Loyers (IRL) publié par l'INSEE.
IRL de référence retenu (trimestre et année) : …………… trimestre ………

4.3 — Charges récupérables
Modalité de règlement des charges : provisions avec régularisation annuelle ☐  forfait de charges ☐
Montant mensuel des charges (provision ou forfait) : ……… €

4.4 — Dépôt de garantie
Montant du dépôt de garantie : ……… €
(Pour une location vide, le dépôt de garantie ne peut pas dépasser un mois de loyer hors charges.)

ARTICLE 5 — TRAVAUX
5.1 — Travaux effectués depuis le dernier contrat de location : néant ☐  liste : ……………………………………
5.2 — Travaux prévus pendant la location, avec incidence sur le loyer : néant ☐  liste : ……………………………………

ARTICLE 6 — GARANTIE
Caution demandée : aucune ☐  personne physique ☐  acte de cautionnement solidaire joint en annexe ☐
Nom et adresse de la caution (le cas échéant) : ……………………………………

ARTICLE 7 — CLAUSE RÉSOLUTOIRE
Le présent contrat sera résilié de plein droit, un mois après un commandement de payer resté infructueux, en cas de non-paiement du loyer, des charges, du dépôt de garantie, ou de non-souscription d'une assurance habitation par le locataire, conformément à l'article 24 de la loi du 6 juillet 1989.

ARTICLE 8 — HONORAIRES DE LOCATION
Intermédiaire : aucun (location directe entre particuliers) ☐  agence / intermédiaire ☐
Si agence, nom, montant et répartition des honoraires : ……………………………………

ARTICLE 9 — ANNEXES OBLIGATOIRES
Sont annexés au présent contrat et en font partie intégrante :
- Le dossier de diagnostic technique (DPE, constat de risque d'exposition au plomb, état de l'installation intérieure d'électricité et de gaz si plus de 15 ans, état des risques naturels et technologiques...)
- Un état des lieux d'entrée, établi contradictoirement
- Un extrait du règlement de copropriété (le cas échéant)
- La notice d'information relative aux droits et obligations des locataires et des bailleurs
- L'attestation d'assurance contre les risques locatifs du locataire
- L'acte de cautionnement, le cas échéant

Fait à ………………………, le …… / …… / ……, en ……… exemplaires originaux.
Chaque partie reconnaît avoir reçu un exemplaire du présent contrat et de ses annexes.

Signature du bailleur                                    Signature du locataire
(précédée de la mention « Lu et approuvé »)               (précédée de la mention « Lu et approuvé »)`;

function VueBailModele({ onBack }) {
  const [copie, setCopie] = useState(false);

  function copierTexte() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(BAIL_TEXTE).then(() => {
        setCopie(true);
        setTimeout(() => setCopie(false), 2500);
      }).catch(() => copierAncienneMethode());
    } else {
      copierAncienneMethode();
    }
  }

  function copierAncienneMethode() {
    const zone = document.createElement("textarea");
    zone.value = BAIL_TEXTE;
    zone.style.position = "fixed";
    zone.style.left = "-9999px";
    document.body.appendChild(zone);
    zone.focus();
    zone.select();
    try {
      document.execCommand("copy");
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch (e) {}
    document.body.removeChild(zone);
  }

  return (
    <div>
      <BackHeader title="Modèle de bail" onBack={onBack} />
      <div className="px-5 pt-3 pb-28">
        <div className="rounded-2xl p-4 mb-4 exion-fade flex items-start gap-2.5" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.35)" }}>
          <FileText size={16} color="#F59E0B" className="shrink-0 mt-0.5" />
 <p style={{ fontSize: "12px", lineHeight: "1.5", color: "#FDE68A", ...font }}>Contrat type conforme à la loi du 6 juillet 1989. Copie ce texte dans une note, un mail ou un traitement de texte pour le remplir et l'imprimer — fais-le relire avant signature.</p>
        </div>

        <button onClick={copierTexte} className="w-full text-center py-3.5 rounded-2xl font-bold mb-4 exion-press flex items-center justify-center gap-2" style={{ fontSize: "14px", color: "#fff", background: copie ? C.green : C.gradient, ...font }}>
          {copie ? <Check size={18} /> : <FileText size={18} />}
          {copie ? "Copié !" : "Copier tout le texte du contrat"}
        </button>

        <div className="rounded-2xl p-4" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
 <p style={{ fontSize: "12.5px", lineHeight: "1.6", color: C.onDarkMuted, whiteSpace: "pre-line", ...font }}>{BAIL_TEXTE}</p>
        </div>
      </div>
    </div>
  );
}

const LEXIQUE = [
  {
    cat: "Devenir propriétaire", couleur: "#F59E0B", q: "Quelles sont toutes les étapes pour acheter un bien en nom propre ?",
    a: "Le parcours classique de la plupart des investisseurs, dans l'ordre :\n\n1. Définir ton budget — va voir un courtier ou ta banque pour connaître ta capacité d'emprunt (ex : \"tu peux emprunter jusqu'à 180 000 €\").\n\n2. Chercher un bien rentable — regarde le prix d'achat, le montant des travaux, le loyer que tu pourras demander, la taxe foncière, les charges de copropriété et le DPE.\n\n3. Faire une offre — si le bien te plaît, tu fais une offre d'achat.\n\n4. Signer le compromis de vente — une fois l'offre acceptée, chez le notaire ou en agence.\n\n5. Monter le dossier de prêt — fournis à la banque tes 3 derniers bulletins de salaire, tes avis d'imposition, tes relevés de compte, ton compromis de vente et les devis de travaux s'il y en a.\n\n6. Signature chez le notaire — la banque débloque les fonds, tu signes l'acte définitif et tu deviens propriétaire.\n\n7. Faire les travaux — si le bien en a besoin, tu le rénoves.\n\n8. Mettre le bien en location — tu fixes le loyer, publies l'annonce, sélectionnes le locataire, signes le bail et réalises l'état des lieux.\n\n9. Déclarer les loyers — chaque année, tu déclares les revenus locatifs lors de ta déclaration d'impôts.",
  },
  {
    cat: "Devenir propriétaire", couleur: "#F59E0B", q: "Comment rédiger le bail de location ?",
    a: "Tu n'as pas besoin de le créer toi-même à partir de zéro. Tu as plusieurs possibilités :\n\n1. Le plus simple : utiliser un modèle de bail conforme à la loi. Il existe des modèles officiels que tu remplis avec tes coordonnées, celles du locataire, l'adresse du logement, le montant du loyer, les charges, le dépôt de garantie et la date d'entrée dans les lieux.\n\n2. Passer par une agence immobilière, qui s'occupe de rédiger le bail, de trouver le locataire et de faire l'état des lieux (en échange d'honoraires).\n\n3. Utiliser un logiciel de gestion locative, qui génère automatiquement le bail à partir des informations que tu saisis.",
  },
  {
    cat: "Devenir propriétaire", couleur: "#F59E0B", q: "Quels documents dois-je remettre à mon locataire à la signature ?",
    a: "En plus du bail, il faut remettre plusieurs documents obligatoires :\n• le diagnostic de performance énergétique (DPE)\n• les autres diagnostics obligatoires selon le logement\n• l'état des lieux d'entrée\n• certaines annexes prévues par la réglementation",
  },
  {
    cat: "Devenir propriétaire", couleur: "#F59E0B", q: "Quels documents dois-je préparer en tant que propriétaire bailleur ?",
    a: "Avant la location :\n• Estimation du loyer\n• DPE et diagnostics obligatoires\n• Assurance propriétaire (PNO)\n\nPour choisir le locataire :\nUne fiche de renseignements et la liste des documents à demander :\n• pièce d'identité\n• 3 dernières fiches de paie\n• contrat de travail\n• dernier avis d'imposition\n• justificatif de domicile\n• garant (si nécessaire)\n\nPour signer :\n• Bail de location\n• État des lieux d'entrée\n• Quittance de loyer\n• Modèle de caution\n• Lettre de révision de loyer\n\nGérer soi-même la location d'un premier appartement demande un peu d'apprentissage mais reste tout à fait accessible une fois que tu connais les étapes.",
  },
  {
    cat: "Fiscalité", couleur: "#EC4899", q: "C'est quoi la TMI ?",
    a: "La Tranche Marginale d'Imposition : le taux qui s'applique à la dernière tranche de tes revenus (0%, 11%, 30%, 41% ou 45%). Elle sert à calculer l'impôt sur tes futurs loyers — plus elle est haute, plus tes revenus locatifs sont taxés. Tu la trouves sur ton avis d'imposition.",
  },
  {
    cat: "Fiscalité", couleur: "#EC4899", q: "C'est quoi le taux d'imposition sur mes loyers ?",
    a: "C'est ta TMI additionnée aux prélèvements sociaux (17,2%). Ex : TMI 30% + 17,2% = 47,2% appliqué à tes revenus locatifs imposables, avant abattements ou charges déductibles selon ton régime.",
  },
  {
    cat: "Fiscalité", couleur: "#EC4899", q: "C'est quoi les prélèvements sociaux ?",
    a: "Un impôt de 17,2% (CSG, CRDS...) qui s'ajoute systématiquement à l'impôt sur le revenu classique, sur tous tes revenus locatifs, quel que soit ton régime fiscal.",
  },
  {
    cat: "Fiscalité", couleur: "#EC4899", q: "Tout savoir sur la SCI : à quoi ça sert, ce qu'on peut déduire, avantages, inconvénients",
    a: "La SCI (Société Civile Immobilière) est une société créée pour détenir et gérer un ou plusieurs biens immobiliers à plusieurs personnes (famille, associés, couple), sans les contraintes de l'indivision.\n\nÀ quoi ça sert concrètement :\n• Investir à plusieurs sans être bloqué par les décisions à l'unanimité de l'indivision\n• Transmettre un patrimoine à ses enfants progressivement, avec une fiscalité allégée (donation de parts sociales, abattements renouvelables tous les 15 ans)\n• Séparer le patrimoine immobilier de ton patrimoine personnel\n• Faciliter la revente ou la sortie d'un associé (on cède des parts, pas le bien lui-même)\n\nLes deux régimes fiscaux (choix important à la création) :\n• SCI à l'IR (impôt sur le revenu, par défaut) : chaque associé est imposé sur sa part de revenus fonciers, aux mêmes règles qu'un particulier (micro-foncier ou réel).\n• SCI à l'IS (impôt sur les sociétés) : la société paie l'impôt sur ses bénéfices (15% jusqu'à 42 500 €, puis 25%), et surtout tu peux amortir le bien — souvent zéro impôt pendant plusieurs années.\n\nCe que tu peux déduire :\n• Les intérêts d'emprunt\n• Les travaux d'entretien et de réparation\n• La taxe foncière\n• Les charges de copropriété\n• Les primes d'assurance\n• Les frais de comptabilité et de gestion\n• À l'IS uniquement : l'amortissement du bien et du mobilier (gros avantage fiscal)\n\nAvantages :\n• Transmission facilitée et fiscalement optimisée\n• Protection du patrimoine personnel (dans une certaine mesure)\n• Flexibilité pour faire entrer ou sortir un associé\n• À l'IS : fiscalité souvent plus légère les premières années grâce à l'amortissement\n\nInconvénients et points de vigilance :\n• Frais de création (~1 500-2 500 €) et comptabilité obligatoire chaque année\n• Formalisme : assemblées générales, procès-verbaux, statuts à respecter\n• Plus de micro-foncier possible : tu perds la simplicité de l'abattement forfaitaire\n• À l'IS : en cas de revente, la plus-value est calculée selon les règles professionnelles (moins avantageuses qu'en direct, pas d'abattement pour durée de détention)\n• Responsabilité des associés sur les dettes de la société (proportionnelle à leurs parts)\n\nQuand ça vaut le coup : investir à plusieurs sur le long terme, préparer une transmission familiale, ou optimiser fiscalement un gros patrimoine locatif. Pour un premier investissement locatif simple et seul, la détention en direct (nom propre ou LMNP) est souvent plus simple et moins coûteuse. Un conseil : fais-toi accompagner par un notaire ou un expert-comptable avant de te lancer, le choix IR/IS est difficile à revenir en arrière une fois fait.",
  },
  {
    cat: "Fiscalité", couleur: "#EC4899", q: "C'est quoi le LMNP ?",
    a: "Le statut de Loueur Meublé Non Professionnel : tu loues un bien meublé sans que ce soit ton activité principale. Au régime réel, tu peux amortir le bien et le mobilier dans ta comptabilité, ce qui réduit fortement (parfois à zéro) l'impôt sur tes loyers pendant plusieurs années.",
  },
  {
    cat: "Fiscalité", couleur: "#EC4899", q: "Micro-foncier ou régime réel, c'est quoi la différence ?",
    a: "Micro-foncier (location nue) : abattement forfaitaire de 30% sur tes loyers, simple mais pas toujours avantageux. Régime réel : tu déduis tes charges réelles (travaux, intérêts d'emprunt, taxe foncière...), plus de paperasse mais souvent plus intéressant si tes charges sont élevées.",
  },
  {
    cat: "Fiscalité", couleur: "#EC4899", q: "Comment payer moins d'impôts sur mes loyers ?",
    a: "Plusieurs leviers : passer en LMNP au régime réel (amortissement), créer un déficit foncier en location nue (les travaux déductibles de tes revenus, y compris jusqu'à 10 700€/an de ton revenu global), ou choisir le régime réel plutôt que micro si tes charges dépassent l'abattement forfaitaire. Chaque situation est différente — un expert-comptable peut t'aider à choisir le bon montage.",
  },
  {
    cat: "Location", couleur: "#8B5CF6", q: "Location meublée ou nue, quelle différence ?",
    a: "Nue : le logement est loué vide, le locataire apporte ses meubles ; fiscalité en micro-foncier ou réel foncier. Meublée : le logement inclut lit, table, électroménager, vaisselle etc. (liste légale précise) ; fiscalité en micro-BIC ou réel LMNP, souvent plus avantageuse grâce à l'amortissement.",
  },
  {
    cat: "Location", couleur: "#8B5CF6", q: "C'est quoi la vacance locative ?",
    a: "La période entre deux locataires où le logement est vide et ne génère aucun loyer. On la provisionne en général à 3-8% du loyer annuel pour rester réaliste dans tes calculs, même si le bien se loue vite.",
  },
  {
    cat: "Location", couleur: "#8B5CF6", q: "Quelle assurance prendre contre les loyers impayés, et combien ça coûte ?",
    a: "Ça s'appelle la GLI (Garantie Loyers Impayés). Elle protège le propriétaire si le locataire ne paie plus : elle couvre les loyers et charges impayés, souvent les dégradations locatives, et les frais de procédure si tu dois engager un contentieux ou une expulsion.\n\nCombien ça coûte ?\nEn général entre 2% et 4% du loyer annuel charges comprises, prélevé chaque mois en même temps que le loyer. Pour un loyer de 700€/mois par exemple, ça représente environ 15 à 30€ par mois.\n\nÀ savoir avant de souscrire :\n• La GLI n'accepte pas tous les locataires : il faut généralement qu'il gagne au moins 3 fois le loyer, et qu'il ait un contrat stable (CDI titularisé, fonctionnaire...). Les indépendants, CDD ou étudiants sont souvent refusés ou acceptés sous conditions.\n• Tu ne peux pas cumuler la GLI avec une caution physique (un garant) pour le même logement — il faut choisir l'un ou l'autre.\n\nL'alternative gratuite : la garantie Visale (Action Logement), qui couvre les loyers impayés gratuitement pour certains profils de locataires (jeunes de moins de 30 ans, salariés précaires, etc.). Moins large que la GLI, mais sans coût pour toi.\n\nÀ ne pas confondre avec l'assurance PNO (propriétaire non occupant), qui couvre les dommages au bien lui-même (incendie, dégât des eaux...), pas les impayés — les deux sont complémentaires, pas interchangeables.",
  },
  {
    cat: "Location", couleur: "#8B5CF6", q: "C'est quoi le DPE ?",
    a: "Le Diagnostic de Performance Énergétique : une note de A à G qui évalue la consommation d'un logement. Les logements F et G (« passoires thermiques ») sont progressivement interdits à la location — vérifie toujours le DPE avant d'acheter, il peut impliquer des travaux obligatoires.",
  },
  {
    cat: "Charges & calculs", couleur: "#10B981", q: "Quand j'achète un bien, quelles sont toutes les charges à payer (impôts, taxes...) ?",
    a: "Il y a deux temps : à l'achat, puis chaque année ensuite.\n\nÀ l'achat (une seule fois) :\n• Frais de notaire : ~7-8% du prix dans l'ancien, ~2-3% dans le neuf\n• Frais de dossier et de garantie du crédit (si tu empruntes)\n• Éventuels frais d'agence (souvent déjà inclus dans le prix affiché)\n\nChaque année ensuite :\n• Taxe foncière (due même sans locataire)\n• Charges de copropriété (si applicable)\n• Assurance PNO (propriétaire non occupant)\n• Entretien et petites réparations\n• Impôt sur les loyers perçus (TMI + 17,2% de prélèvements sociaux)\n• Assurance emprunteur (incluse dans ta mensualité de crédit)\n\nÀ prévoir aussi : la vacance locative (périodes sans locataire) et, si tu passes par une agence, des frais de gestion locative. Le calculateur d'Exion additionne déjà tout ça automatiquement dans ton cash-flow et ta rentabilité nette.",
  },
  {
    cat: "Charges & calculs", couleur: "#10B981", q: "C'est quoi les charges, exactement ?",
    a: "Tout ce que tu payes pour posséder et louer le bien, en dehors de la mensualité de crédit : charges de copropriété, taxe foncière, assurance PNO (propriétaire non occupant), entretien, gestion locative. Les oublier dans tes calculs fausse complètement ta rentabilité réelle.",
  },
  {
    cat: "Charges & calculs", couleur: "#10B981", q: "Charges de copropriété : combien par an, et que faut-il vérifier avant d'acheter ?",
    a: "Le montant varie énormément selon l'immeuble : entretien courant, ascenseur, espaces verts, gardien, assurance de l'immeuble, honoraires du syndic... Selon la taille et les prestations, ça va de quelques centaines d'euros à plusieurs milliers d'euros par an. Demande toujours le montant exact au vendeur ou au syndic avant de faire une offre.\n\nCe qu'il faut vérifier avant d'acheter :\n\n• Le montant des charges des 3 dernières années — pas juste l'année en cours, pour voir si elles augmentent régulièrement\n\n• Les procès-verbaux des 3 dernières assemblées générales (AG) — obligatoires à la vente. Ils montrent les travaux votés, ceux à venir, et les éventuels conflits entre copropriétaires\n\n• Le carnet d'entretien de l'immeuble — état général, historique des travaux réalisés\n\n• Le fonds de travaux (obligatoire depuis la loi ALUR) — vérifie s'il existe et son montant : plus il est garni, moins tu risques un appel de fonds surprise\n\n• Les impayés de charges dans la copropriété — si d'autres copropriétaires ne paient pas, ça fragilise les finances communes et peut retomber indirectement sur toi\n\n• Les procédures judiciaires en cours contre ou par la copropriété (litiges avec un prestataire, un copropriétaire...)\n\n• Le pré-état daté puis l'état daté — documents obligatoires fournis par le syndic lors de la vente, qui détaillent précisément ce que le vendeur doit encore à la copropriété et ce que tu devras payer après l'achat\n\n• La taille de la copropriété — un petit immeuble (peu de lots) répartit les grosses dépenses sur moins de copropriétaires, donc des charges par lot souvent plus élevées qu'un grand ensemble\n\n• Si de gros travaux sont votés ou à prévoir (ravalement, toiture, ascenseur...), ils peuvent représenter plusieurs milliers d'euros supplémentaires, à intégrer dans ton budget avant l'achat, pas après.",
  },
  {
    cat: "Charges & calculs", couleur: "#10B981", q: "Rentabilité brute ou nette, laquelle regarder ?",
    a: "La brute (loyer annuel ÷ prix d'achat) est rapide mais optimiste : elle ignore charges, impôts et frais. La nette déduit tout ça — c'est elle qui reflète la vraie performance de ton investissement, toujours plus basse que la brute.",
  },
  {
    cat: "Charges & calculs", couleur: "#10B981", q: "C'est quoi les frais de notaire ?",
    a: "Les frais liés à l'achat (environ 7-8% du prix dans l'ancien, 2-3% dans le neuf) : ils incluent les taxes reversées à l'État et la rémunération du notaire. Ils font partie de ton investissement total, pas seulement le prix du bien.",
  },
  {
    cat: "Financement", couleur: "#3B82F6", q: "C'est quoi l'effet de levier ?",
    a: "Le principe d'utiliser l'argent de la banque pour investir plus que ce que ton épargne seule permettrait. C'est ce qui rend l'immobilier locatif attractif : tu fais fructifier un capital que tu n'as pas encore, remboursé petit à petit par les loyers de tes locataires.",
  },
  {
    cat: "Financement", couleur: "#3B82F6", q: "C'est quoi la plus-value immobilière ?",
    a: "La différence entre le prix de vente et le prix d'achat d'un bien. Elle est taxée si tu revends (sauf résidence principale), avec un abattement qui augmente avec la durée de détention jusqu'à exonération totale après 22 ans (impôt) et 30 ans (prélèvements sociaux).",
  },
  {
    cat: "Financement", couleur: "#3B82F6", q: "Combien faut-il d'apport pour un crédit, par exemple de 90 000 € ?",
    a: "En général, les banques demandent au minimum 10% du prix total (bien + frais de notaire) en apport — principalement pour couvrir les frais de notaire et de dossier, qu'elles financent rarement. Les prêts à 110% (tout financé, sans apport) existent mais restent réservés aux dossiers solides.\n\nExemple pour un bien à 90 000 € (ancien) :\n• Frais de notaire (~7-8%) : environ 6 500 à 7 200 €\n• Apport recommandé (10% du total) : environ 9 000 à 9 700 €\n\nEn investissement locatif, certaines banques acceptent de financer sans apport si le dossier est bon (revenus stables, taux d'endettement faible, projet cohérent) — les loyers futurs jouant en ta faveur. Mais avoir 10% d'apport reste le meilleur moyen de rassurer la banque et d'obtenir un meilleur taux.",
  },
  {
    cat: "Financement", couleur: "#3B82F6", q: "Comment décrocher un crédit plus facilement, même en auto-entrepreneur ?",
    a: "Les banques sont plus prudentes avec les revenus non salariés (auto-entrepreneur, indépendant), car jugés moins stables qu'un CDI. Quelques leviers pour rassurer le banquier :\n\n• Présente 2-3 ans de bilans ou déclarations avec un chiffre d'affaires stable ou en croissance\n• Montre une épargne de précaution (quelques mois de charges de côté)\n• Garde tes comptes personnels propres : pas de découvert sur les 3 derniers mois\n• Passe par un courtier — il connaît les banques les plus réceptives aux profils non-salariés\n• Un apport plus élevé (15-20% au lieu de 10%) rassure beaucoup\n• Un co-emprunteur en CDI peut faire basculer le dossier\n• Garde ton taux d'endettement global sous 35%",
  },
  {
    cat: "Financement", couleur: "#3B82F6", q: "En auto-entrepreneur, que faut-il pour être quasiment sûr d'obtenir un crédit ?",
    a: "Aucune banque ne garantit un crédit à 100%, mais en cochant un maximum de ces conditions, tu maximises très fortement tes chances :\n\n• Ancienneté : au moins 2 ans d'activité (3 ans, c'est encore mieux et rassure beaucoup plus)\n• Chiffre d'affaires stable ou en croissance sur ces années, sans baisse de plus de 20% d'une année à l'autre\n• Taux d'endettement global sous 35% (nouvelle mensualité incluse), calculé sur ton revenu net moyen\n• Apport de 15 à 20% du prix total (plus que les 10% classiques demandés à un salarié)\n• Épargne de précaution visible sur tes comptes (3 à 6 mois de charges de côté)\n• Comptes bancaires personnels et professionnels sans incident sur les 3 derniers mois : pas de découvert, pas de rejet de prélèvement\n• Peu ou pas de crédits à la consommation en cours\n• Un dossier complet et propre : attestation URSSAF à jour, avis d'imposition des 2-3 dernières années, relevés de chiffre d'affaires\n• Idéalement, un co-emprunteur en CDI, qui rassure énormément la banque\n• Passer par un courtier plutôt qu'une seule banque en direct — il connaît les établissements les plus souples avec les indépendants et peut mettre plusieurs dossiers en concurrence\n\nEn réunissant la majorité de ces points, ton profil devient quasiment aussi solide qu'un salarié en CDI aux yeux de la banque.",
  },
];

function VueLexique({ onBack, onVoirBail }) {
  const [ouvert, setOuvert] = useState(null);
  const categories = [...new Set(LEXIQUE.map((l) => l.cat))];

  return (
    <div>
      <BackHeader title="Lexique & FAQ" onBack={onBack} />
      <div className="px-5 pt-3 pb-28">
        <p className="mb-5 exion-fade" style={{ fontSize: "13px", color: C.onDarkMuted, lineHeight: "1.5", ...font }}>
          Les termes de l'investissement locatif, expliqués simplement. Tape une question pour voir la réponse.
        </p>
        {categories.map((cat) => {
          const items = LEXIQUE.filter((l) => l.cat === cat);
          const couleur = items[0].couleur;
          return (
            <div key={cat} className="mb-5">
              <div className="font-semibold uppercase tracking-wide mb-2.5 px-1" style={{ fontSize: "12px", color: couleur, ...font }}>{cat}</div>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const key = `${cat}-${i}`;
                  const isOpen = ouvert === key;
                  return (
                    <button key={key} onClick={() => setOuvert(isOpen ? null : key)} className="w-full text-left exion-press">
                      <div className="rounded-2xl p-4" style={{ background: C.bgSoft, border: `1px solid ${isOpen ? `${couleur}66` : "#2A3A5C"}` }}>
                        <div className="flex items-center justify-between gap-3">
 <span className="font-semibold" style={{ fontSize: "14px", color: C.onDark, ...font }}>{item.q}</span>
                          <ChevronDown size={16} color={couleur} className="shrink-0" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                        </div>
                        {isOpen && (
 <p className="mt-2.5 pt-2.5 exion-fade" style={{ fontSize: "13px", lineHeight: "1.55", color: C.onDarkMuted, borderTop: "1px solid #2A3A5C", whiteSpace: "pre-line", ...font }}>{item.a}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {cat === "Devenir propriétaire" && (
                <button onClick={onVoirBail} className="w-full text-left mt-3 exion-fade exion-press">
                  <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.14), rgba(245,158,11,0.05))", border: "1px solid rgba(245,158,11,0.4)" }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.18)" }}>
                      <FileText size={20} color="#F59E0B" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold" style={{ fontSize: "14px", color: C.onDark, ...font }}>Voir le modèle de bail</div>
                      <div style={{ fontSize: "11.5px", color: C.onDarkMuted, ...font }}>Contrat type officiel, gratuit — à copier et remplir</div>
                    </div>
                    <ChevronRight size={18} color="#F59E0B" className="shrink-0" />
                  </div>
                </button>
              )}
            </div>
          );
        })}
        <div className="rounded-2xl p-4 exion-fade flex items-start gap-2.5" style={{ background: "rgba(139,92,246,0.10)", border: "1px solid #3A3D6B" }}>
          <Info size={16} color="#C4B5FD" className="shrink-0 mt-0.5" />
 <p style={{ fontSize: "12px", lineHeight: "1.5", color: "#D8D4F0", ...font }}>Une question sans réponse ici ? Pose-la à l'assistant Exion (bouton en bas à droite).</p>
        </div>
      </div>
    </div>
  );
}

function VueOutils({ onBack, onOutil }) {
  return (
    <div className="px-5 pt-6 pb-28">
      <div className="relative mb-5 exion-fade">
        <h1 className="font-extrabold" style={{ fontSize: '32px', color: C.onDark, lineHeight: 1.1, ...font }}>Outils</h1>
        <p className="mt-2" style={{ fontSize: '14px', color: C.onDarkMuted, maxWidth: '58%', lineHeight: 1.35, ...font }}>Toutes les ressources pour investir intelligemment</p>
        <img src={TOOLBOX_IMG} alt="" className="absolute pointer-events-none select-none" style={{ top: "-14px", right: "-8px", width: "148px", height: "auto" }} />
      </div>
      <div className="space-y-3">
        {OUTILS.map((o) => (
          <button key={o.id} onClick={() => onOutil(o.id)} className="w-full text-left exion-fade exion-press">
            <div className="flex items-center gap-3 p-4 rounded-[22px]" style={{ background: `${o.color}17`, border: `1px solid ${o.color}55`, boxShadow: `0 0 26px ${o.color}22` }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${o.color}55, ${o.color}22)`, boxShadow: `0 0 16px ${o.color}66` }}>
                <o.icon size={24} color="#fff" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold" style={{ fontSize: '16px', color: C.onDark, ...font }}>{o.label}</div>
                <div className="mt-0.5 leading-snug" style={{ fontSize: '12.5px', color: C.onDarkMuted, ...font }}>{o.descLong}</div>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${o.color}26` }}>
                <ChevronRight size={16} color={o.color} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const CHECKLIST_ITEMS = [
  { titre: "Définir mes objectifs", desc: "Clarifiez votre projet et vos objectifs d'investissement", icon: Target, color: "#22C55E" },
  { titre: "Calculer mon budget", desc: "Évaluez votre capacité d'emprunt et votre budget", icon: Calculator, color: "#22C55E" },
  { titre: "Rechercher des biens", desc: "Trouvez les biens correspondant à vos critères", icon: Search, color: "#22C55E" },
  { titre: "Analyser la rentabilité", desc: "Étudiez la rentabilité et le potentiel du bien", icon: BarChart3, color: "#8B5CF6" },
  { titre: "Visiter le bien", desc: "Visitez le bien et validez votre coup de cœur", icon: Eye, color: "#6366F1" },
  { titre: "Faire une offre", desc: "Négociez et faites une offre au vendeur", icon: FileText, color: "#6366F1" },
  { titre: "Obtenir le financement", desc: "Obtenez votre accord de financement", icon: Key, color: "#6366F1" },
  { titre: "Signer chez le notaire", desc: "Finalisez l'achat chez le notaire", icon: Pencil, color: "#6366F1" },
  { titre: "Préparer la mise en location", desc: "Préparez la location et trouvez vos locataires", icon: HomeIcon, color: "#6366F1" },
];

function VueChecklist({ onBack }) {
  const [coche, setCoche] = useState({});
  useEffect(() => {
    (async () => {
      try { const raw = localStorage.getItem("checklist"); if (raw) setCoche(JSON.parse(raw)); } catch (e) {}
    })();
  }, []);
  function toggle(i) {
    const next = { ...coche, [i]: !coche[i] };
    setCoche(next);
    try { localStorage.setItem("checklist", JSON.stringify(next)); } catch (e) {}
  }
  const total = CHECKLIST_ITEMS.length;
  const faits = CHECKLIST_ITEMS.reduce((s, _, i) => s + (coche[i] ? 1 : 0), 0);
  const pct = Math.round((faits / total) * 100);
  const enCoursIdx = CHECKLIST_ITEMS.findIndex((_, i) => !coche[i]);

  const badge = pct === 100 ? "🎉 Projet complet !" : pct >= 50 ? "✨ Vous progressez bien !" : pct > 0 ? "✨ Bon démarrage !" : "C'est parti !";
  const motif = pct === 100 ? "Toutes les étapes sont bouclées, félicitations !" : "Vous êtes sur la bonne voie ! Continuez comme ça.";

  return (
    <div>
      <div className="flex items-center justify-between px-5 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Retour"><ArrowLeft size={20} color={C.onDark} /></button>
          <span className="font-bold uppercase tracking-wide" style={{ fontSize: "13px", color: C.onDark, ...font }}>Check-list investissement</span>
        </div>
        <MoreHorizontal size={19} color={C.onDarkMuted} />
      </div>

      <div className="px-5 pb-24 pt-2">
        <div className="rounded-[26px] p-4 mb-4 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                <defs>
                  <linearGradient id="checklistGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14F1D9" /><stop offset="55%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="42" fill="none" stroke="#22304C" strokeWidth="9" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#checklistGrad)" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${pct} 100`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-extrabold" style={{ fontSize: "24px", color: "#fff", ...font }}>{pct}%</span>
                <span style={{ fontSize: "10px", color: C.onDarkMuted, ...font }}>Complété</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold" style={{ fontSize: "15px", color: "#fff", ...font }}>Progression globale</div>
              <p style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>{motif}</p>
            </div>
          </div>
          <div className="h-2 rounded-full mt-3 mb-2" style={{ background: "#22304C" }}>
            <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: C.gradient }} />
          </div>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: "12.5px", color: C.onDarkMuted, ...font }}><strong style={{ color: "#fff" }}>{faits}</strong> / {total} étapes complétées</span>
            <span className="font-semibold px-2.5 py-1 rounded-full" style={{ fontSize: "11px", background: "rgba(139,92,246,0.16)", color: "#C4B5FD", ...font }}>{badge}</span>
          </div>
        </div>

        <div className="relative">
          {CHECKLIST_ITEMS.map((item, i) => {
            const termine = !!coche[i];
            const enCours = i === enCoursIdx;
            const statut = termine ? "Terminé" : enCours ? "En cours" : "À faire";
            const statutColor = termine ? C.green : enCours ? "#8B5CF6" : C.onDarkMuted;
            const statutBg = termine ? "rgba(34,197,94,0.16)" : enCours ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.06)";
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0"
                    style={{ background: termine ? C.green : enCours ? "#1A1B42" : "#161B38", border: enCours ? "2px solid #8B5CF6" : termine ? "none" : "1px solid #2A3A5C", color: termine ? "#06280F" : enCours ? "#C4B5FD" : C.onDarkMuted, fontSize: "12px", ...font }}>
                    {termine ? <Check size={14} strokeWidth={3} /> : i + 1}
                  </div>
                  {i < CHECKLIST_ITEMS.length - 1 && <div className="flex-1" style={{ width: 2, minHeight: 22, background: termine ? C.green : "#2A3A5C" }} />}
                </div>
                <button onClick={() => toggle(i)} className="flex-1 min-w-0 text-left mb-3 exion-press">
                  <div className="rounded-2xl p-3" style={{ background: "#1A1B42", border: enCours ? "1px solid #8B5CF6" : "1px solid #2A3A5C", boxShadow: enCours ? "0 0 0 1px rgba(139,92,246,0.25)" : "none" }}>
                    <div className="flex items-start gap-3">
                      <IconSquare icon={item.icon} color={item.color} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold leading-snug" style={{ fontSize: "14px", color: "#fff", ...font }}>{i + 1}. {item.titre}</div>
                        <div className="leading-snug mt-0.5" style={{ fontSize: "11.5px", color: C.onDarkMuted, ...font }}>{item.desc}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2.5">
                      <span className="shrink-0 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1" style={{ fontSize: "10.5px", background: statutBg, color: statutColor, ...font }}>
                        {termine && <Check size={11} strokeWidth={3} />}{enCours && <span className="w-1.5 h-1.5 rounded-full" style={{ background: statutColor }} />}{statut}
                      </span>
                      <ChevronRight size={16} color={C.onDarkMuted} className="shrink-0" />
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <div className="rounded-[26px] p-4 mt-1 relative overflow-hidden exion-fade" style={{ background: "linear-gradient(135deg, rgba(20,241,217,0.10), rgba(139,92,246,0.10))", border: "1px solid #3A3D6B" }}>
          <HouseIllustration />
          <div className="relative z-10 pr-16">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={15} color="#A855F7" />
              <span className="font-bold" style={{ fontSize: "13px", color: "#C4B5FD", ...font }}>Astuce Exion</span>
            </div>
            <p style={{ fontSize: "12.5px", lineHeight: "1.5", color: "#D8D4F0", ...font }}>
              Les investisseurs qui suivent toutes les étapes ont <strong style={{ color: C.green }}>2,5x plus de chances</strong> de réussir leur projet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SIMULATION DE CRÉDIT — écran dashboard avec badges, donut chart
============================================================ */

const ICON_GRAD = {
  blue: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
  green: "linear-gradient(135deg,#22C55E,#14B8A6)",
  pink: "linear-gradient(135deg,#EC4899,#F43F5E)",
  purple: "linear-gradient(135deg,#8B5CF6,#6366F1)",
  orange: "linear-gradient(135deg,#F59E0B,#F97316)",
};

function IconBadge({ icon: Icon, grad, size = 20, box = 40 }) {
  return (
    <div style={{ width: box, height: box, borderRadius: box * 0.32, background: grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={size} color="#fff" />
    </div>
  );
}

function ParamRow({ icon, grad, label, wide, chevron, pencil, children }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-2xl p-2 relative ${wide ? "col-span-2" : ""}`} style={{ background: "#1B2740", border: "1px solid #2A3A5C" }}>
      <IconBadge icon={icon} grad={grad} size={15} box={28} />
      <div className="flex-1 min-w-0">
 <div className="" style={{ fontSize: '11px',  color: C.onDarkMuted, ...font }}>{label}</div>
        {children}
      </div>
      {chevron && <ChevronDown size={16} color={C.onDarkMuted} className="shrink-0" />}
      {pencil && <Pencil size={15} color="#8B5CF6" className="shrink-0" />}
    </div>
  );
}

const HOUSE_IMG = "/img/maison.webp";

function HouseIllustration() {
  return (
    <img src={HOUSE_IMG} alt="" className="absolute right-2 top-2 w-24 pointer-events-none select-none" style={{ filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.4))" }} />
  );
}

function MoneyField({ value, onChange, placeholder, suffix = "€" }) {
  const raw = String(value || "").replace(/\D/g, "");
  const formatted = raw ? Number(raw).toLocaleString("fr-FR") : "";
  const formattedPlaceholder = placeholder ? Number(String(placeholder).replace(/\D/g, "")).toLocaleString("fr-FR") : "";
  const chars = Math.max((formatted || formattedPlaceholder).length, 3);
  return (
    <div className="flex items-baseline gap-1" style={{ width: "fit-content" }}>
      <input
        type="text" inputMode="numeric"
        value={formatted}
        placeholder={formattedPlaceholder}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        style={{ background: "transparent", border: "none", outline: "none", padding: 0, color: "#fff", fontSize: "16px", fontWeight: 700, width: `${chars}ch`, ...font }}
      />
      <span className="shrink-0" style={{ fontSize: '14px', fontWeight: 600, color: "#fff", ...font }}>{suffix}</span>
    </div>
  );
}

const ghostInput = { background: "transparent", border: "none", outline: "none", padding: 0, width: "100%" };

function VueCredit({ onBack, credit, setCredit }) {
  const { revenu, apport, duree, taux, montant } = credit;
  const setRevenu = (v) => setCredit((c) => ({ ...c, revenu: v }));
  const setApport = (v) => setCredit((c) => ({ ...c, apport: v }));
  const setDuree = (v) => setCredit((c) => ({ ...c, duree: v }));
  const setTaux = (v) => setCredit((c) => ({ ...c, taux: v }));
  const setMontant = (v) => setCredit((c) => ({ ...c, montant: v }));
  const [voirTableau, setVoirTableau] = useState(false);

  const rev = Number(revenu) || 0;
  const app = Number(apport) || 0;
  const d = Number(duree) || 20;
  const t = Number(taux) || 0;
  const tauxMensuel = t / 100 / 12;
  const nbMois = d * 12;

  const mensualiteMax = rev * 0.35;
  const capitalMax = tauxMensuel > 0
    ? Math.round((mensualiteMax * (1 - Math.pow(1 + tauxMensuel, -nbMois))) / tauxMensuel)
    : Math.round(mensualiteMax * nbMois);

  const capitalSimule = Number(montant) > 0 ? Number(montant) : capitalMax;
  const capaciteEmprunt = capitalSimule + app;
  const capacitePct = Math.min(100, Math.round((capaciteEmprunt / Math.max(capaciteEmprunt, 1)) * 95));

  const mensualite = tauxMensuel > 0
    ? Math.round((capitalSimule * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nbMois)))
    : Math.round(capitalSimule / nbMois);
  const coutTotal = mensualite * nbMois;
  const coutInterets = Math.max(coutTotal - capitalSimule, 0);
  const capitalPct = coutTotal > 0 ? Math.round((capitalSimule / coutTotal) * 100) : 0;
  const interetPct = 100 - capitalPct;

  const tableau = [];
  if (capitalSimule > 0 && tauxMensuel >= 0) {
    let solde = capitalSimule;
    for (let annee = 1; annee <= d; annee++) {
      let interets = 0, capitalRembourse = 0;
      for (let m = 0; m < 12 && solde > 0; m++) {
        const intMois = solde * tauxMensuel;
        const capMois = Math.min(mensualite - intMois, solde);
        interets += intMois; capitalRembourse += capMois; solde -= capMois;
      }
      tableau.push({ annee, interets: Math.round(interets), capitalRembourse: Math.round(capitalRembourse), solde: Math.round(Math.max(solde, 0)) });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between px-5 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Retour"><ArrowLeft size={20} color={C.onDark} /></button>
 <span className="font-bold" style={{ fontSize: '19px',  color: C.onDark, ...font }}>
            Simulation de <span style={{ background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>crédit</span>
          </span>
        </div>
        <Info size={19} color={C.onDarkMuted} />
      </div>

      <div className="px-5 pb-20 space-y-2">
        {/* Capacité d'emprunt */}
 <div className="p-3.5 exion-fade relative overflow-hidden" style={{ borderRadius: '26px',  background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <HouseIllustration />
          <div className="flex items-center gap-2.5 mb-2 relative">
            <IconBadge icon={Landmark} grad={ICON_GRAD.blue} box={48} size={22} />
            <div>
 <div className="" style={{ fontSize: '13px',  color: C.onDarkMuted, ...font }}>Capacité d'emprunt</div>
 <div className="font-extrabold" style={{ fontSize: '20px',  color: "#fff", ...font }}>{fmt(capaciteEmprunt)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 relative">
            <div className="flex-1 h-2.5 rounded-full" style={{ background: "#22304C" }}>
              <div className="h-2.5 rounded-full" style={{ width: `${capacitePct}%`, background: C.green }} />
            </div>
 <span className="font-bold" style={{ fontSize: '13px',  color: C.green, ...font }}>{capacitePct}%</span>
          </div>
 <p className="mt-2 relative" style={{ fontSize: '12px',  color: C.onDarkMuted, ...font }}>Sur la base de votre taux d'endettement de 35%</p>
        </div>

        {/* Mensualité */}
 <div className="p-3.5 exion-fade" style={{ borderRadius: '26px',  background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="flex items-start justify-between mb-1">
 <span className="" style={{ fontSize: '13px',  color: C.onDarkMuted, ...font }}>Mensualité estimée</span>
 <span className="font-semibold px-3 py-1.5 rounded-full text-white" style={{ fontSize: '12px',  background: C.gradient, ...font }}>{d} ans • {t}%</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
 <span className="font-extrabold leading-none" style={{ fontSize: '30px',  color: "#fff", ...font }}>{fmt(mensualite)}</span>
 <span className="" style={{ fontSize: '15px',  color: "#8B5CF6", ...font }}>/ mois</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <IconBadge icon={Wallet} grad={ICON_GRAD.green} box={34} size={16} />
 <div className="mt-1.5" style={{ fontSize: '11px',  color: C.onDarkMuted, ...font }}>Capital emprunté</div>
 <div className="font-bold" style={{ fontSize: '14px',  color: "#fff", ...font }}>{fmt(capitalSimule)}</div>
            </div>
            <div>
              <IconBadge icon={PieChart} grad={ICON_GRAD.pink} box={34} size={16} />
 <div className="mt-1.5" style={{ fontSize: '11px',  color: C.onDarkMuted, ...font }}>Coût total des intérêts</div>
 <div className="font-bold" style={{ fontSize: '14px',  color: "#fff", ...font }}>{fmt(coutInterets)}</div>
            </div>
            <div>
              <IconBadge icon={CreditCard} grad={ICON_GRAD.purple} box={34} size={16} />
 <div className="mt-1.5" style={{ fontSize: '11px',  color: C.onDarkMuted, ...font }}>Coût total du crédit</div>
 <div className="font-bold" style={{ fontSize: '14px',  color: "#fff", ...font }}>{fmt(coutTotal)}</div>
            </div>
          </div>
        </div>

        {/* Vos paramètres */}
 <div className="p-3.5 exion-fade" style={{ borderRadius: '26px',  background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal size={16} color="#8B5CF6" />
 <span className="font-bold" style={{ fontSize: '15px',  color: "#fff", ...font }}>Vos paramètres</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <ParamRow icon={User} grad={ICON_GRAD.green} label="Revenu mensuel net">
              <MoneyField value={revenu} onChange={setRevenu} />
            </ParamRow>
            <ParamRow icon={PiggyBank} grad={ICON_GRAD.purple} label="Apport personnel">
              <MoneyField value={apport} onChange={setApport} />
            </ParamRow>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <ParamRow icon={Calendar} grad={ICON_GRAD.blue} label="Durée du prêt" chevron>
 <select style={{ fontSize: '16px',  ...ghostInput, color: "#fff", ...font, appearance: "none" }} className="font-bold" value={duree} onChange={(e) => setDuree(e.target.value)}>
                {[10, 15, 20, 25, 30].map((y) => <option key={y} value={y} style={{ color: "#000" }}>{y} ans</option>)}
              </select>
            </ParamRow>
            <ParamRow icon={TrendingUp} grad={ICON_GRAD.orange} label="Taux d'intérêt" chevron>
              <div className="flex items-baseline gap-1">
 <input style={{ fontSize: '16px',  ...ghostInput, color: "#fff", width: "auto", ...font }} className="font-bold" type="number" step="0.1" value={taux} onChange={(e) => setTaux(e.target.value)} size={3} />
 <span className="font-semibold" style={{ fontSize: '14px',  color: "#fff", ...font }}>%</span>
              </div>
            </ParamRow>
          </div>
          <ParamRow icon={Calculator} grad={ICON_GRAD.pink} label="Montant à emprunter (optionnel)" wide pencil>
            <MoneyField value={montant} onChange={setMontant} placeholder={`${capitalMax}`} />
          </ParamRow>
 <p className="mt-2" style={{ fontSize: '11px',  color: C.onDarkMuted, ...font }}>Laissez vide pour voir votre capacité maximale, ou indiquez un montant précis à simuler.</p>
        </div>

        {/* Répartition du coût total */}
 <div className="p-3.5 exion-fade" style={{ borderRadius: '26px',  background: "#1A1B42", border: "1px solid #2A3A5C" }}>
 <span className="font-bold block mb-4" style={{ fontSize: '15px',  color: "#fff", ...font }}>Répartition du coût total</span>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0 -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#22304C" strokeWidth="14" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={C.green} strokeWidth="14" pathLength="100" strokeDasharray={`${capitalPct} 100`} strokeLinecap="round" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" strokeWidth="14" pathLength="100" strokeDasharray={`${interetPct} 100`} strokeDashoffset={`-${capitalPct}`} strokeLinecap="round" />
            </svg>
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between">
 <span className="flex items-center gap-2 " style={{ fontSize: '13px',  color: C.onDark, ...font }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: C.green }} />Capital emprunté</span>
                <span className="flex items-center gap-2">
 <span className="font-semibold" style={{ fontSize: '13px',  color: "#fff", ...font }}>{fmt(capitalSimule)}</span>
 <span className="font-bold px-2 py-0.5 rounded-full" style={{ fontSize: '11px',  background: "rgba(34,197,94,0.18)", color: "#4ADE80", ...font }}>{capitalPct}%</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
 <span className="flex items-center gap-2 " style={{ fontSize: '13px',  color: C.onDark, ...font }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3B82F6" }} />Intérêts</span>
                <span className="flex items-center gap-2">
 <span className="font-semibold" style={{ fontSize: '13px',  color: "#fff", ...font }}>{fmt(coutInterets)}</span>
 <span className="font-bold px-2 py-0.5 rounded-full" style={{ fontSize: '11px',  background: "rgba(59,130,246,0.18)", color: "#60A5FA", ...font }}>{interetPct}%</span>
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between" style={{ borderTop: "1px solid #22304C" }}>
 <span className="" style={{ fontSize: '13px',  color: C.onDarkMuted, ...font }}>Coût total du crédit</span>
 <span className="font-bold" style={{ fontSize: '13px',  color: "#fff", ...font }}>{fmt(coutTotal)}</span>
              </div>
            </div>
          </div>
        </div>

 <button onClick={() => setVoirTableau((v) => !v)} className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-white exion-press" style={{ fontSize: '15px',  background: C.gradient, boxShadow: "0 8px 22px rgba(139,92,246,0.35)", ...font }}>
          <span className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.22)" }}><BarChart3 size={15} color="#fff" /></span>
            {voirTableau ? "Masquer" : "Voir"} le tableau d'amortissement
          </span>
          <ArrowRight size={18} />
        </button>

        {voirTableau && (
 <div className="p-4 overflow-x-auto exion-fade" style={{ borderRadius: '26px',  background: "#1A1B42", border: "1px solid #2A3A5C" }}>
 <table className="w-full " style={{ fontSize: '12px',  color: C.onDark, ...font }}>
              <thead>
                <tr style={{ color: C.onDarkMuted }}>
                  <th className="text-left py-1.5">Année</th>
                  <th className="text-right py-1.5">Intérêts</th>
                  <th className="text-right py-1.5">Capital remboursé</th>
                  <th className="text-right py-1.5">Solde restant</th>
                </tr>
              </thead>
              <tbody>
                {tableau.map((l) => (
                  <tr key={l.annee} style={{ borderTop: "1px solid #22304C" }}>
                    <td className="py-1.5">{l.annee}</td>
                    <td className="text-right py-1.5">{fmt(l.interets)}</td>
                    <td className="text-right py-1.5">{fmt(l.capitalRembourse)}</td>
                    <td className="text-right py-1.5">{fmt(l.solde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
 <p className="text-center mt-1" style={{ fontSize: '11px',  color: C.onDarkMuted, ...font }}>
          Simulation indicative, hors assurance emprunteur et frais annexes.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   CALCULATEUR DE RENTABILITÉ — écran dédié
============================================================ */

function EditRow({ icon, grad, label, value, onChange, suffix = "€", last }) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: last ? "none" : "1px solid #22304C" }}>
      <IconBadge icon={icon} grad={grad} box={38} size={17} />
      <span className="flex-1" style={{ fontSize: "14px", color: C.onDark, ...font }}>{label}</span>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#1B2740", border: "1px solid #2A3A5C" }}>
        <MoneyField value={value} onChange={onChange} suffix={suffix} />
        <Pencil size={13} color="#8B5CF6" className="shrink-0" />
      </div>
    </div>
  );
}

function SparkChart() {
  return (
    <svg viewBox="0 0 300 70" className="w-full h-16 mt-1" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,52 L40,50 L80,54 L120,44 L160,46 L200,30 L240,26 L300,8 L300,70 L0,70 Z" fill="url(#sparkFill)" />
      <path d="M0,52 L40,50 L80,54 L120,44 L160,46 L200,30 L240,26 L300,8" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VueCalculateur({ onBack, onVoirAnalyse, onOuvrirCredit, credit, bien, setBien }) {
  const [mode, setMode] = useState("brut");
  const { prix, notaire, travaux, loyer, charges } = bien;
  const setPrix = (v) => setBien((b) => ({ ...b, prix: v }));
  const setNotaire = (v) => setBien((b) => ({ ...b, notaire: v }));
  const setTravaux = (v) => setBien((b) => ({ ...b, travaux: v }));
  const setLoyer = (v) => setBien((b) => ({ ...b, loyer: v }));
  const setCharges = (v) => setBien((b) => ({ ...b, charges: v }));

  const p = Number(prix) || 0;
  const n = Number(notaire) || 0;
  const tr = Number(travaux) || 0;
  const l = Number(loyer) || 0;
  const c = Number(charges) || 0;

  const investissementTotal = p + n + tr;
  const loyerAnnuel = l * 12;
  const chargesAnnuelles = c * 12;
  const rentabiliteBrute = investissementTotal > 0 ? (loyerAnnuel / investissementTotal) * 100 : 0;
  const rentabiliteNette = investissementTotal > 0 ? ((loyerAnnuel - chargesAnnuelles) / investissementTotal) * 100 : 0;
  const rentabilitePrincipale = mode === "brut" ? rentabiliteBrute : rentabiliteNette;
  const rentabiliteSecondaire = mode === "brut" ? rentabiliteNette : rentabiliteBrute;

  // apercu simulation de credit — partage le meme etat que l'ecran "Simulation de credit"
  const revenu = Number(credit.revenu) || 0;
  const apport = Number(credit.apport) || 0;
  const dureeCredit = Number(credit.duree) || 20;
  const tauxCredit = Number(credit.taux) || 0;
  const tauxMensuel = tauxCredit / 100 / 12;
  const nbMois = dureeCredit * 12;
  const mensualiteMax = revenu * 0.35;
  const capitalMax = tauxMensuel > 0
    ? Math.round((mensualiteMax * (1 - Math.pow(1 + tauxMensuel, -nbMois))) / tauxMensuel)
    : Math.round(mensualiteMax * nbMois);
  const capitalEmprunte = Number(credit.montant) > 0 ? Number(credit.montant) : capitalMax;
  const capaciteEmprunt = capitalEmprunte + apport;
  const mensualiteEstimee = tauxMensuel > 0
    ? Math.round((capitalEmprunte * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nbMois)))
    : Math.round(capitalEmprunte / nbMois);
  const tauxEndettement = revenu > 0 ? Math.round((mensualiteEstimee / revenu) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between px-5 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Retour"><ArrowLeft size={20} color={C.onDark} /></button>
 <span className="font-bold" style={{ fontSize: '18px', color: C.onDark, ...font }}>
            Calculateur de <span style={{ background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>rentabilité</span>
          </span>
        </div>
        <HelpCircle size={19} color={C.onDarkMuted} />
      </div>

      <div className="px-5 pb-20 space-y-2">
        <div className="rounded-[26px] p-3.5 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="flex rounded-full p-1 mb-2" style={{ background: "#12142F" }}>
            <button onClick={() => setMode("brut")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full font-semibold exion-press"
              style={{ fontSize: "13px", color: mode === "brut" ? "#fff" : C.onDarkMuted, background: mode === "brut" ? C.gradient : "transparent", ...font }}>
              <TrendingUp size={15} /> Rentabilité brute
            </button>
            <button onClick={() => setMode("net")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full font-semibold exion-press"
              style={{ fontSize: "13px", color: mode === "net" ? "#fff" : C.onDarkMuted, background: mode === "net" ? C.gradient : "transparent", ...font }}>
              <SlidersHorizontal size={15} /> Rentabilité nette
            </button>
          </div>

          <EditRow icon={HomeIcon} grad={ICON_GRAD.purple} label="Prix d'achat (FAI)" value={prix} onChange={setPrix} />
          <EditRow icon={FileText} grad={ICON_GRAD.green} label="Frais de notaire" value={notaire} onChange={setNotaire} />
          <EditRow icon={Wrench} grad={ICON_GRAD.blue} label="Travaux à prévoir" value={travaux} onChange={setTravaux} />
          <EditRow icon={Building2} grad={ICON_GRAD.orange} label="Loyer mensuel estimé" value={loyer} onChange={setLoyer} />
          <EditRow icon={PieChart} grad={ICON_GRAD.pink} label="Charges mensuelles" value={charges} onChange={setCharges} last />
        </div>

        <div className="rounded-[26px] p-4 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span style={{ fontSize: "14px", color: C.onDark, ...font }}>{mode === "brut" ? "Rentabilité brute" : "Rentabilité nette"}</span>
            <Info size={14} color={C.onDarkMuted} />
          </div>
          <div className="text-center font-extrabold" style={{ fontSize: "40px", background: "linear-gradient(90deg,#22C55E,#14F1D9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", ...font }}>
            {rentabilitePrincipale.toFixed(2).replace(".", ",")} %
          </div>
          <SparkChart />
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center">
              <Wallet size={18} color="#5B8DFF" className="mx-auto mb-1" />
 <div style={{ fontSize: '11px', color: C.onDarkMuted, ...font }}>Loyer annuel</div>
 <div className="font-bold" style={{ fontSize: '14px', color: "#fff", ...font }}>{fmt(loyerAnnuel)}</div>
            </div>
            <div className="text-center">
              <PiggyBank size={18} color="#A855F7" className="mx-auto mb-1" />
 <div style={{ fontSize: '11px', color: C.onDarkMuted, ...font }}>Investissement total</div>
 <div className="font-bold" style={{ fontSize: '14px', color: "#fff", ...font }}>{fmt(investissementTotal)}</div>
            </div>
            <div className="text-center">
              <TrendingUp size={18} color={C.green} className="mx-auto mb-1" />
 <div style={{ fontSize: '11px', color: C.onDarkMuted, ...font }}>{mode === "brut" ? "Rentabilité nette estimée" : "Rentabilité brute"}</div>
 <div className="font-bold" style={{ fontSize: '14px', color: C.green, ...font }}>{rentabiliteSecondaire.toFixed(2).replace(".", ",")} %</div>
            </div>
          </div>
        </div>

        <button onClick={onVoirAnalyse} className="w-full flex items-center justify-center gap-2 py-4 rounded-full font-bold text-white exion-press" style={{ fontSize: "15px", background: C.gradient, boxShadow: "0 8px 22px rgba(139,92,246,0.35)", ...font }}>
          <Sparkles size={17} /> Voir l'analyse complète <ArrowRight size={17} />
        </button>

        <button onClick={onOuvrirCredit} className="w-full text-left rounded-[26px] p-4 exion-fade exion-press" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconBadge icon={Calculator} grad={ICON_GRAD.blue} box={30} size={15} />
              <span className="font-bold" style={{ fontSize: "15px", color: "#fff", ...font }}>Simulation de crédit</span>
            </div>
            <ChevronRight size={18} color={C.onDarkMuted} />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                <defs>
                  <linearGradient id="miniGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22C55E" /><stop offset="55%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="42" fill="none" stroke="#22304C" strokeWidth="9" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#miniGaugeGrad)" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.min(tauxEndettement * 2.5, 95)} 100`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                <span style={{ fontSize: "9px", color: C.onDarkMuted, ...font }}>Capacité</span>
                <span className="font-extrabold" style={{ fontSize: "13px", color: C.green, ...font }}>{fmt(capaciteEmprunt)}</span>
                <span style={{ fontSize: "9px", color: C.onDarkMuted, ...font }}>endett. {tauxEndettement}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}><span className="w-2 h-2 rounded-full" style={{ background: "#5B8DFF" }} />Mensualité estimée</span>
                <span className="font-semibold" style={{ fontSize: "12px", color: "#fff", ...font }}>{fmt(mensualiteEstimee)}/mois</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}><span className="w-2 h-2 rounded-full" style={{ background: "#A855F7" }} />Durée du prêt</span>
                <span className="font-semibold" style={{ fontSize: "12px", color: "#fff", ...font }}>{dureeCredit} ans</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}><span className="w-2 h-2 rounded-full" style={{ background: C.green }} />Taux d'intérêt</span>
                <span className="font-semibold" style={{ fontSize: "12px", color: "#fff", ...font }}>{tauxCredit.toFixed(2)} %</span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ESTIMATION TRAVAUX — checklist interactive, cochée par l'utilisateur
============================================================ */

const POSTES_TRAVAUX = [
  { id: "grosOeuvre", label: "Gros œuvre / Structure", desc: "Reprises éventuelles, ouvertures, renforts", euroM2: 60, icon: Building2, color: "#3B82F6", priorite: "essentiel", mode: "m2" },
  { id: "electricite", label: "Électricité", desc: "Mise aux normes, tableau, prises, éclairage", euroM2: 107, icon: Zap, color: "#F59E0B", priorite: "essentiel", mode: "m2" },
  { id: "plomberie", label: "Plomberie / Sanitaire", desc: "Réseaux, salle de bain, WC, évacuation", euroM2: 83, icon: Droplet, color: "#38BDF8", priorite: "essentiel", mode: "m2" },
  { id: "isolation", label: "Isolation", desc: "Murs, plafonds, sols, isolation thermique", euroM2: 95, icon: Thermometer, color: "#22C55E", priorite: "important", mode: "m2" },
  { id: "revetements", label: "Revêtements", desc: "Sol, carrelage, faïence, parquet", euroM2: 143, icon: LayoutGrid, color: "#A855F7", priorite: "finition", mode: "m2" },
  { id: "menuiseries", label: "Menuiseries", desc: "Fenêtres, portes, volets — au nombre réel, pas au m²", icon: DoorOpen, color: "#6366F1", priorite: "important", mode: "unite" },
  { id: "peinture", label: "Peinture", desc: "Murs, plafonds, boiseries", euroM2: 48, icon: PaintBucket, color: "#EC4899", priorite: "finition", mode: "m2" },
];

const DPE_ORDRE = ["G", "F", "E", "D", "C", "B", "A"];

function tarifsParDefaut() { return Object.fromEntries(POSTES_TRAVAUX.filter((p) => p.mode === "m2").map((p) => [p.id, String(p.euroM2)])); }
function cocheParDefaut() { return Object.fromEntries(POSTES_TRAVAUX.map((p) => [p.id, true])); }

function IconSquare({ icon: Icon, color, size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={Math.round(size * 0.5)} color="#fff" />
    </div>
  );
}

function DonutPostes({ postes, total }) {
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90 shrink-0">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#22304C" strokeWidth="15" />
      {postes.map((p) => {
        const pct = total > 0 ? (p.montant / total) * 100 : 0;
        const el = <circle key={p.id} cx="50" cy="50" r="40" fill="none" stroke={p.color} strokeWidth="15" pathLength="100" strokeDasharray={`${pct} 100`} strokeDashoffset={`-${offset}`} />;
        offset += pct;
        return el;
      })}
    </svg>
  );
}

function ChecklistTravaux({ coche, toggle, tarifs, setTarifs, nbMenuiseries, setNbMenuiseries, prixMenuiserie, setPrixMenuiserie, montantPoste }) {
  return (
    <div className="space-y-2">
      {POSTES_TRAVAUX.map((p) => {
        const actif = !!coche[p.id];
        const montant = montantPoste(p);
        return (
          <div key={p.id} className="rounded-2xl" style={{ background: actif ? "#1B2740" : "transparent", border: `1px solid ${actif ? "#2A3A5C" : "#22304C"}`, opacity: actif ? 1 : 0.55 }}>
            <button onClick={() => toggle(p.id)} className="w-full flex items-center gap-3 p-2.5 text-left exion-press">
              <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: actif ? C.green : "transparent", border: actif ? "none" : "1px solid #3A4A6B" }}>
                {actif && <Check size={13} color="#06280F" strokeWidth={3} />}
              </div>
              <IconSquare icon={p.icon} color={p.color} />
              <div className="flex-1 min-w-0">
                <div className="font-medium" style={{ fontSize: "13.5px", color: "#fff", ...font }}>{p.label}</div>
                <div className="truncate" style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>{p.desc}</div>
              </div>
              <span className="font-semibold shrink-0" style={{ fontSize: "13px", color: actif ? "#fff" : C.onDarkMuted, ...font }}>{fmt(montant)}</span>
            </button>
            {actif && p.mode === "unite" && (
              <div className="flex items-center gap-2 px-2.5 pb-2.5 pl-14" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5" style={{ background: "#12142F", border: "1px solid #2A3A5C" }}>
                  <span style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>Nombre</span>
                  <input type="number" value={nbMenuiseries} onChange={(e) => setNbMenuiseries(e.target.value)} style={{ ...ghostInput, width: "2.5em", color: "#fff", fontWeight: 700, fontSize: "13px", ...font }} />
                </div>
                <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5" style={{ background: "#12142F", border: "1px solid #2A3A5C" }}>
                  <span style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>Prix unitaire</span>
                  <MoneyField value={prixMenuiserie} onChange={setPrixMenuiserie} />
                </div>
              </div>
            )}
            {actif && p.mode === "m2" && (
              <div className="flex items-center gap-2 px-2.5 pb-2.5 pl-14" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5" style={{ background: "#12142F", border: "1px solid #2A3A5C" }}>
                  <span style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>Tarif</span>
                  <input type="number" value={tarifs[p.id]} onChange={(e) => setTarifs((t) => ({ ...t, [p.id]: e.target.value }))} style={{ ...ghostInput, width: "3em", color: "#fff", fontWeight: 700, fontSize: "13px", ...font }} />
                  <span style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>€/m² (fourniture + pose)</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VueTravaux({ onBack, bien, setBien, travaux, setTravaux }) {
  const [dpeAvant, setDpeAvant] = useState("F");
  const surface = bien.surface || "42";
  const setSurface = (v) => setBien((b) => ({ ...b, surface: v }));
  const { coche, tarifs, nbMenuiseries, prixMenuiserie } = travaux;
  const setTarifs = (updater) => setTravaux((t) => ({ ...t, tarifs: typeof updater === "function" ? updater(t.tarifs) : updater }));
  const setNbMenuiseries = (v) => setTravaux((t) => ({ ...t, nbMenuiseries: v }));
  const setPrixMenuiserie = (v) => setTravaux((t) => ({ ...t, prixMenuiserie: v }));

  const surf = Number(surface) || 0;
  function montantPoste(p) {
    if (p.mode === "unite") return Math.round((Number(nbMenuiseries) || 0) * (Number(prixMenuiserie) || 0));
    return Math.round((Number(tarifs[p.id]) || 0) * surf);
  }
  const postesActifs = POSTES_TRAVAUX.filter((p) => coche[p.id]).map((p) => ({ ...p, montant: montantPoste(p) }));
  const budgetTotal = postesActifs.reduce((s, p) => s + p.montant, 0);

  const parPriorite = { essentiel: 0, important: 0, finition: 0 };
  postesActifs.forEach((p) => { parPriorite[p.priorite] += p.montant; });
  const totalPriorite = Math.max(parPriorite.essentiel + parPriorite.important + parPriorite.finition, 1);

  const upliftValeur = Math.round(budgetTotal * 0.6);
  const gainRentabilite = Math.round((budgetTotal / 25000) * 0.85 * 100) / 100;

  const isolationCochee = coche.isolation;
  const idxAvant = Math.max(DPE_ORDRE.indexOf(dpeAvant), 0);
  const dpeApres = isolationCochee ? DPE_ORDRE[Math.min(idxAvant + 2, 6)] : dpeAvant;

  function toggle(id) { setTravaux((t) => ({ ...t, coche: { ...t.coche, [id]: !t.coche[id] } })); }

  return (
    <div>
      <BackHeader title="Estimation travaux" onBack={onBack} />
      <div className="px-5 pt-2 pb-24">
        <div className="rounded-[26px] p-4 mb-3 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={16} color="#8B5CF6" />
            <span className="font-bold uppercase tracking-wide" style={{ fontSize: "13px", color: "#fff", ...font }}>Surface & état</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Surface (m²)"><TextInput type="number" value={surface} onChange={(e) => setSurface(e.target.value)} /></Field>
            <Field label="DPE actuel"><Select value={dpeAvant} onChange={(e) => setDpeAvant(e.target.value)}>{["A", "B", "C", "D", "E", "F", "G"].map((d) => <option key={d}>{d}</option>)}</Select></Field>
          </div>
          <p style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Coche les travaux à prévoir. Les tarifs sont des moyennes nationales fourniture + pose — modifie-les avec tes vrais prix si besoin, tape sur le chiffre pour l'éditer.</p>
        </div>

        <div className="rounded-[26px] p-4 mb-3 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="font-semibold uppercase tracking-wide mb-3" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Budget travaux estimé</div>
          <div className="flex items-center gap-4">
            <DonutPostes postes={postesActifs} total={budgetTotal} />
            <div>
              <div className="font-extrabold" style={{ fontSize: "30px", background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", ...font }}>{fmt(budgetTotal)}</div>
              <div style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>soit {surf > 0 ? Math.round(budgetTotal / surf) : 0} €/m²</div>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] p-4 mb-3 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="font-semibold uppercase tracking-wide mb-2" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Détail par poste — coche ce qu'il faut faire</div>
          <ChecklistTravaux coche={coche} toggle={toggle} tarifs={tarifs} setTarifs={setTarifs} nbMenuiseries={nbMenuiseries} setNbMenuiseries={setNbMenuiseries} prixMenuiserie={prixMenuiserie} setPrixMenuiserie={setPrixMenuiserie} montantPoste={montantPoste} />
        </div>

        <div className="rounded-[26px] p-4 mb-3 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="font-semibold uppercase tracking-wide mb-2" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Impact après travaux (estimation)</div>
          <ResumeLigne icon={HomeIcon} label="Valorisation potentielle" valeur={`+${fmt(upliftValeur)}`} />
          <div style={{ borderBottom: "none" }}><ResumeLigne icon={SlidersHorizontal} label="Gain de rentabilité nette" valeur={`+${gainRentabilite.toFixed(2).replace(".", ",")} pt`} /></div>
        </div>

        <div className="rounded-[26px] p-4 mb-3 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="font-semibold uppercase tracking-wide mb-3" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>État énergétique</div>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-[11px] mb-1" style={{ color: C.onDarkMuted, ...font }}>Avant</div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold" style={{ background: "#EF4444", color: "#fff", fontSize: "17px", ...font }}>{dpeAvant}</div>
            </div>
            <ArrowRight size={18} color={C.onDarkMuted} />
            <div className="text-center">
              <div className="text-[11px] mb-1" style={{ color: C.onDarkMuted, ...font }}>Après (estimé)</div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold" style={{ background: C.green, color: "#06280F", fontSize: "17px", ...font }}>{dpeApres}</div>
            </div>
          </div>
          {!isolationCochee && <p className="text-center mt-2" style={{ fontSize: "11.5px", color: C.onDarkMuted, ...font }}>Coche "Isolation" pour améliorer le DPE.</p>}
        </div>

        <div className="rounded-[26px] p-4 mb-3 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="font-semibold uppercase tracking-wide mb-3" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Priorité des travaux</div>
          <div className="flex h-2.5 rounded-full overflow-hidden mb-2.5">
            <div style={{ width: `${(parPriorite.essentiel / totalPriorite) * 100}%`, background: "#F43F5E" }} />
            <div style={{ width: `${(parPriorite.important / totalPriorite) * 100}%`, background: "#F59E0B" }} />
            <div style={{ width: `${(parPriorite.finition / totalPriorite) * 100}%`, background: C.green }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div style={{ fontSize: "11px", color: "#F43F5E", ...font }}>Essentiels</div><div className="font-semibold" style={{ fontSize: "13px", color: "#fff", ...font }}>{fmt(parPriorite.essentiel)}</div></div>
            <div><div style={{ fontSize: "11px", color: "#F59E0B", ...font }}>Importants</div><div className="font-semibold" style={{ fontSize: "13px", color: "#fff", ...font }}>{fmt(parPriorite.important)}</div></div>
            <div><div style={{ fontSize: "11px", color: C.green, ...font }}>Finitions</div><div className="font-semibold" style={{ fontSize: "13px", color: "#fff", ...font }}>{fmt(parPriorite.finition)}</div></div>
          </div>
          <div className="mt-3 pt-3 space-y-1" style={{ borderTop: "1px solid #22304C" }}>
            <p style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}><strong style={{ color: "#F43F5E" }}>Essentiels</strong> (structure, électricité, plomberie) : sécurité et mise aux normes, à faire en premier, non négociable.</p>
            <p style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}><strong style={{ color: "#F59E0B" }}>Importants</strong> (isolation, menuiseries) : confort et performance énergétique, fort impact sur la valeur et le DPE.</p>
            <p style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}><strong style={{ color: C.green }}>Finitions</strong> (revêtements, peinture) : esthétique, peut attendre ou être fait progressivement.</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl mb-3" style={{ background: "linear-gradient(135deg, rgba(20,241,217,0.10), rgba(139,92,246,0.10))", border: "1px solid #3A3D6B" }}>
          <ShieldCheck size={17} color="#A855F7" className="shrink-0 mt-0.5" />
          <p style={{ fontSize: "12.5px", lineHeight: "1.5", color: "#D8D4F0", ...font }}>
            Conseil Exion : priorise les postes "essentiels" (structure, électricité, plomberie) avant les finitions — ça évite les mauvaises surprises et les surcoûts après coup.
          </p>
        </div>

        <p className="text-center" style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>Estimations indicatives basées sur des prix moyens au m². À confirmer avec des devis réels.</p>
      </div>
    </div>
  );
}

/* ============================================================
   FORMULAIRE / RÉSULTAT (analyse complète)
============================================================ */

const ETAPES = [
  { id: 1, label: "Le bien", icon: HomeIcon },
  { id: 2, label: "Travaux", icon: Wrench },
  { id: 3, label: "Financement", icon: CreditCard },
  { id: 4, label: "Fiscalité", icon: TrendingUp },
];
const ETAPES_RP = [
  { id: 1, label: "Le bien", icon: HomeIcon },
  { id: 2, label: "Travaux", icon: Wrench },
  { id: 3, label: "Financement", icon: CreditCard },
  { id: 4, label: "Ton budget", icon: Wallet },
];

function Stepper({ step, onGoTo, etapes = ETAPES }) {
  return (
    <div className="flex items-center justify-between px-2 mb-5">
      {etapes.map((e, i) => {
        const active = e.id === step;
        const done = e.id < step;
        return (
          <React.Fragment key={e.id}>
            <button onClick={() => (done ? onGoTo(e.id) : null)} className="flex flex-col items-center gap-1.5" style={{ opacity: done || active ? 1 : 0.5 }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold"
                style={{
                  background: active || done ? C.gradient : "#1B2740",
                  border: active ? "none" : "1px solid #2A3A5C",
                  color: "#fff", fontSize: "13px", ...font,
                }}>
                {done ? <Check size={18} /> : <e.icon size={17} />}
              </div>
              <span style={{ fontSize: "10.5px", color: active ? "#fff" : C.onDarkMuted, ...font }}>{e.label}</span>
            </button>
            {i < etapes.length - 1 && <div className="flex-1 h-px mx-1" style={{ background: e.id < step ? C.green : "#2A3A5C" }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function EtapeVerrouillee({ label, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-2.5" style={{ background: "#161B38", border: "1px solid #23294A" }}>
      <Icon size={17} color={C.onDarkMuted} />
      <span className="flex-1 font-semibold uppercase tracking-wide" style={{ fontSize: "12.5px", color: C.onDarkMuted, ...font }}>{label}</span>
      <Lock size={15} color={C.onDarkMuted} />
    </div>
  );
}

function VueFormulaire({ onCalculer, chargement, onBack, credit, setCredit, bien, setBien, travaux, setTravaux }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState(() => ({
    ville: "", codePostal: "", typeBien: "Appartement", surface: bien.surface || "", prix: bien.prix || "",
    etatBien: "Inconnu", copropriete: "Non", dpe: "Inconnu", ancienNeuf: "Ancien", nbPieces: "",
    exterieurType: "Aucun", exterieurSurface: "",
    creditAutorise: "", apport: credit.apport || "", taux: credit.taux || "4", duree: credit.duree || "20", tauxAssurance: "",
    tmi: "", usage: "Investissement locatif", loyerVise: bien.loyer || "", prixSimulation: "",
    mode: "invest", revenusFoyer: "", creditsEnCours: "", taxeFonciereConnue: "", chargesCoproConnues: "",
  }));
  const [erreurs, setErreurs] = useState({});
  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const estRP = f.mode === "rp";
  const etapes = estRP ? ETAPES_RP : ETAPES;
  const choisirMode = (mode) => setF((prev) => ({ ...prev, mode, usage: mode === "rp" ? "Résidence principale" : "Investissement locatif" }));

  const surfTravaux = Number(f.surface) || 0;
  function montantPosteForm(p) {
    if (p.mode === "unite") return Math.round((Number(travaux.nbMenuiseries) || 0) * (Number(travaux.prixMenuiserie) || 0));
    return Math.round((Number(travaux.tarifs[p.id]) || 0) * surfTravaux);
  }
  const postesActifsForm = POSTES_TRAVAUX.filter((p) => travaux.coche[p.id]).map((p) => ({ ...p, montant: montantPosteForm(p) }));
  const budgetTravauxForm = postesActifsForm.reduce((s, p) => s + p.montant, 0);
  function toggleForm(id) { setTravaux((t) => ({ ...t, coche: { ...t.coche, [id]: !t.coche[id] } })); }
  const setTarifsForm = (updater) => setTravaux((t) => ({ ...t, tarifs: typeof updater === "function" ? updater(t.tarifs) : updater }));
  const setNbMenuiseriesForm = (v) => setTravaux((t) => ({ ...t, nbMenuiseries: v }));
  const setPrixMenuiserieForm = (v) => setTravaux((t) => ({ ...t, prixMenuiserie: v }));

  function validerEtape1() {
    const e = {};
    if (!f.ville.trim()) e.ville = "Requis";
    if (!f.codePostal.trim()) e.codePostal = "Requis";
    if (!(Number(f.prix) > 0)) e.prix = "Indique un prix supérieur à 0";
    if (!(Number(f.surface) > 0)) e.surface = "Indique une surface supérieure à 0";
    setErreurs(e);
    return Object.keys(e).length === 0;
  }

  function lancer() {
    // synchronise avec les autres outils (crédit, calculateur, estimation travaux) pour ne pas avoir a tout retaper
    setCredit((c) => ({ ...c, apport: f.apport || c.apport, taux: f.taux || c.taux, duree: f.duree || c.duree }));
    setBien((b) => ({ ...b, prix: f.prix || b.prix, loyer: f.loyerVise || b.loyer, surface: f.surface || b.surface }));
    onCalculer({
      ...f,
      travauxDetailProbable: budgetTravauxForm,
      travauxDetailLabels: postesActifsForm.map((p) => p.label),
    });
  }

  function suivant() {
    if (step === 1 && !validerEtape1()) return;
    if (step < 4) setStep(step + 1);
    else lancer();
  }

  return (
    <div>
      <BackHeader title="Nouvelle analyse" onBack={onBack} />
      <div className="px-5 pt-2 pb-24">
        {step === 1 && (
          <div className="rounded-[26px] p-4 mb-4 exion-fade flex items-center gap-3 overflow-hidden relative" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
            <div className="relative z-10">
              <div className="font-extrabold" style={{ fontSize: "20px", color: "#fff", ...font }}>Nouvelle <span style={{ background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>analyse</span></div>
              <p style={{ fontSize: "12.5px", color: C.onDarkMuted, ...font }}>Remplis les informations pour obtenir ton analyse complète.</p>
            </div>
            <img src={HOUSE_IMG} alt="" className="w-28 shrink-0 ml-auto pointer-events-none select-none" />
          </div>
        )}

        {step === 1 && (
          <div className="mb-4 exion-fade">
            <div className="font-semibold uppercase tracking-wide mb-2 px-1" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Ton projet</div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "invest", icon: TrendingUp, titre: "Investir", sous: "Louer le bien : rentabilité, cash-flow" },
                { id: "rp", icon: Key, titre: "Acheter pour y vivre", sous: "Bon prix ? Coût réel, budget, impôts" },
              ].map((m) => {
                const actif = f.mode === m.id;
                return (
                  <button key={m.id} type="button" onClick={() => choisirMode(m.id)} className="text-left rounded-2xl p-3 exion-press"
                    style={{ background: actif ? C.gradientSoft : "#161B38", border: actif ? "1.5px solid #8B5CF6" : "1px solid #2A3A5C" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <m.icon size={15} color={actif ? "#14F1D9" : C.onDarkMuted} />
                      <span className="font-bold" style={{ fontSize: "13.5px", color: actif ? "#fff" : C.onDark, ...font }}>{m.titre}</span>
                    </div>
                    <span style={{ fontSize: "11px", lineHeight: "1.35", color: C.onDarkMuted, ...font }}>{m.sous}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Stepper step={step} onGoTo={setStep} etapes={etapes} />

        {step === 1 && (
          <div className="rounded-[26px] p-4 mb-2.5 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
            <div className="flex items-center gap-2 mb-3">
              <HomeIcon size={16} color="#8B5CF6" />
              <span className="font-bold uppercase tracking-wide" style={{ fontSize: "13px", color: "#fff", ...font }}>Le bien</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ville *" error={erreurs.ville}><TextInput value={f.ville} onChange={set("ville")} placeholder="Cabasse" /></Field>
              <Field label="Code postal *" error={erreurs.codePostal}><TextInput value={f.codePostal} onChange={set("codePostal")} placeholder="83340" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type de bien"><Select value={f.typeBien} onChange={set("typeBien")}><option>Appartement</option><option>Maison</option></Select></Field>
              <Field label="Surface (m²) *" error={erreurs.surface}><TextInput type="number" value={f.surface} onChange={set("surface")} placeholder="42" /></Field>
            </div>
            <Field label={<span className="inline-flex items-center gap-1">Pièces <InfoTip text="T1 = studio (1 pièce principale, coin nuit séparé ou non). T2 = 2 pièces (1 chambre + séjour). T3 = 3 pièces (2 chambres + séjour). T4 = 4 pièces (3 chambres + séjour), et ainsi de suite. Le T désigne le nombre de pièces principales, hors cuisine, salle de bain et WC." /></span>}>
              <Select value={f.nbPieces} onChange={set("nbPieces")}>
                <option value="">Non renseigné</option>
                <option value="T1">T1 (studio)</option>
                <option value="T2">T2 (2 pièces, 1 chambre)</option>
                <option value="T3">T3 (3 pièces, 2 chambres)</option>
                <option value="T4">T4 (4 pièces, 3 chambres)</option>
                <option value="T5">T5 (5 pièces, 4 chambres)</option>
                <option value="T6+">T6 et plus (6 pièces ou plus, 5 chambres et plus)</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Extérieur"><Select value={f.exterieurType} onChange={set("exterieurType")}><option>Aucun</option><option>Balcon</option><option>Terrasse</option><option>Jardin</option></Select></Field>
              {f.exterieurType && f.exterieurType !== "Aucun" && (
                <Field label="Surface extérieur (m²)"><TextInput type="number" value={f.exterieurSurface} onChange={set("exterieurSurface")} placeholder="10" /></Field>
              )}
            </div>
            <Field label="Prix affiché (€) *" error={erreurs.prix}><TextInput type="number" value={f.prix} onChange={set("prix")} placeholder="60450" /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-[26px] p-4 mb-2.5 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={16} color="#8B5CF6" />
              <span className="font-bold uppercase tracking-wide" style={{ fontSize: "13px", color: "#fff", ...font }}>État & travaux</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Copropriété"><Select value={f.copropriete} onChange={set("copropriete")}><option>Non</option><option>Oui</option></Select></Field>
              <Field label="DPE"><Select value={f.dpe} onChange={set("dpe")}>{["Inconnu", "A", "B", "C", "D", "E", "F", "G"].map((d) => <option key={d}>{d}</option>)}</Select></Field>
            </div>
            <Field label="Ancien ou neuf"><Select value={f.ancienNeuf} onChange={set("ancienNeuf")}><option>Ancien</option><option>Neuf</option></Select></Field>

            <div className="flex items-center justify-between mt-2 mb-2 pt-3" style={{ borderTop: "1px solid #22304C" }}>
              <span className="font-semibold uppercase tracking-wide" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Travaux à prévoir — coche ce qu'il faut faire</span>
              <span className="font-extrabold" style={{ fontSize: "15px", color: C.green, ...font }}>{fmt(budgetTravauxForm)}</span>
            </div>
            {surfTravaux <= 0 && <p className="mb-2" style={{ fontSize: "11.5px", color: "#FBBF24", ...font }}>Renseigne la surface à l'étape 1 pour calculer les montants au m².</p>}
            <ChecklistTravaux coche={travaux.coche} toggle={toggleForm} tarifs={travaux.tarifs} setTarifs={setTarifsForm} nbMenuiseries={travaux.nbMenuiseries} setNbMenuiseries={setNbMenuiseriesForm} prixMenuiserie={travaux.prixMenuiserie} setPrixMenuiserie={setPrixMenuiserieForm} montantPoste={montantPosteForm} />
          </div>
        )}

        {step === 3 && (
          <div className="rounded-[26px] p-4 mb-2.5 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={16} color="#8B5CF6" />
              <span className="font-bold uppercase tracking-wide" style={{ fontSize: "13px", color: "#fff", ...font }}>Financement</span>
            </div>
            <Field label="Crédit autorisé par la banque (optionnel)"><TextInput type="number" value={f.creditAutorise} onChange={set("creditAutorise")} placeholder="90000" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apport (€)"><TextInput type="number" value={f.apport} onChange={set("apport")} placeholder="10000" /></Field>
              <Field label="Taux crédit bancaire (%)"><TextInput type="number" step="0.1" value={f.taux} onChange={set("taux")} placeholder="Ex : 4" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Durée (années)"><TextInput type="number" value={f.duree} onChange={set("duree")} /></Field>
              <Field label="Assurance %/an (opt.)"><TextInput type="number" step="0.05" value={f.tauxAssurance} onChange={set("tauxAssurance")} placeholder="0.3" /></Field>
            </div>
          </div>
        )}

        {step === 4 && estRP && (
          <div className="rounded-[26px] p-4 mb-2.5 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={16} color="#8B5CF6" />
              <span className="font-bold uppercase tracking-wide" style={{ fontSize: "13px", color: "#fff", ...font }}>Ton budget</span>
            </div>
            <p className="-mt-1 mb-3" style={{ fontSize: "11.5px", color: C.onDarkMuted, ...font }}>
              Tout est optionnel. Plus tu en remplis, plus l'analyse est précise.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Revenus nets du foyer (€/mois)"><TextInput type="number" value={f.revenusFoyer} onChange={set("revenusFoyer")} placeholder="3200" /></Field>
              <Field label={<span className="inline-flex items-center gap-1">Crédits en cours (€/mois) <InfoTip text="Toutes les mensualités que tu continueras à payer après l'achat : crédit voiture (ou LOA/LLD), crédit conso ou renouvelable, prêt étudiant, crédit d'un autre bien que tu gardes (locatif, résidence secondaire), pension alimentaire versée. Ne mets PAS : le crédit de ce bien (calculé automatiquement), le crédit d'un logement que tu revends pour acheter celui-ci, ni ton loyer actuel." /></span>}><TextInput type="number" value={f.creditsEnCours} onChange={set("creditsEnCours")} placeholder="0" /></Field>
            </div>
            <p className="-mt-2 mb-3" style={{ fontSize: "11.5px", color: C.textMuted, ...font }}>
              Sert à calculer ton taux d'endettement et ce qu'il te reste pour vivre. Crédits en cours : voiture, conso, prêt étudiant, autre bien que tu gardes… mais pas le crédit de ce bien, ni ton loyer actuel.
            </p>
            <Field label="Taxe foncière si tu la connais (€/an)"><TextInput type="number" value={f.taxeFonciereConnue} onChange={set("taxeFonciereConnue")} placeholder="Estimée automatiquement si vide" /></Field>
            {f.copropriete === "Oui" && (
              <Field label="Charges de copropriété si tu les connais (€/mois)"><TextInput type="number" value={f.chargesCoproConnues} onChange={set("chargesCoproConnues")} placeholder="Estimées automatiquement si vide" /></Field>
            )}
            <Field label="Prix que tu comptes proposer (optionnel)"><TextInput type="number" value={f.prixSimulation} onChange={set("prixSimulation")} placeholder="Sinon, le prix affiché est utilisé" /></Field>
          </div>
        )}

        {step === 4 && !estRP && (
          <div className="rounded-[26px] p-4 mb-2.5 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} color="#8B5CF6" />
              <span className="font-bold uppercase tracking-wide" style={{ fontSize: "13px", color: "#fff", ...font }}>Fiscalité & usage</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Usage"><Select value={f.usage} onChange={set("usage")}><option>Investissement locatif</option><option>Revente</option></Select></Field>
              <Field label="TMI (tranche d'imposition)"><Select value={f.tmi} onChange={set("tmi")}><option value="">Non renseignée</option><option>0%</option><option>11%</option><option>30%</option><option>41%</option><option>45%</option></Select></Field>
            </div>
            <p className="-mt-2 mb-3" style={{ fontSize: "11.5px", color: C.textMuted, ...font }}>
              La TMI, c'est le taux d'impôt sur la tranche la plus haute de tes revenus (0/11/30/41/45%). Elle sert à calculer l'impôt sur tes futurs loyers. Elle figure sur ton dernier avis d'imposition.
            </p>
            <Field label="Loyer visé €/mois (optionnel)"><TextInput type="number" value={f.loyerVise} onChange={set("loyerVise")} placeholder="Estimé automatiquement si vide" /></Field>
            <Field label="Prix de simulation si différent (optionnel)"><TextInput type="number" value={f.prixSimulation} onChange={set("prixSimulation")} placeholder="Sinon, le prix affiché est utilisé" /></Field>
          </div>
        )}

        {etapes.filter((e) => e.id > step).map((e) => <EtapeVerrouillee key={e.id} label={e.label} icon={e.icon} />)}

        <PrimaryButton disabled={chargement} onClick={suivant} className="mt-1">
          {chargement ? <><Loader2 size={18} className="animate-spin" /> Calcul en cours…</>
            : step < 4 ? <>Continuer <ArrowRight size={17} /></>
            : <><Calculator size={18} /> Lancer l'analyse</>}
        </PrimaryButton>
      </div>
    </div>
  );
}

function InfoTip({ text }) {
  const [ouvert, setOuvert] = useState(false);
  const btnRef = useRef(null);
  const [style, setStyle] = useState({});
  useEffect(() => {
    if (!ouvert || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const largeur = Math.min(240, window.innerWidth - 24);
    let left = rect.left;
    if (left + largeur > window.innerWidth - 12) left = window.innerWidth - largeur - 12;
    if (left < 12) left = 12;
    setStyle({ left, top: rect.bottom + 6, width: largeur });
  }, [ouvert]);
  return (
    <span className="relative inline-flex">
      <button ref={btnRef} onClick={(e) => { e.stopPropagation(); setOuvert((v) => !v); }} className="flex items-center justify-center" style={{ width: 16, height: 16 }} aria-label="Explication">
        <Info size={13} color={C.onDarkMuted} />
      </button>
      {ouvert && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 999998 }} onClick={(e) => { e.stopPropagation(); setOuvert(false); }} />
          <div className="exion-pop fixed p-3 rounded-2xl" style={{ ...style, zIndex: 999999, background: "#0E1130", border: "1px solid #3A3D6B", boxShadow: "0 10px 28px rgba(0,0,0,0.4)" }}>
            <p style={{ fontSize: "11.5px", lineHeight: "1.5", color: C.onDark, ...font }}>{text}</p>
          </div>
        </>,
        document.body
      )}
    </span>
  );
}

function MiniStat({ icon: Icon, iconColor, label, value, spark, info }) {
  return (
    <div className="rounded-2xl p-3.5 relative" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={14} color={iconColor} />}
        <span style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>{label}</span>
        {info && <InfoTip text={info} />}
      </div>
      <div className="font-extrabold" style={{ fontSize: "20px", color: iconColor, ...font }}>{value}</div>
      {spark && <SparkChart />}
    </div>
  );
}

function ResumeLigne({ icon: Icon, label, valeur, info }) {
  return (
    <div className="flex items-center gap-2.5 py-2" style={{ borderBottom: "1px solid #22304C" }}>
      <Icon size={14} color={C.onDarkMuted} className="shrink-0" />
      <span className="flex-1 flex items-center gap-1.5" style={{ fontSize: "13px", color: C.onDarkMuted, ...font }}>
        {label}
        {info && <InfoTip text={info} />}
      </span>
      <span className="font-semibold" style={{ fontSize: "13px", color: "#fff", ...font }}>{valeur}</span>
    </div>
  );
}

function analyseIA(r) {
  const phrases = [];
  if (r.scoreGlobal >= 70) phrases.push(`Ce bien présente un excellent potentiel avec un score de ${r.scoreGlobal}/100.`);
  else if (r.scoreGlobal >= 45) phrases.push(`Ce bien est à négocier : le score de ${r.scoreGlobal}/100 laisse une marge d'amélioration.`);
  else phrases.push(`Ce bien est risqué en l'état, avec un score de seulement ${r.scoreGlobal}/100.`);
  phrases.push(r.cashFlowMensuel >= 0 ? `Le cash-flow est positif (+${fmt(r.cashFlowMensuel)}/mois), le projet s'autofinance.` : `Le cash-flow est négatif (${fmt(r.cashFlowMensuel)}/mois), à compenser de votre poche.`);
  if (r.postesTravaux.length) phrases.push(`Les travaux estimés (${fmt(r.travauxProbable)}) permettront d'optimiser la valorisation et le loyer potentiel.`);
  return phrases.join(" ");
}

function VueResultat({ r, onDiscuter, onBack, onVoirDetail, verrouille, onDebloquer }) {
  const [detailOuvert, setDetailOuvert] = useState(false);
  const [voirEnrichissement, setVoirEnrichissement] = useState(false);
  const [voirCashflowDetail, setVoirCashflowDetail] = useState(false);
  const [editionLoyer, setEditionLoyer] = useState(false);
  const [loyerCorrige, setLoyerCorrige] = useState("");
  if (!r) return null;
  const loyerEffectif = Number(loyerCorrige) > 0 ? Number(loyerCorrige) : r.loyerRetenu;
  const cashFlowEffectif = r.cashFlowMensuel + (loyerEffectif - r.loyerRetenu);
  const excellent = r.scoreGlobal >= 70 && cashFlowEffectif >= 0;
  const bonPrixMaisCashflowNeg = r.scoreGlobal >= 70 && cashFlowEffectif < 0;
  const badgeColor = excellent ? "#4ADE80" : (bonPrixMaisCashflowNeg || r.scoreGlobal >= 45) ? "#FBBF24" : "#F87171";
  const badgeLabel = excellent ? "Excellent investissement" : bonPrixMaisCashflowNeg ? "Bon prix, mais cash-flow négatif" : r.scoreGlobal >= 45 ? "Investissement à négocier" : "Investissement risqué";

  // tableau d'enrichissement : cash-flow + capital rembourse (equite) cumules, annee par annee
  const tauxMensuelR = r.taux / 100 / 12;
  let soldeR = r.capitalEmprunte;
  let cumulR = 0;
  const tableauEnrichissement = [];
  for (let annee = 1; annee <= r.duree; annee++) {
    let capitalRembourseAnnee = 0;
    for (let m = 0; m < 12 && soldeR > 0; m++) {
      const intMois = soldeR * tauxMensuelR;
      const capMois = Math.min(r.mensualite - intMois, soldeR);
      capitalRembourseAnnee += capMois;
      soldeR -= capMois;
    }
    const cashFlowAnnuel = cashFlowEffectif * 12;
    cumulR += cashFlowAnnuel + capitalRembourseAnnee;
    tableauEnrichissement.push({ annee, cashFlowAnnuel, capitalRembourseAnnee: Math.round(capitalRembourseAnnee), cumul: Math.round(cumulR) });
  }
  const cashFlowApresCredit = cashFlowEffectif + r.mensualiteAvecAssurance;

  return (
    <div>
      <div className="flex items-center justify-between px-5 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Retour"><ArrowLeft size={20} color={C.onDark} /></button>
          <span className="font-bold uppercase tracking-wide" style={{ fontSize: "13px", color: C.onDark, ...font }}>Résultats de l'analyse</span>
        </div>
        <Share2 size={18} color={C.onDarkMuted} />
      </div>

      <div className="px-5 pb-24 pt-2 space-y-2.5">
        <div className="rounded-[26px] p-4 exion-fade relative overflow-hidden" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-semibold uppercase tracking-wide" style={{ fontSize: "11.5px", color: C.onDarkMuted, ...font }}>Score Exion</span>
                <InfoTip text="Ce score combine 4 critères à poids égal-ish : prix vs marché (30%), cash-flow (30%), travaux (20%) et risque/DPE (20%). Un bon score ne veut pas forcément dire que le cash-flow est positif — un très bon prix peut compenser un cash-flow négatif dans la note globale." />
              </div>
              <div className="font-extrabold leading-none" style={{ fontSize: "40px", background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", ...font }}>
                {r.scoreGlobal}<span style={{ fontSize: "17px", color: C.onDarkMuted, WebkitTextFillColor: C.onDarkMuted }}>/100</span>
              </div>
              <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full font-semibold" style={{ fontSize: "11px", background: `${badgeColor}24`, color: badgeColor, ...font }}>
                ★ {badgeLabel}
              </span>
            </div>
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                <defs>
                  <linearGradient id="resScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14F1D9" /><stop offset="55%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="44" fill="none" stroke="#22304C" strokeWidth="6" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="url(#resScoreGrad)" strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray={`${r.scoreGlobal} 100`} />
              </svg>
              <img src={HOUSE_IMG} alt="" className="absolute inset-0 m-auto w-16 pointer-events-none select-none" />
            </div>
          </div>
        </div>

        <div className="rounded-[22px] p-4 exion-fade" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.16), rgba(20,241,217,0.08))", border: "1px solid #3A3D6B" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target size={14} color="#A855F7" />
            <span className="font-semibold uppercase tracking-wide" style={{ fontSize: "11.5px", color: "#C4B5FD", ...font }}>Prix/m² à ne pas dépasser</span>
            <InfoTip text="Le prix au m² maximum pour que ce bien reste au moins à cash-flow neutre (0€/mois), à loyer, apport, taux et durée de prêt identiques. Ce chiffre n'a pas de lien direct avec le prix du marché : une durée de prêt courte, par exemple, peut le rendre bien plus bas que le prix de marché même sur un bon secteur. Au-delà, le projet te coûte de l'argent chaque mois." />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-extrabold leading-none" style={{ fontSize: "26px", color: "#fff", ...font }}>{fmt(r.prixM2MaxRentable)}<span style={{ fontSize: "14px", color: C.onDarkMuted }}>/m²</span></div>
 <div className="mt-1" style={{ fontSize: "11.5px", color: C.onDarkMuted, ...font }}>soit {fmt(r.prixMaxRentable)} au total</div>
 <div className="mt-0.5" style={{ fontSize: "10.5px", color: C.onDarkMuted, opacity: 0.75, ...font }}>Hypothèses : prêt sur {r.duree} ans à {r.taux}%</div>
            </div>
            <span className="font-semibold px-2.5 py-1 rounded-full text-right" style={{ fontSize: "11px", background: r.prixM2Annonce > r.prixM2MaxRentable ? "rgba(239,68,68,0.16)" : "rgba(34,197,94,0.16)", color: r.prixM2Annonce > r.prixM2MaxRentable ? "#F87171" : C.green, ...font }}>
              {r.prixM2Annonce > r.prixM2MaxRentable ? `${fmt(r.prixM2Annonce - r.prixM2MaxRentable)}/m² de trop` : "Prix actuel dans le budget ✓"}
            </span>
          </div>
        </div>

        <div className="font-semibold uppercase tracking-wide px-1" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Rentabilité</div>
        <div className="grid grid-cols-2 gap-2.5">
          <MiniStat icon={TrendingUp} iconColor={C.green} label="Rentabilité brute" value={`${r.rendementBrut.toFixed(2).replace(".", ",")} %`} spark
            info="Calculée sur le prix d'achat seul : (loyer annuel ÷ prix d'achat) × 100. Ne tient compte ni des frais de notaire, ni des travaux, ni des charges — c'est la version optimiste, souvent utilisée par les agences." />
          <MiniStat icon={SlidersHorizontal} iconColor="#8B5CF6" label="Rentabilité nette" value={`${r.rentabiliteNette.toFixed(2).replace(".", ",")} %`} spark
            info="Calculée sur l'investissement total (prix + notaire + travaux), après déduction de la taxe foncière, des impôts et de l'assurance. Plus basse que la brute, mais plus proche de la réalité." />
          <div className="rounded-2xl p-3.5 relative" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <HomeIcon size={14} color="#F59E0B" />
              <span style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>{Number(loyerCorrige) > 0 ? "Loyer que tu connais" : "Loyer mensuel estimé"}</span>
              <InfoTip text={r.sourceLoyerEstimation === "commune"
                ? "Estimation basée sur les données réelles du Ministère du Logement, à l'échelle de cette commune précise (pas juste le département). C'est la source la plus fiable de l'appli."
                : r.sourceLoyerEstimation === "gouv"
                ? "Estimation basée sur les données réelles du Ministère du Logement (moyenne du département, la commune précise n'était pas dans la base). Corrige avec le crayon si tu connais le vrai loyer local."
                : r.sourceLoyerEstimation === "IA"
                ? "Estimation générée par IA à partir de sa connaissance du marché locatif de cette ville et de ce code postal. Reste indicatif — si tu connais le vrai loyer pratiqué (agence, voisinage...), corrige-le avec le crayon."
                : "Aucune donnée disponible pour ce secteur : estimation de repli par grille nationale. Corrige avec le crayon si tu connais le vrai loyer local."} />
              <button onClick={() => setEditionLoyer((v) => !v)} className="ml-auto"><Pencil size={13} color="#8B5CF6" /></button>
            </div>
            {editionLoyer ? (
              <input type="number" autoFocus value={loyerCorrige} onChange={(e) => setLoyerCorrige(e.target.value)} placeholder={String(r.loyerRetenu)}
                style={{ background: "transparent", border: "none", outline: "none", padding: 0, width: "100%", color: "#F59E0B", ...font }} className="font-extrabold text-[20px]" />
            ) : (
              <div className="font-extrabold" style={{ fontSize: "20px", color: "#F59E0B", ...font }}>{fmt(loyerEffectif)}</div>
            )}
          </div>
          <MiniStat icon={Wallet} iconColor={cashFlowEffectif >= 0 ? C.green : "#F87171"} label="Cash-flow mensuel" value={`${cashFlowEffectif >= 0 ? "+" : ""}${fmt(cashFlowEffectif)}`}
            info="Ce qu'il te reste (ou ce que tu sors de ta poche) chaque mois : loyer encaissé moins mensualité de crédit, charges, taxe foncière, provisions et impôts." />
        </div>

        {verrouille ? <CarteVerrou onDebloquer={onDebloquer} /> : (<>
        <button onClick={() => setVoirCashflowDetail((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 rounded-2xl exion-press" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <span className="flex items-center gap-2 font-semibold" style={{ fontSize: "13px", color: C.onDark, ...font }}><Calculator size={15} color="#8B5CF6" /> Voir le calcul du cash-flow</span>
          <ChevronRight size={16} color={C.onDarkMuted} style={{ transform: voirCashflowDetail ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
        </button>
        {voirCashflowDetail && (
          <div className="rounded-[22px] p-4 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
            <ResumeLigne icon={PiggyBank} label="Loyer encaissé" valeur={`+${fmt(loyerEffectif)}`} />
            {r.exterieurType !== "Aucun" && r.bonusExterieurPct > 0 && (
              <ResumeLigne icon={TrendingUp} label={`Bonus ${r.exterieurType.toLowerCase()} (${r.exterieurSurface} m²)`} valeur={`+${Math.round(r.bonusExterieurPct * 100)}% sur le loyer`} info="Un extérieur augmente la valeur locative. Ce bonus est déjà inclus dans le loyer encaissé ci-dessus." />
            )}
            <ResumeLigne icon={Landmark} label="Mensualité (crédit + assurance)" valeur={`-${fmt(r.mensualiteAvecAssurance)}`} />
            <ResumeLigne icon={FileText} label="Taxe foncière" valeur={`-${fmt(Math.round(r.taxeFonciereEstimee / 12))}`} />
            {r.chargesCopro > 0 && <ResumeLigne icon={Building2} label="Charges de copropriété" valeur={`-${fmt(r.chargesCopro)}`} />}
            <ResumeLigne icon={ShieldCheck} label="Assurance PNO" valeur={`-${fmt(r.assurancePNO)}`} />
            <ResumeLigne icon={Wrench} label="Provision entretien" valeur={`-${fmt(r.provisionEntretien)}`} info="Provision de 7% du loyer pour couvrir l'entretien courant et les petites réparations." />
            <ResumeLigne icon={AlertTriangle} label="Provision vacance locative" valeur={`-${fmt(r.vacanceLocativeMensuelle)}`} info="Provision de 4% du loyer pour couvrir les périodes sans locataire entre deux baux." />
            {r.tmiConnue && <ResumeLigne icon={Calculator} label="Impôts + prélèvements sociaux" valeur={`-${fmt(r.impotMensuel)}`} />}
            <div className="flex items-center justify-between pt-2.5 mt-1" style={{ borderTop: "1px solid #2A3A5C" }}>
              <span className="font-bold" style={{ fontSize: "14px", color: "#fff", ...font }}>Cash-flow net</span>
              <span className="font-extrabold" style={{ fontSize: "16px", color: cashFlowEffectif >= 0 ? C.green : "#F87171", ...font }}>{cashFlowEffectif >= 0 ? "+" : ""}{fmt(cashFlowEffectif)}</span>
            </div>
          </div>
        )}

        <div className="rounded-[26px] p-4 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="font-semibold uppercase tracking-wide mb-1" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Résumé financier</div>
          <ResumeLigne icon={HomeIcon} label="Prix d'achat (FAI)" valeur={fmt(r.prixAnnonce)} />
          <ResumeLigne icon={FileText} label="Frais de notaire" valeur={fmt(r.fraisNotaire)} />
          <ResumeLigne icon={Wrench} label="Travaux à prévoir" valeur={fmt(r.travauxProbable)} />
          <ResumeLigne icon={PieChart} label="Investissement total" valeur={fmt(r.budgetTotalProbable)} info="Prix d'achat + frais de notaire + budget travaux. C'est la somme totale mobilisée pour ce projet." />
          <div className="h-2" />
          <ResumeLigne icon={Landmark} label="Mensualité de crédit" valeur={`${fmt(r.mensualiteAvecAssurance)} / mois`} />
          <ResumeLigne icon={Calculator} label="Coût total du crédit" valeur={fmt(r.coutTotalCreditReel)} />
          <ResumeLigne icon={Calendar} label="Durée du prêt" valeur={`${r.duree} ans`} />
          <ResumeLigne icon={TrendingUp} label="Taux d'intérêt" valeur={`${r.taux} %`} />
          <div style={{ borderBottom: "none" }}><ResumeLigne icon={Info} label="Assurance" valeur={`${r.tauxAssurance} % / an`} /></div>
        </div>

        <div className="rounded-[26px] p-4 exion-fade" style={{ background: "linear-gradient(135deg, rgba(20,241,217,0.10), rgba(139,92,246,0.10))", border: "1px solid #3A3D6B" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={15} color="#A855F7" />
            <span className="font-bold" style={{ fontSize: "13px", color: "#C4B5FD", ...font }}>Analyse IA</span>
          </div>
          <p style={{ fontSize: "13px", lineHeight: "1.5", color: "#D8D4F0", ...font }}>{analyseIA(r)}</p>
        </div>

        <button onClick={() => setDetailOuvert((v) => !v)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-white exion-press" style={{ fontSize: "14.5px", background: C.gradient, boxShadow: "0 8px 22px rgba(139,92,246,0.35)", ...font }}>
          {detailOuvert ? "Masquer" : "Voir"} le détail complet <ChevronRight size={17} />
        </button>

        {detailOuvert && (
          <div className="exion-fade space-y-2.5 pt-1">
            <Section icon={TrendingUp} title="Prix vs marché">
              <Ligne label="Prix affiché" valeur={`${fmt(r.prixAnnonce)}`} sub={`${fmt(r.prixM2Annonce)}/m²`} />
              <Ligne label="Prix marché" valeur={`${fmt(r.prixM2Marche.valeur)}/m²`} sub={libelleSourceMarche(r.prixM2Marche)} />
              <Ligne label="Écart" valeur={`${r.ecartMarchePct > 0 ? "+" : ""}${r.ecartMarchePct}%`} accent={r.ecartMarchePct < 0 ? C.greenDark : C.red} />
              <Ligne label="Max pour cash-flow neutre" valeur={`${fmt(r.prixM2MaxRentable)}/m²`} accent="#A855F7" />
            </Section>
            <Section icon={Hammer} title="Budget travaux">
 <p className="mb-2" style={{ fontSize: '13px', color: C.onDarkMuted, ...font }}>{r.postesTravaux.length ? r.postesTravaux.join(", ") : "Aucun poste détecté"}</p>
              <Ligne label="Fourchette" valeur={`${fmt(r.travauxMin)} → ${fmt(r.travauxMax)}`} />
            </Section>
            <Section icon={Wallet} title="Fiscalité & loyer">
              <Ligne label="Taxe foncière" valeur={`${fmt(r.taxeFonciereEstimee)}/an`} />
              <Ligne label="Impôt + prélèvements sociaux" valeur={r.tmiConnue ? `${fmt(r.impotAnnuel)}/an` : "TMI non renseignée"} />
            </Section>
            <Section icon={ListChecks} title="Revente estimée">
              <Ligne label="Fourchette" valeur={`${fmt(r.reventeMin)} → ${fmt(r.reventeMax)}`} />
            </Section>

            <Section icon={TrendingUp} title="Enrichissement au fil des années">
 <p className="mb-3" style={{ fontSize: '13px', color: C.onDarkMuted, ...font }}>
                Même si le cash-flow ne bouge pas, tu t'enrichis chaque année grâce au crédit que tu rembourses petit à petit.
              </p>
              <button onClick={() => setVoirEnrichissement((v) => !v)} className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white exion-press mb-1" style={{ fontSize: "13.5px", background: C.gradient, ...font }}>
                {voirEnrichissement ? "Masquer" : "Voir"} le détail année par année
              </button>
              {voirEnrichissement && (
                <div className="overflow-x-auto mt-2 exion-fade">
                  <div className="mb-3 p-3 rounded-2xl" style={{ background: "#12142F", border: "1px solid #2A3A5C" }}>
                    <p style={{ fontSize: "12px", lineHeight: "1.6", color: C.onDark, ...font }}>
                      <strong style={{ color: "#fff" }}>Cash-flow</strong> = l'argent qui sort de ta poche chaque année (négatif = ça te coûte).<br />
                      <strong style={{ color: "#fff" }}>Équité gagnée</strong> = la part du crédit que tu rembourses cette année-là. Ce n'est pas de l'argent en poche, mais elle devient "à toi" : c'est comme rembourser ta propre épargne plutôt que de la dépenser.<br />
                      <strong style={{ color: "#fff" }}>Total cumulé</strong> = Cash-flow + Équité, additionnés année après année. C'est ta vraie richesse accumulée sur ce bien.
                    </p>
                  </div>
                  <table className="w-full" style={{ fontSize: "12px", color: C.onDark, ...font }}>
                    <thead>
                      <tr style={{ color: C.onDarkMuted }}>
                        <th className="text-left py-1.5">Année</th>
                        <th className="text-right py-1.5">Cash-flow</th>
                        <th className="text-right py-1.5">Équité gagnée</th>
                        <th className="text-right py-1.5">Total cumulé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableauEnrichissement.map((l) => (
                        <tr key={l.annee} style={{ borderTop: "1px solid #22304C" }}>
                          <td className="py-1.5">{l.annee}</td>
                          <td className="text-right py-1.5" style={{ color: l.cashFlowAnnuel >= 0 ? C.green : "#F87171" }}>{l.cashFlowAnnuel >= 0 ? "+" : ""}{fmt(l.cashFlowAnnuel)}</td>
                          <td className="text-right py-1.5">+{fmt(l.capitalRembourseAnnee)}</td>
                          <td className="text-right py-1.5 font-semibold" style={{ color: l.cumul >= 0 ? C.green : "#F87171" }}>{l.cumul >= 0 ? "+" : ""}{fmt(l.cumul)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>
                    Après {r.duree} ans, le crédit est remboursé : ton cash-flow mensuel passe alors à <strong style={{ color: C.green }}>{cashFlowApresCredit >= 0 ? "+" : ""}{fmt(cashFlowApresCredit)}/mois</strong> (tu ne payes plus de mensualité).
                  </p>
                  <div className="mt-3 p-3.5 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(20,241,217,0.12), rgba(139,92,246,0.12))", border: "1px solid #3A3D6B" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={14} color="#A855F7" />
                      <span className="font-bold" style={{ fontSize: "12.5px", color: "#C4B5FD", ...font }}>Patrimoine total après {r.duree} ans</span>
                    </div>
                    <ResumeLigne icon={Wallet} label="Cash-flow + capital remboursé" valeur={fmt(tableauEnrichissement[tableauEnrichissement.length - 1]?.cumul || 0)} />
                    <ResumeLigne icon={HomeIcon} label="Valeur du bien (estimée aujourd'hui)" valeur={fmt(Math.round((r.reventeMin + r.reventeMax) / 2))} info="Estimation à date, sans hypothèse de revalorisation sur la durée — une projection prudente." />
                    <div className="flex items-center justify-between pt-2.5 mt-1" style={{ borderTop: "1px solid #3A3D6B" }}>
                      <span className="font-bold" style={{ fontSize: "14px", color: "#fff", ...font }}>Patrimoine net créé</span>
                      <span className="font-extrabold" style={{ fontSize: "17px", color: "#14F1D9", ...font }}>{fmt((tableauEnrichissement[tableauEnrichissement.length - 1]?.cumul || 0) + Math.round((r.reventeMin + r.reventeMax) / 2))}</span>
                    </div>
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}

        </>)}

        <button onClick={onDiscuter} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold" style={{ fontSize: "14.5px", background: C.bgSoft, color: C.onDark, border: `1px solid #2A3A5C`, ...font }}>
          <MessageCircle size={18} /> Poser une question sur ce bien
        </button>
        <p className="text-center mt-1" style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>Estimations indicatives. À vérifier : devis réels, avis d'imposition, syndic, PLU.</p>
      </div>
    </div>
  );
}

/* ============================================================
   RÉSULTAT « ACHETER POUR Y VIVRE »
============================================================ */

const COULEUR_VERDICT_RP = {
  "Bonne affaire": "#4ADE80",
  "Prix correct": "#4ADE80",
  "Un peu au-dessus du marché": "#FBBF24",
  "Au-dessus du marché": "#F87171",
  "Prix à vérifier": "#9CA3AF",
};

function analyseIARP(r) {
  const phrases = [];
  if (!r.marcheFiable) phrases.push("Pas assez de ventes récentes trouvées dans la commune : impossible de dire si le prix est bon. Compare avec les annonces et les ventes du secteur.");
  else if (r.ecartMarchePct <= -7) phrases.push(`Le prix est ${Math.abs(r.ecartMarchePct)} % sous le marché du secteur : c'est une bonne affaire sur le papier, vérifie qu'il n'y a pas de défaut caché.`);
  else if (r.ecartMarchePct <= 5) phrases.push("Le prix est dans la moyenne du secteur.");
  else phrases.push(`Le prix est ${r.ecartMarchePct} % au-dessus du marché : tu as de bons arguments pour négocier.`);
  phrases.push(`En tout, ce logement te coûtera environ ${fmt(r.coutTotalMensuel)} par mois, dont ${fmt(r.coutPossessionMensuel)} de frais en plus du crédit.`);
  if (r.passoire) phrases.push("Le DPE est mauvais : prévois une facture d'énergie élevée et des travaux d'isolation.");
  if (r.tauxEndettement !== null) {
    phrases.push(r.tauxEndettement <= 35
      ? `Ton taux d'endettement serait de ${String(r.tauxEndettement).replace(".", ",")} %, sous la limite de 35 % des banques.`
      : `Ton taux d'endettement serait de ${String(r.tauxEndettement).replace(".", ",")} %, au-dessus de la limite de 35 % : les banques risquent de refuser.`);
  }
  return phrases.join(" ");
}

function CarteProRP({ onPasserPro }) {
  const avantages = [
    "Le prix à proposer pour négocier",
    "Le détail de toutes tes dépenses, mois par mois",
    "Les frais d'achat et le budget total",
    "Ton taux d'endettement et ton reste à vivre",
    "Impôts et taxes à payer chaque année",
    "Louer ou acheter : au bout de combien d'années c'est rentable",
  ];
  return (
    <div className="rounded-[26px] p-5 exion-fade relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(20,241,217,0.12), rgba(139,92,246,0.18))", border: "1px solid #3A3D6B" }}>
      <div className="flex items-center gap-2 mb-1">
        <Lock size={16} color="#C4B5FD" />
        <span className="font-bold" style={{ fontSize: "15px", color: "#fff", ...font }}>Débloque l'analyse acheteur complète</span>
      </div>
      <p className="mb-3" style={{ fontSize: "12.5px", color: C.onDarkMuted, lineHeight: "1.45", ...font }}>
        Avec le plan Pro, tu sais exactement ce que tu vas payer avant de signer.
      </p>
      <div className="space-y-2 mb-4">
        {avantages.map((a) => (
          <div key={a} className="flex items-start gap-2">
            <Check size={15} color={C.green} strokeWidth={3} className="shrink-0 mt-0.5" />
            <span style={{ fontSize: "13px", color: "#E5E7F5", lineHeight: "1.4", ...font }}>{a}</span>
          </div>
        ))}
      </div>
      <button onClick={() => { window.exionTrack?.("DeblocageRPClique"); onPasserPro(); }} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-white exion-press" style={{ fontSize: "14.5px", background: C.gradient, boxShadow: "0 8px 24px rgba(139,92,246,0.35)", ...font }}>
        Passer Pro <ChevronRight size={17} />
      </button>
      <p className="text-center mt-2" style={{ fontSize: "11.5px", color: C.onDarkMuted, ...font }}>Sans engagement · annulable à tout moment</p>
    </div>
  );
}

function VueResultatRP({ r, onDiscuter, onBack, pro, onPasserPro }) {
  const [parAn, setParAn] = useState(false);
  const [editionLoyer, setEditionLoyer] = useState(false);
  const [loyerCorrige, setLoyerCorrige] = useState("");
  if (!r) return null;
  const couleur = COULEUR_VERDICT_RP[r.verdict] || "#FBBF24";
  const k = parAn ? 12 : 1;
  const unite = parAn ? "/ an" : "/ mois";
  const loyerComparaison = Number(loyerCorrige) > 0 ? Number(loyerCorrige) : r.loyerMarche;
  const louerAcheter = simulerLouerAcheter(r, loyerComparaison);
  const reperes = louerAcheter.lignes.filter((l) => [5, 10, 15, 20, 25].includes(l.an));
  const te = r.tauxEndettement;
  const couleurTE = te === null ? C.onDark : te <= 33 ? C.green : te <= 35 ? "#FBBF24" : "#F87171";
  const pct = (n) => `${String(n).replace(".", ",")} %`;

  return (
    <div>
      <div className="flex items-center justify-between px-5 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Retour"><ArrowLeft size={20} color={C.onDark} /></button>
          <span className="font-bold uppercase tracking-wide" style={{ fontSize: "13px", color: C.onDark, ...font }}>Analyse acheteur</span>
        </div>
        <Key size={18} color={C.onDarkMuted} />
      </div>

      <div className="px-5 pb-24 pt-2 space-y-2.5">
        {/* Verdict prix */}
        <div className="rounded-[26px] p-4 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-semibold uppercase tracking-wide" style={{ fontSize: "11.5px", color: C.onDarkMuted, ...font }}>Ce bien est-il au bon prix ?</span>
              </div>
              <div className="font-extrabold leading-tight" style={{ fontSize: "24px", color: couleur, ...font }}>{r.verdict}</div>
              {r.marcheFiable ? (<>
              <div className="mt-1.5" style={{ fontSize: "13px", color: C.onDark, ...font }}>
                {r.ecartMarchePct > 0 ? "+" : ""}{r.ecartMarchePct} % par rapport au marché
              </div>
              <div style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>
                {r.ecartMarcheEuros > 0 ? `soit ${fmt(r.ecartMarcheEuros)} de plus que le prix du secteur` : `soit ${fmt(Math.abs(r.ecartMarcheEuros))} de moins que le prix du secteur`}
              </div>
              </>) : (
              <div className="mt-1.5" style={{ fontSize: "12.5px", color: C.onDarkMuted, ...font }}>
                Pas assez de ventes récentes trouvées pour comparer ce prix au marché.
              </div>
              )}
            </div>
            <div className="relative w-20 h-20 shrink-0 ml-2">
              <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#22304C" strokeWidth="7" />
                <circle cx="50" cy="50" r="44" fill="none" stroke={couleur} strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray={`${r.scoreGlobal} 100`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-extrabold leading-none" style={{ fontSize: "21px", color: "#fff", ...font }}>{r.scoreGlobal}</span>
                <span style={{ fontSize: "9.5px", color: C.onDarkMuted, ...font }}>/100</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 grid grid-cols-2 gap-2" style={{ borderTop: "1px solid #22304C" }}>
            <div>
              <div style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>Prix affiché</div>
              <div className="font-bold" style={{ fontSize: "14px", color: "#fff", ...font }}>{fmt(r.prixM2Annonce)}/m²</div>
            </div>
            <div>
              <div className="flex items-center gap-1" style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>
                Prix du marché
                <InfoTip text={r.marcheFiable
                  ? `Prix médian au m² : ${libelleSourceMarche(r.prixM2Marche)} (base DVF de l'État, même type de bien).`
                  : "Pas assez de ventes trouvées autour de ce bien : c'est une moyenne nationale, à prendre avec prudence."} />
              </div>
              <div className="font-bold" style={{ fontSize: "14px", color: "#fff", ...font }}>{fmt(r.prixM2Marche.valeur)}/m²</div>
            </div>
          </div>
          {!r.marcheFiable && (
            <div className="mt-2.5 flex items-start gap-2 p-2.5 rounded-xl" style={{ background: "rgba(251,191,36,0.10)" }}>
              <AlertTriangle size={14} color="#FBBF24" className="shrink-0 mt-0.5" />
              <span style={{ fontSize: "11.5px", color: "#FDE68A", ...font }}>Le prix du marché affiché est une moyenne nationale, ne t'y fie pas : compare avec les annonces du secteur.</span>
            </div>
          )}
        </div>

        {/* Coût réel mensuel (visible par tous) */}
        <div className="rounded-[26px] p-4 exion-fade" style={{ background: "linear-gradient(135deg, rgba(20,241,217,0.12), rgba(139,92,246,0.14))", border: "1px solid #3A3D6B" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet size={14} color="#14F1D9" />
            <span className="font-semibold uppercase tracking-wide" style={{ fontSize: "11.5px", color: "#A5F3FC", ...font }}>Ce que ce logement te coûtera vraiment</span>
            <InfoTip text="Crédit + assurance emprunteur + taxe foncière + charges + assurance habitation + énergie + eau + entretien. Ce sont des estimations : corrige-les avec tes vrais chiffres quand tu les as." />
          </div>
          <div className="font-extrabold leading-none" style={{ fontSize: "32px", color: "#fff", ...font }}>
            {fmt(r.coutTotalMensuel)}<span style={{ fontSize: "15px", color: C.onDarkMuted }}> / mois</span>
          </div>
          <div className="mt-1.5" style={{ fontSize: "12.5px", color: C.onDarkMuted, ...font }}>
            soit {fmt(r.coutTotalMensuel * 12)} par an · dont {fmt(r.mensualiteAvecAssurance)} de crédit et {fmt(r.coutPossessionMensuel)} de frais
          </div>
        </div>

        {!pro ? <CarteProRP onPasserPro={onPasserPro} /> : (<>
          {/* Prix conseillé */}
          <div className="rounded-[22px] p-4 exion-fade" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.16), rgba(20,241,217,0.08))", border: "1px solid #3A3D6B" }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target size={14} color="#A855F7" />
              <span className="font-semibold uppercase tracking-wide" style={{ fontSize: "11.5px", color: "#C4B5FD", ...font }}>Prix à proposer</span>
              <InfoTip text="Offre de départ conseillée : le plus bas entre le prix affiché moins 3 % (marge de négociation courante) et le prix du marché pour ce bien, avec une décote de 5 % si le DPE est F ou G. Ce n'est pas une expertise." />
            </div>
            <div className="font-extrabold leading-none" style={{ fontSize: "26px", color: "#fff", ...font }}>{fmt(r.prixConseille)}</div>
            <div className="mt-1" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>
              {r.margeNegociation > 0 ? `soit ${fmt(r.margeNegociation)} de moins que le prix affiché` : "Le prix affiché est déjà correct"}
            </div>
            <div className="mt-2.5 space-y-1.5">
              {r.marcheFiable && r.ecartMarchePct > 5 && <p style={{ fontSize: "12px", color: "#E5E7F5", ...font }}>• Argument : le bien est affiché {r.ecartMarchePct} % au-dessus des ventes du secteur.</p>}
              {r.passoire && <p style={{ fontSize: "12px", color: "#E5E7F5", ...font }}>• Argument : DPE {r.dpe}, isolation à refaire et bien moins recherché à la revente.</p>}
              {r.travauxProbable > 0 && <p style={{ fontSize: "12px", color: "#E5E7F5", ...font }}>• Argument : {fmt(r.travauxProbable)} de travaux à prévoir.</p>}
            </div>
          </div>

          {/* Coût détaillé */}
          <div className="rounded-[26px] p-4 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold uppercase tracking-wide" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Toutes tes dépenses</span>
              <div className="flex rounded-full p-0.5" style={{ background: "#12142F", border: "1px solid #2A3A5C" }}>
                {[["Mois", false], ["An", true]].map(([lbl, v]) => (
                  <button key={lbl} onClick={() => setParAn(v)} className="px-2.5 py-0.5 rounded-full font-semibold" style={{ fontSize: "11px", background: parAn === v ? C.gradient : "transparent", color: "#fff", ...font }}>{lbl}</button>
                ))}
              </div>
            </div>
            <ResumeLigne icon={Landmark} label="Crédit + assurance emprunteur" valeur={fmt(r.mensualiteAvecAssurance * k)} />
            <ResumeLigne icon={Receipt} label={r.taxeFonciereConnue ? "Taxe foncière" : "Taxe foncière (estimée)"} valeur={fmt((r.taxeFonciere / 12) * k)}
              info={r.taxeFonciereConnue ? "Le montant que tu as indiqué." : "Estimation : environ un mois de loyer du bien. Demande le dernier avis de taxe foncière au vendeur, le vrai montant dépend de la commune."} />
            {r.estCopro && <ResumeLigne icon={Building2} label={r.chargesCoproConnues ? "Charges de copropriété" : "Charges de copro (estimées)"} valeur={fmt(r.chargesCopro * k)}
              info="Entretien des parties communes, ascenseur, gardien... Demande les 3 derniers procès-verbaux d'AG et le montant exact au vendeur." />}
            <ResumeLigne icon={ShieldCheck} label="Assurance habitation" valeur={fmt(r.assuranceHabitation * k)} />
            <ResumeLigne icon={Flame} label={`Énergie (DPE ${r.dpeCalcul}${["A","B","C","D","E","F","G"].includes(r.dpe) ? "" : " supposé"})`} valeur={fmt(r.energieMensuelle * k)}
              info="Chauffage, eau chaude et électricité, estimés selon la surface et l'étiquette DPE. Une maison mal isolée (F ou G) peut coûter 3 fois plus cher à chauffer." />
            <ResumeLigne icon={Droplet} label="Eau" valeur={fmt(r.eauMensuelle * k)} />
            <ResumeLigne icon={Wrench} label="Entretien & réparations" valeur={fmt(r.entretienMensuel * k)}
              info={r.typeBien === "Maison" ? "Provision de 0,8 % de la valeur par an : toiture, chaudière, façade, jardin... À mettre de côté chaque mois." : "Provision de 0,4 % de la valeur par an pour l'entretien de ton logement (les parties communes sont dans les charges)."} />
            <div className="flex items-center justify-between pt-2.5 mt-1">
              <span className="font-bold" style={{ fontSize: "14px", color: "#fff", ...font }}>Total {parAn ? "par an" : "par mois"}</span>
              <span className="font-extrabold" style={{ fontSize: "16px", color: "#14F1D9", ...font }}>{fmt(r.coutTotalMensuel * k)}</span>
            </div>
          </div>

          {/* Frais d'achat */}
          <Section icon={PieChart} title="Frais d'achat">
            <Ligne label="Prix du bien" valeur={fmt(r.prix)} />
            <Ligne label="Frais de notaire" valeur={fmt(r.fraisNotaire)} sub={r.estNeuf ? "environ 2,5 % dans le neuf" : "environ 8 % dans l'ancien, surtout des taxes"} />
            {r.travauxProbable > 0 && <Ligne label="Travaux" valeur={fmt(r.travauxProbable)} sub={r.postesTravaux.join(", ")} />}
            <Ligne label="Garantie + frais de dossier" valeur={fmt(r.fraisGarantie + r.fraisDossier)} sub="caution ou hypothèque, et frais de la banque" />
            <Ligne label="Budget total" valeur={fmt(r.budgetTotal)} accent="#14F1D9" />
            <Ligne label="Apport" valeur={fmt(r.apport)} />
            <Ligne label="Montant à emprunter" valeur={fmt(r.capitalEmprunte)} sub={`${r.duree} ans à ${pct(r.taux)}`} />
            <Ligne label="Coût total du crédit" valeur={fmt(r.coutTotalCreditReel - r.capitalEmprunte)} sub="intérêts + assurance + frais" accent="#F87171" />
            {r.creditAutorise > 0 && (
              <Ligne label="Crédit accordé par ta banque" valeur={fmt(r.creditAutorise)} accent={r.creditAutorise >= r.capitalEmprunte ? C.green : "#F87171"}
                sub={r.creditAutorise >= r.capitalEmprunte ? "suffisant pour ce projet ✓" : `il manque ${fmt(r.capitalEmprunte - r.creditAutorise)}`} />
            )}
          </Section>

          {/* Budget */}
          <Section icon={Scale} title="Ton budget">
            {te === null ? (
              <p style={{ fontSize: "13px", color: C.onDarkMuted, ...font }}>
                Indique les revenus de ton foyer à l'étape « Ton budget » pour savoir si la banque peut te suivre et ce qu'il te restera pour vivre chaque mois.
              </p>
            ) : (<>
              <Ligne label="Taux d'endettement" valeur={pct(te)} accent={couleurTE}
                sub={te <= 35 ? "sous la limite de 35 % appliquée par les banques ✓" : "au-dessus de 35 % : les banques refusent dans la plupart des cas"} />
              <Ligne label="Mensualité maximum à 35 %" valeur={fmt(r.mensualiteMax35)} sub="crédit + assurance, en tenant compte de tes crédits en cours" />
              <Ligne label="Reste à vivre" valeur={fmt(r.resteAVivre)} accent={r.resteAVivre > 0 ? C.green : "#F87171"}
                sub="ce qu'il te reste chaque mois après toutes les dépenses du logement et tes crédits" />
            </>)}
          </Section>

          {/* Impôts et taxes */}
          <Section icon={Receipt} title="Impôts et taxes">
            <Ligne label="Taxe foncière" valeur={`${fmt(r.taxeFonciere)} / an`} sub={r.estNeuf ? "inclut les ordures ménagères · dans le neuf, exonération possible les 2 premières années selon la commune" : "inclut en général la taxe sur les ordures ménagères"} />
            <Ligne label="Taxe d'habitation" valeur="0 €" accent={C.green} sub="supprimée sur la résidence principale" />
            <Ligne label="Impôt sur le revenu" valeur="0 €" accent={C.green} sub="habiter ton logement ne crée pas de revenu imposable" />
            <Ligne label="Plus-value à la revente" valeur="Exonérée" accent={C.green} sub="pas d'impôt sur le gain si c'est ta résidence principale" />
          </Section>

          {/* Louer ou acheter */}
          <Section icon={Scale} title="Louer ou acheter ?">
            <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: "12.5px", color: C.onDarkMuted, ...font }}>
              <span>{Number(loyerCorrige) > 0 ? "Loyer que tu as indiqué" : "Loyer d'un logement équivalent"}</span>
              <InfoTip text="Loyer estimé pour ce même bien, d'après les données du Ministère du Logement. Corrige-le avec le crayon si tu connais mieux les loyers du secteur." />
              <button onClick={() => setEditionLoyer((v) => !v)} className="ml-auto"><Pencil size={13} color="#8B5CF6" /></button>
            </div>
            {editionLoyer ? (
              <input type="number" autoFocus value={loyerCorrige} onChange={(e) => setLoyerCorrige(e.target.value)} placeholder={String(r.loyerMarche || "")}
                style={{ background: "transparent", border: "none", outline: "none", padding: 0, width: "100%", color: "#F59E0B", ...font }} className="font-extrabold text-[20px] mb-2" />
            ) : (
              <div className="font-extrabold mb-2" style={{ fontSize: "20px", color: "#F59E0B", ...font }}>{loyerComparaison > 0 ? `${fmt(loyerComparaison)} / mois` : "Non disponible"}</div>
            )}
            {loyerComparaison > 0 && (<>
              <div className="p-3 rounded-2xl mb-3" style={{ background: "#12142F", border: "1px solid #2A3A5C" }}>
                <p className="font-bold" style={{ fontSize: "14px", lineHeight: "1.45", color: "#fff", ...font }}>
                  {louerAcheter.pointMort
                    ? <>Acheter devient plus intéressant que louer au bout de <span style={{ color: "#14F1D9" }}>{louerAcheter.pointMort} an{louerAcheter.pointMort > 1 ? "s" : ""}</span>.</>
                    : <>Avec ces chiffres, louer reste moins cher qu'acheter, même sur 30 ans.</>}
                </p>
                {louerAcheter.pointMort > 1 && (
                  <p className="mt-1" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Si tu revends avant, louer t'aurait coûté moins cher.</p>
                )}
              </div>
              <table className="w-full" style={{ fontSize: "12px", color: C.onDark, ...font }}>
                <thead>
                  <tr style={{ color: C.onDarkMuted }}>
                    <th className="text-left py-1.5">Après</th>
                    <th className="text-right py-1.5">Coût net achat</th>
                    <th className="text-right py-1.5">Coût net location</th>
                  </tr>
                </thead>
                <tbody>
                  {reperes.map((l) => {
                    const achatGagne = l.coutNetAchat <= l.coutNetLocation;
                    return (
                      <tr key={l.an} style={{ borderTop: "1px solid #22304C" }}>
                        <td className="py-1.5">{l.an} ans</td>
                        <td className="text-right py-1.5 font-semibold" style={{ color: achatGagne ? C.green : C.onDark }}>{fmt(l.coutNetAchat)}</td>
                        <td className="text-right py-1.5 font-semibold" style={{ color: achatGagne ? C.onDark : C.green }}>{fmt(l.coutNetLocation)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2.5" style={{ fontSize: "11px", lineHeight: "1.45", color: C.onDarkMuted, ...font }}>
                Coût net = ce que tu as payé moins ce que tu possèdes (valeur du bien − crédit restant). Hypothèses prudentes : prix du bien +1 %/an, loyers +1,5 %/an, apport placé à 2 %/an, sans frais de revente.
              </p>
            </>)}
          </Section>

          <div className="rounded-[26px] p-4 exion-fade" style={{ background: "linear-gradient(135deg, rgba(20,241,217,0.10), rgba(139,92,246,0.10))", border: "1px solid #3A3D6B" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={15} color="#A855F7" />
              <span className="font-bold" style={{ fontSize: "13px", color: "#C4B5FD", ...font }}>Analyse IA</span>
            </div>
            <p style={{ fontSize: "13px", lineHeight: "1.5", color: "#D8D4F0", ...font }}>{analyseIARP(r)}</p>
          </div>
        </>)}

        <button onClick={onDiscuter} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold" style={{ fontSize: "14.5px", background: C.bgSoft, color: C.onDark, border: `1px solid #2A3A5C`, ...font }}>
          <MessageCircle size={18} /> Poser une question sur ce bien
        </button>
        <p className="text-center mt-1" style={{ fontSize: "11px", color: C.onDarkMuted, ...font }}>Estimations indicatives. À vérifier : avis de taxe foncière, charges de copro, offre de prêt, diagnostics.</p>
      </div>
    </div>
  );
}

// Carte affichée sous les chiffres clés tant que le visiteur n'a pas de compte
function CarteVerrou({ onDebloquer }) {
  const avantages = [
    "Le calcul détaillé de ton cash-flow, ligne par ligne",
    "Le résumé financier et le coût total du crédit",
    "L'avis de l'IA sur ce bien",
    "Prix vs marché, travaux, revente et enrichissement année par année",
  ];
  return (
    <div className="rounded-[26px] p-5 exion-fade relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(20,241,217,0.12), rgba(139,92,246,0.18))", border: "1px solid #3A3D6B" }}>
      <div className="flex items-center gap-2 mb-1">
        <Lock size={16} color="#C4B5FD" />
        <span className="font-bold" style={{ fontSize: "15px", color: "#fff", ...font }}>Débloque l'analyse complète</span>
      </div>
      <p className="mb-3" style={{ fontSize: "12.5px", color: C.onDarkMuted, lineHeight: "1.45", ...font }}>
        C'est gratuit. Ton analyse est aussi sauvegardée pour la retrouver plus tard.
      </p>
      <div className="space-y-2 mb-4">
        {avantages.map((a) => (
          <div key={a} className="flex items-start gap-2">
            <Check size={15} color={C.green} strokeWidth={3} className="shrink-0 mt-0.5" />
            <span style={{ fontSize: "13px", color: "#E5E7F5", lineHeight: "1.4", ...font }}>{a}</span>
          </div>
        ))}
      </div>
      <button onClick={() => { window.exionTrack?.("DeblocageClique"); onDebloquer(); }} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-white exion-press" style={{ fontSize: "14.5px", background: C.gradient, boxShadow: "0 8px 24px rgba(139,92,246,0.35)", ...font }}>
        Créer mon compte gratuit <ChevronRight size={17} />
      </button>
      <p className="text-center mt-2" style={{ fontSize: "11.5px", color: C.onDarkMuted, ...font }}>10 secondes · nom + email · sans carte bancaire</p>
    </div>
  );
}

const FAQ_APP = [
  { q: "Comment sont calculées les estimations de prix et de loyer ?", a: "Exion Immo s'appuie sur des données publiques de transactions immobilières (DVF) quand elles couvrent la commune ou le département, et à défaut sur une estimation par IA à partir des caractéristiques du bien. Ce sont des ordres de grandeur, pas des expertises officielles." },
  { q: "Les résultats remplacent-ils l'avis d'un professionnel ?", a: "Non. Exion Immo t'aide à dégrossir un dossier rapidement, mais pour toute décision engageante (offre, prêt, signature), il est indispensable de consulter un notaire, un courtier ou un conseiller." },
  { q: "Mes analyses sont-elles sauvegardées si je change de téléphone ?", a: "Tes analyses, ton profil et tes simulations sont stockés sur l'appareil que tu utilises. Si tu changes de téléphone ou de navigateur, tu ne les retrouveras pas automatiquement." },
  { q: "Comment fonctionne l'abonnement Pro ?", a: "Le plan Pro débloque des fonctionnalités avancées. Tu peux gérer ou résilier ton abonnement à tout moment depuis l'onglet Profil, via le bouton \"Gérer mon abonnement\"." },
  { q: "Le chat IA a-t-il une limite de questions ?", a: "Oui : 3 questions par jour en plan gratuit, 15 par jour en plan Pro. Le compteur se réinitialise chaque jour." },
  { q: "Comment supprimer mon compte ou mes données ?", a: "Contacte-nous à exion.agentia@gmail.com en précisant l'adresse email de ton compte : nous supprimons tes données sous [délai] jours ouvrés." },
  { q: "D'où viennent les prix de marché affichés ?", a: "Des bases de données publiques (DVF) quand elles couvrent la commune, sinon d'une estimation par IA calibrée sur des données de marché récentes." },
];

const TEXTE_MENTIONS_LEGALES = `ÉDITEUR DU SITE
L'application Exion Immo est éditée par Tony Ozanne, entrepreneur individuel (auto-entrepreneur), immatriculé sous le numéro SIRET 982 055 048 00010, dont le siège est situé 61 rue Lambot, 83143 Le Val, France.
Directeur de la publication : Tony Ozanne
Contact : exion.agentia@gmail.com

HÉBERGEMENT
L'application est hébergée par Vercel Inc. (front-end) et Railway Corp. (backend et base de données). Les serveurs applicatifs sont situés dans l'Union européenne ou aux États-Unis selon le service.

PROPRIÉTÉ INTELLECTUELLE
L'ensemble des contenus, textes, visuels, logos et éléments graphiques présents sur Exion Immo sont la propriété exclusive de Tony Ozanne, sauf mention contraire. Toute reproduction sans autorisation est interdite.

RESPONSABILITÉ
Les informations et estimations fournies par Exion Immo (prix au m², loyers, rentabilité, etc.) le sont à titre purement indicatif et ne sauraient engager la responsabilité de l'éditeur en cas d'inexactitude.`;

const TEXTE_CGU = `1. OBJET
Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de l'application Exion Immo par tout utilisateur.

2. DESCRIPTION DU SERVICE
Exion Immo propose des outils d'aide à la décision pour l'investissement locatif : estimation de prix, simulation de crédit, calcul de rentabilité, checklist travaux et assistant conversationnel.

3. COMPTE UTILISATEUR
La création d'un compte permet de sauvegarder tes analyses sur l'appareil utilisé. Tu es responsable de l'exactitude des informations fournies.

4. LIMITES DE RESPONSABILITÉ
Les estimations, calculs et analyses fournis par Exion Immo sont indicatifs et ne constituent ni un conseil financier, ni un conseil juridique, ni une expertise immobilière. Toute décision d'investissement doit être validée par un professionnel qualifié (notaire, courtier, conseiller en gestion de patrimoine).

5. ABONNEMENT ET PAIEMENT
L'offre Pro est proposée sous forme d'abonnement, résiliable à tout moment depuis l'onglet Profil. Aucun remboursement au prorata n'est effectué en cas de résiliation en cours de période, sauf disposition légale contraire.

6. RÉSILIATION
Exion Immo se réserve le droit de suspendre l'accès au service en cas de manquement aux présentes CGU.

7. MODIFICATION DES CGU
Les présentes CGU peuvent être modifiées à tout moment ; la version en vigueur est celle disponible dans l'application.`;

const TEXTE_CONFIDENTIALITE = `1. DONNÉES COLLECTÉES
Nom, adresse email, et les informations que tu saisis dans le cadre de tes simulations (ville, prix, revenus, etc.).

2. FINALITÉ DU TRAITEMENT
Ces données servent à sauvegarder tes analyses, personnaliser ton expérience et, le cas échéant, gérer ton abonnement Pro.

3. CONSERVATION DES DONNÉES
Tes données sont conservées tant que ton compte est actif. Certaines informations (analyses, simulations) restent stockées localement sur ton appareil.

4. PARTAGE DES DONNÉES
Tes données ne sont ni vendues ni partagées avec des tiers à des fins commerciales. Elles peuvent être transmises à nos prestataires techniques (hébergement, paiement) dans la stricte mesure nécessaire au fonctionnement du service.

5. TES DROITS (RGPD)
Conformément au Règlement Général sur la Protection des Données, tu disposes d'un droit d'accès, de rectification, d'opposition et de suppression de tes données. Pour exercer ces droits, contacte-nous à exion.agentia@gmail.com.

6. COOKIES
L'application peut utiliser des cookies ou équivalents techniques nécessaires à son fonctionnement (session, préférences).`;

function VueLegale({ page, onBack }) {
  const [ouvert, setOuvert] = useState(null);
  const TITRES = { faq: "FAQ", mentions: "Mentions légales", cgu: "CGU", confidentialite: "Politique de confidentialité", contact: "Contact" };
  return (
    <div>
      <BackHeader title={TITRES[page] || "Informations"} onBack={onBack} />
      <div className="px-5 pt-3 pb-28">
        {page === "faq" ? (
          <div className="space-y-2">
            {FAQ_APP.map((item, i) => {
              const isOpen = ouvert === i;
              return (
                <button key={i} onClick={() => setOuvert(isOpen ? null : i)} className="w-full text-left exion-press">
                  <div className="rounded-2xl p-4" style={{ background: C.bgSoft, border: `1px solid ${isOpen ? "#8B5CF666" : "#2A3A5C"}` }}>
                    <div className="flex items-center justify-between gap-3">
 <span className="font-semibold" style={{ fontSize: "14px", color: C.onDark, ...font }}>{item.q}</span>
                      <ChevronDown size={16} color="#8B5CF6" className="shrink-0" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </div>
                    {isOpen && (
 <p className="mt-2.5 pt-2.5 exion-fade" style={{ fontSize: "13px", lineHeight: "1.55", color: C.onDarkMuted, borderTop: "1px solid #2A3A5C", whiteSpace: "pre-line", ...font }}>{item.a}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : page === "contact" ? (
          <div className="rounded-2xl p-5 exion-fade text-center" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: C.gradientSoft }}>
              <MessageCircle size={20} color="#8B5CF6" />
            </div>
 <p className="mb-1 font-semibold" style={{ fontSize: "14px", color: C.onDark, ...font }}>Une question, une remarque ?</p>
 <p className="mb-4" style={{ fontSize: "12.5px", color: C.onDarkMuted, lineHeight: "1.5", ...font }}>Écris-nous directement, on te répond au plus vite.</p>
            <a href="mailto:exion.agentia@gmail.com" className="inline-block px-5 py-3 rounded-full font-bold exion-press" style={{ fontSize: "13.5px", color: "#fff", background: C.gradient, ...font }}>
              exion.agentia@gmail.com
            </a>
          </div>
        ) : (
          <div className="rounded-2xl p-4 exion-fade" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
            <p style={{ fontSize: "12.5px", lineHeight: "1.7", color: C.onDarkMuted, whiteSpace: "pre-line", ...font }}>
              {page === "mentions" ? TEXTE_MENTIONS_LEGALES : page === "cgu" ? TEXTE_CGU : TEXTE_CONFIDENTIALITE}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LiensLegaux({ onOuvrirLegal }) {
  const items = [
    { id: "faq", label: "FAQ", icon: HelpCircle },
    { id: "contact", label: "Contact", icon: MessageCircle },
    { id: "mentions", label: "Mentions légales", icon: FileText },
    { id: "cgu", label: "Conditions générales d'utilisation", icon: FileText },
    { id: "confidentialite", label: "Politique de confidentialité", icon: Lock },
  ];
  return (
    <div className="rounded-2xl mt-4 exion-fade overflow-hidden" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
      {items.map((it, i) => (
        <button key={it.id} onClick={() => onOuvrirLegal(it.id)} className="w-full flex items-center gap-3 px-4 py-3.5 exion-press" style={{ borderTop: i > 0 ? "1px solid #22304C" : "none" }}>
          <it.icon size={16} color={C.onDarkMuted} className="shrink-0" />
 <span className="flex-1 text-left" style={{ fontSize: "13.5px", color: C.onDark, ...font }}>{it.label}</span>
          <ChevronRight size={16} color={C.onDarkMuted} className="shrink-0" />
        </button>
      ))}
    </div>
  );
}

function VueProfil({ profil, onSave, onRequestCode, onVerifyCode, onLogout, onDelete, nbProjets, onVoirPro, onOuvrirLegal }) {
  const [mode, setMode] = useState("creation"); // "creation" | "connexion"
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [accepteCGU, setAccepteCGU] = useState(false);
  const [codeEnvoye, setCodeEnvoye] = useState(false);
  const [code, setCode] = useState("");
  const [chargementCode, setChargementCode] = useState(false);
  const [erreur, setErreur] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [chargement, setChargement] = useState(false);
  const [chargementPortail, setChargementPortail] = useState(false);
  const [erreurPortail, setErreurPortail] = useState("");

  async function onGererAbonnement() {
    setErreurPortail(""); setChargementPortail(true);
    try {
      const res = await fetch(ACCOUNT_API_PORTAL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profil.email }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setErreurPortail("Impossible d'ouvrir le portail. Réessaie dans un instant.");
      }
    } catch (e) {
      setErreurPortail("Erreur réseau, réessaie dans un instant.");
    }
    setChargementPortail(false);
  }

  if (profil?.nom) {
    const initiales = profil.nom.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    return (
      <div className="px-5 pt-6 pb-28">
        <ScreenTitle>Profil</ScreenTitle>
        <div className="rounded-[26px] p-5 mb-4 exion-fade flex flex-col items-center text-center" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: C.gradient }}>
 <span className="font-bold" style={{ fontSize: '20px', color: "#fff", ...font }}>{initiales}</span>
          </div>
 <div className="font-bold" style={{ fontSize: '17px', color: C.onDark, ...font }}>{profil.nom}</div>
 <div style={{ fontSize: '13px', color: C.onDarkMuted, ...font }}>{profil.email}</div>
          <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.16)" }}>
            <ShieldCheck size={13} color={C.green} />
 <span className="font-semibold" style={{ fontSize: '11px', color: C.green, ...font }}>Compte enregistré sur cet appareil</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-4 exion-fade" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
 <div className="font-extrabold" style={{ fontSize: '22px', color: "#14F1D9", ...font }}>{nbProjets}</div>
 <div style={{ fontSize: '11.5px', color: C.onDarkMuted, ...font }}>Projets analysés</div>
          </div>
          <div className="rounded-2xl p-4 exion-fade" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
            <div className="flex items-center gap-1">
              <Check size={16} color={C.green} strokeWidth={3} />
 <span className="font-extrabold" style={{ fontSize: '15px', color: "#fff", ...font }}>Sauvegarde</span>
            </div>
 <div style={{ fontSize: '11.5px', color: C.onDarkMuted, ...font }}>Auto à chaque action</div>
          </div>
        </div>

        <div className="rounded-2xl p-4 mb-4 exion-fade flex items-center justify-between" style={{ background: estPro(profil) ? "rgba(20,241,217,0.10)" : "rgba(139,92,246,0.10)", border: "1px solid #3A3D6B" }}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} color={estPro(profil) ? "#14F1D9" : "#C4B5FD"} />
            <span className="font-bold" style={{ fontSize: "13px", color: "#fff", ...font }}>{estPro(profil) ? "Plan Pro" : "Plan Gratuit"}</span>
          </div>
          {!estPro(profil) && (
            <button onClick={onVoirPro} className="px-3 py-1.5 rounded-full font-semibold" style={{ fontSize: "11.5px", background: C.gradient, color: "#fff", ...font }}>Passer Pro</button>
          )}
          {estPro(profil) && (
            <button onClick={onGererAbonnement} disabled={chargementPortail} className="px-3 py-1.5 rounded-full font-semibold" style={{ fontSize: "11.5px", background: "rgba(255,255,255,0.1)", color: "#fff", ...font }}>
              {chargementPortail ? "..." : "Gérer mon abonnement"}
            </button>
          )}
        </div>
        {erreurPortail && <p className="mb-3 text-center" style={{ fontSize: "12px", color: "#F87171", ...font }}>{erreurPortail}</p>}

        <div className="rounded-2xl p-4 mb-4 exion-fade flex items-start gap-2.5" style={{ background: "rgba(139,92,246,0.10)", border: "1px solid #3A3D6B" }}>
          <Info size={16} color="#C4B5FD" className="shrink-0 mt-0.5" />
 <p style={{ fontSize: '12px', lineHeight: '1.5', color: "#D8D4F0", ...font }}>Tes analyses, simulations et checklist sont liées à ton compte et sauvegardées automatiquement.</p>
        </div>

        <button onClick={onLogout} className="w-full text-center py-3 rounded-2xl font-semibold exion-press mb-2.5" style={{ fontSize: '14px', background: "rgba(239,68,68,0.12)", color: "#F87171", border: "1px solid rgba(239,68,68,0.3)", ...font }}>
          Se déconnecter
        </button>
        <button
          onClick={() => {
            if (window.confirm("Supprimer définitivement ton compte et toutes tes données (analyses, simulations, checklist) ? Cette action est irréversible.")) {
              onDelete();
            }
          }}
          className="w-full text-center py-3 rounded-2xl font-semibold exion-press"
          style={{ fontSize: '13px', background: "transparent", color: "#6B7688", border: "1px solid #2A3A5C", ...font }}
        >
          Supprimer mon compte
        </button>
        <LiensLegaux onOuvrirLegal={onOuvrirLegal} />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-28">
      <ScreenTitle>Profil</ScreenTitle>
      <div className="rounded-[26px] p-5 mb-5 exion-fade text-center" style={{ background: "linear-gradient(135deg, rgba(20,241,217,0.10), rgba(139,92,246,0.10))", border: "1px solid #3A3D6B" }}>
        <div className="w-20 h-20 rounded-full mx-auto mb-3 exion-glow relative overflow-hidden" style={{ background: C.gradient }}>
          <MascotVideo className="absolute inset-0 w-full h-full" objectFit="cover" />
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 0 16px 6px rgba(16,15,44,0.5)" }} />
        </div>
 <div className="font-bold" style={{ fontSize: '17px', color: "#fff", ...font }}>{mode === "creation" ? "Crée ton compte" : "Content de te revoir"}</div>
 <p className="mt-1" style={{ fontSize: '13px', color: C.onDarkMuted, lineHeight: '1.4', ...font }}>Pour retrouver tes analyses, simulations et ta checklist à chaque visite.</p>
      </div>

      <div className="flex rounded-2xl p-1 mb-5" style={{ background: C.bgSoft, border: "1px solid #2A3A5C" }}>
        <button
          onClick={() => { setMode("creation"); setErreur(""); }}
          className="flex-1 text-center py-2.5 rounded-xl font-semibold exion-press"
          style={{ fontSize: '13.5px', color: mode === "creation" ? "#fff" : C.onDarkMuted, background: mode === "creation" ? C.gradient : "transparent", ...font }}
        >
          Créer un compte
        </button>
        <button
          onClick={() => { setMode("connexion"); setErreur(""); }}
          className="flex-1 text-center py-2.5 rounded-xl font-semibold exion-press"
          style={{ fontSize: '13.5px', color: mode === "connexion" ? "#fff" : C.onDarkMuted, background: mode === "connexion" ? C.gradient : "transparent", ...font }}
        >
          Se connecter
        </button>
      </div>

      <div className="space-y-3 mb-2">
        {mode === "creation" && (
          <div>
 <label className="font-semibold block mb-1.5" style={{ fontSize: '12.5px', color: C.onDarkMuted, ...font }}>Nom complet</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Tony Martin" style={{ ...inputBase, fontSize: '15px' }} className="w-full px-4 py-3.5 rounded-2xl outline-none" />
          </div>
        )}
        <div>
 <label className="font-semibold block mb-1.5" style={{ fontSize: '12.5px', color: C.onDarkMuted, ...font }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="ton@email.com" style={{ ...inputBase, fontSize: '15px' }} className="w-full px-4 py-3.5 rounded-2xl outline-none" />
        </div>
        {mode === "creation" && (
          <label className="flex items-start gap-2.5 exion-press" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={accepteCGU} onChange={(e) => setAccepteCGU(e.target.checked)} className="mt-0.5 shrink-0" style={{ width: 16, height: 16, accentColor: "#8B5CF6" }} />
 <span style={{ fontSize: '12px', color: C.onDarkMuted, lineHeight: '1.5', ...font }}>
              J'accepte les <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOuvrirLegal("cgu"); }} style={{ color: "#C4B5FD", textDecoration: "underline" }}>conditions générales d'utilisation</button> et la <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOuvrirLegal("confidentialite"); }} style={{ color: "#C4B5FD", textDecoration: "underline" }}>politique de confidentialité</button>.
            </span>
          </label>
        )}
 {erreur && <p style={{ fontSize: '12.5px', color: "#F87171", ...font }}>{erreur}</p>}
      </div>

      {mode === "creation" ? (
        <button
          onClick={() => {
            if (!nom.trim() || !email.trim()) { setErreur("Renseigne ton nom et ton email pour continuer."); return; }
            if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErreur("Cet email ne semble pas valide."); return; }
            if (!accepteCGU) { setErreur("Merci d'accepter les CGU et la politique de confidentialité pour continuer."); return; }
            setErreur("");
            onSave({ nom: nom.trim(), email: email.trim(), cguAccepteesLe: new Date().toISOString() });
          }}
          className="w-full text-center py-3.5 rounded-2xl font-bold exion-press mb-3"
          style={{ fontSize: '15px', color: "#fff", background: C.gradient, ...font }}
        >
          Créer mon compte
        </button>
      ) : !codeEnvoye ? (
        <button
          disabled={chargementCode}
          onClick={async () => {
            if (!email.trim()) { setErreur("Renseigne l'email de ton compte."); return; }
            setErreur(""); setDebugInfo(""); setChargementCode(true);
            const res = await onRequestCode(email.trim());
            setChargementCode(false);
            if (res.ok) { setCodeEnvoye(true); }
            else {
              const estErreurReseau = (res.debug || []).some((d) => /erreur réseau/i.test(d));
              setErreur(estErreurReseau
                ? "Impossible de contacter le serveur pour le moment. Vérifie ta connexion et réessaie."
                : "Aucun compte trouvé avec cet email sur cet appareil. Crée un compte si c'est ta première visite.");
              setDebugInfo((res.debug || []).join(" · "));
            }
          }}
          className="w-full text-center py-3.5 rounded-2xl font-bold exion-press mb-3 disabled:opacity-60"
          style={{ fontSize: '15px', color: "#fff", background: C.gradient, ...font }}
        >
          {chargementCode ? "Envoi…" : "Recevoir un code de connexion"}
        </button>
      ) : (
        <div className="mb-3">
 <p className="mb-3 text-center" style={{ fontSize: '12.5px', color: C.onDarkMuted, lineHeight: '1.4', ...font }}>Un code à 6 chiffres a été envoyé à <strong style={{ color: C.onDark }}>{email.trim()}</strong>. Il expire dans quelques minutes.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            type="text" inputMode="numeric" placeholder="123456" maxLength={6}
            style={{ ...inputBase, fontSize: '20px', textAlign: "center", letterSpacing: "0.3em" }}
            className="w-full px-4 py-3.5 rounded-2xl outline-none mb-3"
          />
          <button
            disabled={chargement}
            onClick={async () => {
              if (code.trim().length !== 6) { setErreur("Le code doit contenir 6 chiffres."); return; }
              setErreur(""); setDebugInfo(""); setChargement(true);
              const res = await onVerifyCode(email.trim(), code.trim());
              setChargement(false);
              if (!res.ok) {
                const estErreurReseau = (res.debug || []).some((d) => /erreur réseau/i.test(d));
                setErreur(estErreurReseau
                  ? "Impossible de contacter le serveur pour le moment. Vérifie ta connexion et réessaie."
                  : "Code invalide ou expiré. Vérifie le code reçu ou demandes-en un nouveau.");
                setDebugInfo((res.debug || []).join(" · "));
              }
            }}
            className="w-full text-center py-3.5 rounded-2xl font-bold exion-press mb-2.5 disabled:opacity-60"
            style={{ fontSize: '15px', color: "#fff", background: C.gradient, ...font }}
          >
            {chargement ? "Vérification…" : "Valider le code"}
          </button>
          <button
            onClick={() => { setCodeEnvoye(false); setCode(""); setErreur(""); }}
            className="w-full text-center py-2 exion-press"
            style={{ fontSize: '12.5px', color: C.onDarkMuted, textDecoration: "underline", ...font }}
          >
            Changer d'email ou renvoyer un code
          </button>
        </div>
      )}
 {debugInfo && <p className="mb-2" style={{ fontSize: '10px', fontFamily: "monospace", color: "#6B7688", lineHeight: '1.5' }}>{debugInfo}</p>}
 <p className="text-center" style={{ fontSize: '11px', color: C.onDarkMuted, lineHeight: '1.4', ...font }}>Connexion sécurisée par code à usage unique envoyé par email — aucun mot de passe à retenir.</p>
      <LiensLegaux onOuvrirLegal={onOuvrirLegal} />
    </div>
  );
}

/* ============================================================
   ASSISTANT IA — spécialisé immobilier, avec limite d'usage
   quotidienne (3 questions pour un visiteur, 15 pour un
   compte créé). Compteur stocké dans localStorage.

   Le endpoint pointe vers un webhook n8n (voir le workflow
   "Exion - Chat IA Immobilier" fourni séparément) qui détient
   la vraie clé API Anthropic côté serveur, applique le prompt
   système, et renvoie { reply: "texte de la réponse" }.
   Remplace l'URL ci-dessous par ton URL de webhook Railway une
   fois le workflow importé et activé dans n8n.
============================================================ */
const CHAT_API_ENDPOINT = "https://primary-production-a6e13.up.railway.app/webhook/exion-chat-ia";
const ESTIMER_LOYER_API_ENDPOINT = "https://primary-production-a6e13.up.railway.app/webhook/exion-estimer-loyer";
const ACCOUNT_API_SIGNUP = "https://primary-production-a6e13.up.railway.app/webhook/exion-signup";
const ACCOUNT_API_LOGIN = "https://primary-production-a6e13.up.railway.app/webhook/exion-login";
const ACCOUNT_API_CHECKOUT = "https://primary-production-a6e13.up.railway.app/webhook/exion-checkout";
const ACCOUNT_API_PORTAL = "https://primary-production-a6e13.up.railway.app/webhook/exion-portal";
const ACCOUNT_API_DELETE = "https://primary-production-a6e13.up.railway.app/webhook/exion-delete-compte";
const ACCOUNT_API_REQUEST_CODE = "https://primary-production-a6e13.up.railway.app/webhook/exion-request-code";
const ACCOUNT_API_VERIFY_CODE = "https://primary-production-a6e13.up.railway.app/webhook/exion-verify-code";
const CHAT_LIMIT_FREE = 3;
const CHAT_LIMIT_PRO = 15;
const FREE_ANALYSES_PAR_MOIS = 1;
const OUTILS_GRATUITS = ["calculateur", "checklist"];

function estPro(profil) {
  return profil?.plan === "pro";
}
function moisKey(timestampMs) {
  return new Date(timestampMs).toISOString().slice(0, 7);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function MascotVideo({ className = "", style = {}, objectFit = "cover", fps = 7 }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % MASCOT_FRAMES.length);
    }, 1000 / fps);
    // Precharge les images de l'animation pour eviter les clignotements
    MASCOT_FRAMES.forEach((src) => { const img = new Image(); img.src = src; });
    return () => clearInterval(id);
  }, []);
  return <img src={MASCOT_FRAMES[frame]} alt="" className={className} style={{ objectFit, ...style }} />;
}

function EcranPro({ onBack, raison, profil, onDemandeCompte }) {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const avantages = [
    "Analyses illimitées, tous les mois",
    "Analyse « Acheter pour y vivre » complète",
    "Export PDF de tes analyses",
    "Annuaire VueBiens complet",
    "Simulateur de crédit + Estimation travaux",
    "Chat IA — 15 questions par jour",
    "Lexique complet (23 entrées)",
  ];

  async function passerPro() {
    if (!profil?.email) { onDemandeCompte(); return; }
    setErreur(""); setChargement(true);
    try {
      const res = await fetch(ACCOUNT_API_CHECKOUT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profil.email, nom: profil.nom }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setErreur("Impossible de créer la session de paiement. Réessaie dans un instant.");
      }
    } catch (e) {
      setErreur("Erreur réseau, réessaie dans un instant.");
    }
    setChargement(false);
  }

  return (
    <div>
      <BackHeader title="Passer Pro" onBack={onBack} />
      <div className="px-5 pt-2 pb-24">
        <div className="rounded-[26px] p-5 mb-4 exion-fade text-center" style={{ background: "linear-gradient(135deg, rgba(20,241,217,0.12), rgba(139,92,246,0.12))", border: "1px solid #3A3D6B" }}>
          <Sparkles size={28} color="#A855F7" className="mx-auto mb-2" />
          <div className="font-extrabold" style={{ fontSize: "18px", color: "#fff", ...font }}>Débloque tout Exion Immo</div>
          {raison && <p className="mt-1" style={{ fontSize: "12.5px", color: C.onDarkMuted, ...font }}>{raison}</p>}
        </div>
        <div className="rounded-[26px] p-4 mb-4 exion-fade" style={{ background: "#1A1B42", border: "1px solid #2A3A5C" }}>
          {avantages.map((a, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: i < avantages.length - 1 ? "1px solid #2A3A5C" : "none" }}>
              <CheckCircle2 size={17} color={C.green} />
              <span style={{ fontSize: "13.5px", color: C.onDark, ...font }}>{a}</span>
            </div>
          ))}
        </div>
        {!profil?.email && (
          <p className="mb-3 text-center" style={{ fontSize: "12px", color: C.onDarkMuted, ...font }}>Tu dois d'abord créer un compte pour passer Pro.</p>
        )}
        {erreur && <p className="mb-3 text-center" style={{ fontSize: "12px", color: "#F87171", ...font }}>{erreur}</p>}
        <PrimaryButton disabled={chargement} onClick={passerPro}>
          {chargement ? <><Loader2 size={18} className="animate-spin" /> Redirection…</> : (profil?.email ? "Passer Pro" : "Créer un compte")}
        </PrimaryButton>
      </div>
    </div>
  );
}

function ChatIA({ contexte, onClose, profil, onCreerCompte }) {
  const limite = estPro(profil) ? CHAT_LIMIT_PRO : CHAT_LIMIT_FREE;
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem("chat-messages");
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length) return saved;
      }
    } catch (e) {}
    return [{ role: "assistant", text: contexte ? "Pose-moi tes questions sur ce bien…" : "Pose-moi tes questions sur l'investissement immobilier !" }];
  });
  const [saisie, setSaisie] = useState("");
  const [loading, setLoading] = useState(false);
  const [utilisees, setUtilisees] = useState(0);
  const [pretChargement, setPretChargement] = useState(false);
  const finRef = useRef(null);
  useEffect(() => { finRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    try { localStorage.setItem("chat-messages", JSON.stringify(messages.slice(-40))); } catch (e) {}
  }, [messages]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("chat-usage");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.date === todayKey()) setUtilisees(data.count || 0);
      }
    } catch (e) {}
    setPretChargement(true);
  }, []);

  const restantes = Math.max(0, limite - utilisees);
  const limiteAtteinte = pretChargement && restantes <= 0;

  function enregistrerUsage(count) {
    try { localStorage.setItem("chat-usage", JSON.stringify({ date: todayKey(), count })); } catch (e) {}
  }

  async function envoyer() {
    if (!saisie.trim() || loading || limiteAtteinte) return;
    const question = saisie.trim();
    setMessages((m) => [...m, { role: "user", text: question }]);
    setSaisie(""); setLoading(true);
    try {
      const res = await fetch(CHAT_API_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, contexte }),
      });
      let data;
      const brut = await res.text();
      try { data = JSON.parse(brut); } catch (e) {
        throw new Error(`Réponse non-JSON (HTTP ${res.status}) : ${brut.slice(0, 200)}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} : ${JSON.stringify(data).slice(0, 200)}`);
      }
      const texte = data.reply || (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n") || "Je n'ai pas pu répondre, réessaie.";
      setMessages((m) => [...m, { role: "assistant", text: texte }]);
      const next = utilisees + 1;
      setUtilisees(next);
      enregistrerUsage(next);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: `Erreur de connexion à l'assistant.\n\n[Debug] ${e?.message || e}` }]);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col" style={{ background: C.bg }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid #22304C` }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full shrink-0 relative overflow-hidden" style={{ background: C.gradient }}>
            <MascotVideo className="absolute inset-0 w-full h-full" objectFit="cover" />
            <div className="absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 0 8px 3px rgba(16,15,44,0.5)" }} />
          </div>
          <span className="font-bold truncate" style={{ color: C.onDark, ...font }}>Assistant Exion</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
 <span className="font-semibold px-2.5 py-1 rounded-full" style={{ fontSize: '11px', background: restantes > 0 ? "rgba(139,92,246,0.16)" : "rgba(239,68,68,0.16)", color: restantes > 0 ? "#C4B5FD" : "#F87171", ...font }}>
            {restantes} question{restantes > 1 ? "s" : ""} restante{restantes > 1 ? "s" : ""}
          </span>
          <button onClick={onClose} aria-label="Fermer"><X size={22} color={C.onDark} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => (
 <div key={i} className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl ${m.role === "user" ? "ml-auto" : ""}`} style={{ fontSize: '14px', whiteSpace: 'pre-line', background: m.role === "user" ? C.gradient : C.bgSoft, color: m.role === "user" ? "#fff" : C.onDark, ...font }}>{m.text}</div>
        ))}
 {loading && <div className="" style={{ fontSize: '13px', color: C.onDarkMuted, ...font }}>L'assistant réfléchit…</div>}
        {limiteAtteinte && (
          <div className="rounded-2xl p-4 mt-2" style={{ background: "rgba(139,92,246,0.10)", border: "1px solid #3A3D6B" }}>
 <p style={{ fontSize: '13px', lineHeight: '1.5', color: "#D8D4F0", ...font }}>
              {profil?.nom
                ? "Tu as atteint ta limite de questions pour aujourd'hui. Reviens demain !"
                : "Tu as utilisé tes questions gratuites du jour. Crée un compte pour passer à 15 questions/jour."}
            </p>
            {!profil?.nom && (
              <button onClick={onCreerCompte} className="mt-3 w-full text-center py-2.5 rounded-xl font-semibold exion-press" style={{ fontSize: '13.5px', color: "#fff", background: C.gradient, ...font }}>
                Créer mon compte
              </button>
            )}
          </div>
        )}
        <div ref={finRef} />
      </div>
      <div className="flex gap-2 p-4" style={{ borderTop: `1px solid #22304C` }}>
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && envoyer()}
          disabled={limiteAtteinte}
          placeholder={limiteAtteinte ? "Limite atteinte pour aujourd'hui" : "Ta question…"}
          style={{ ...inputBase, fontSize: '15px' }}
          className="flex-1 px-3.5 py-3 rounded-xl outline-none disabled:opacity-50"
        />
        <button onClick={envoyer} disabled={loading || limiteAtteinte} style={{ background: C.gradient }} className="px-4 rounded-xl flex items-center justify-center disabled:opacity-40"><Send size={18} color="#fff" /></button>
      </div>
    </div>
  );
}

function NavBar({ vue, setVue }) {
  const items = [
    { id: "accueil", icon: HomeIcon, label: "Accueil" },
    { id: "biens", icon: Building2, label: "Biens" },
    { id: "outils", icon: LayoutGrid, label: "Outils" },
    { id: "projets", icon: ClipboardList, label: "Projets" },
    { id: "profil", icon: User, label: "Profil" },
  ];
  return (
    <div className="fixed bottom-3 left-0 right-0 z-20 px-4">
      <div className="max-w-md mx-auto flex justify-around items-center py-2 px-1 rounded-full" style={{ background: C.bgSoft, border: "1px solid #2A3A5C", boxShadow: "0 12px 30px rgba(0,0,0,0.35)" }}>
        {items.map((it) => {
          const active = vue === it.id;
          return (
            <button key={it.id} onClick={() => setVue(it.id)} className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-full transition-all duration-200" style={active ? { background: C.gradientSoft } : {}}>
              <it.icon size={20} color={active ? "#8B5CF6" : C.onDarkMuted} strokeWidth={active ? 2.5 : 2} style={{ transition: "transform 0.2s ease", transform: active ? "scale(1.08)" : "scale(1)" }} />
 <span className="" style={{ fontSize: '10px',  color: active ? "#8B5CF6" : C.onDarkMuted, ...font }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   APP
============================================================ */

export default function App() {
  useGlobalStyles();
  const [vue, setVue] = useState("accueil");
  const [pageLegale, setPageLegale] = useState("faq");
  const [projets, setProjets] = useState([]);
  const [analysesUsage, setAnalysesUsage] = useState({ date: "", count: 0 });
  const [resultat, setResultat] = useState(null);
  const [chatOuvert, setChatOuvert] = useState(false);
  const [bulleOffset, setBulleOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0, moved: false });

  function supprimerProjet(id) {
    setProjets((liste) => {
      const next = liste.filter((p) => p.id !== id);
      try { localStorage.setItem("analyses", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }

  function bulleDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: bulleOffset.x, origY: bulleOffset.y, moved: false };
  }
  function bulleMove(e) {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true;
    setBulleOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  }
  function bulleUp() {
    dragRef.current.dragging = false;
    if (!dragRef.current.moved) setChatOuvert(true);
  }
  const [chargement, setChargement] = useState(false);
  const [credit, setCredit] = useState({ revenu: "0", apport: "0", duree: "0", taux: "0", montant: "" });
  const [bien, setBien] = useState({ prix: "0", notaire: "0", travaux: "0", loyer: "0", charges: "0", surface: "0" });
  const [travaux, setTravaux] = useState(() => ({ coche: cocheParDefaut(), tarifs: tarifsParDefaut(), nbMenuiseries: "0", prixMenuiserie: "0" }));
  const [profil, setProfil] = useState(null);
  const [retourResultat, setRetourResultat] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      if (raw) setProfil(JSON.parse(raw));
    } catch (e) {}
  }, []);

  // Après inscription ou connexion depuis l'écran de résultat, on y revient directement
  useEffect(() => {
    if (retourResultat && profil?.email && resultat) {
      setRetourResultat(false);
      setVue("resultat");
    }
  }, [retourResultat, profil, resultat]);

  async function creerCompte(data) {
    setProfil(data);
    window.exionTrack?.("CompleteRegistration");
    try { localStorage.setItem("session", JSON.stringify(data)); } catch (e) {}
    try {
      await fetch(ACCOUNT_API_SIGNUP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: data.nom, email: data.email, cguAccepteesLe: data.cguAccepteesLe }),
      });
    } catch (e) { console.error("Exion: échec création compte serveur", e); }
  }

  async function demanderCode(email) {
    const emailNorm = email.trim().toLowerCase();
    try {
      const res = await fetch(ACCOUNT_API_REQUEST_CODE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNorm }),
      });
      const data = await res.json();
      if (data.ok) return { ok: true, debug: [] };
      return { ok: false, debug: [] };
    } catch (e) {
      return { ok: false, debug: [`Erreur réseau — ${e?.message || e}`] };
    }
  }

  async function verifierCode(email, code) {
    const emailNorm = email.trim().toLowerCase();
    try {
      const res = await fetch(ACCOUNT_API_VERIFY_CODE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNorm, code }),
      });
      const data = await res.json();
      if (data.ok) {
        const trouve = { nom: data.nom, email: data.email, plan: data.plan || "free" };
        setProfil(trouve);
        try { localStorage.setItem("session", JSON.stringify(trouve)); } catch (e) {}
        return { ok: true, debug: [] };
      }
      return { ok: false, debug: [] };
    } catch (e) {
      return { ok: false, debug: [`Erreur réseau — ${e?.message || e}`] };
    }
  }

  async function rafraichirStatut(email) {
    const emailNorm = email.trim().toLowerCase();
    try {
      const res = await fetch(ACCOUNT_API_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailNorm }),
      });
      const data = await res.json();
      if (data.ok) {
        const trouve = { nom: data.nom, email: data.email, plan: data.plan || "free" };
        setProfil(trouve);
        try { localStorage.setItem("session", JSON.stringify(trouve)); } catch (e) {}
        return trouve;
      }
    } catch (e) { console.error("Exion: échec rafraîchissement statut", e); }
    return null;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pro") === "success" && profil?.email) {
      // Retour de Stripe : on prévient Meta qu'un abonnement Pro vient d'être pris
      rafraichirStatut(profil.email).then((p) => { if (estPro(p)) window.exionTrack?.("Subscribe"); });
      params.delete("pro");
      const clean = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", clean);
    }
  }, [profil?.email]);

  function deconnecter() {
    setProfil(null);
    try { localStorage.removeItem("session"); } catch (e) {}
  }

  async function supprimerCompte() {
    const email = profil?.email;
    try {
      await fetch(ACCOUNT_API_DELETE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch (e) { console.error("Exion: échec suppression compte serveur", e); }
    ["session", "analyses", "credit-sim", "bien-sim", "travaux-sim", "chat-usage", "chat-messages", "checklist"].forEach((k) => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    setProfil(null);
    setProjets([]);
    setVue("accueil");
  }

  useEffect(() => {
    try { const raw = localStorage.getItem("analyses"); if (raw) setProjets(JSON.parse(raw)); } catch (e) {}
    try {
      const raw = localStorage.getItem("analyses-usage");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.date === moisKey(Date.now())) setAnalysesUsage(data);
      }
    } catch (e) {}
    try { const raw = localStorage.getItem("credit-sim"); if (raw) setCredit(JSON.parse(raw)); } catch (e) {}
    try { const raw = localStorage.getItem("bien-sim"); if (raw) setBien(JSON.parse(raw)); } catch (e) {}
    try { const raw = localStorage.getItem("travaux-sim"); if (raw) setTravaux(JSON.parse(raw)); } catch (e) {}
  }, []);

  function updateCredit(updater) {
    setCredit((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem("credit-sim", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }

  function updateBien(updater) {
    setBien((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem("bien-sim", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }

  function updateTravaux(updater) {
    setTravaux((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem("travaux-sim", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }

  async function lancerAnalyse(f) {
    window.exionTrack?.(f.mode === "rp" ? "AnalyseRPLancee" : "AnalyseLancee");
    setChargement(true);
    const prixM2Marche = await fetchPrixMarche(f.ville, f.codePostal, f.typeBien === "Appartement");
    const estAppart = f.typeBien === "Appartement";
    let loyerM2Final = await loyerM2Commune(prixM2Marche.codeInsee, estAppart);
    let sourceLoyer = loyerM2Final ? "commune" : null;
    if (!loyerM2Final) {
      loyerM2Final = loyerM2Departement(f.codePostal, estAppart);
      sourceLoyer = loyerM2Final ? "gouv" : null;
    }
    if (!loyerM2Final) {
      loyerM2Final = await estimerLoyerIA(f.ville, f.codePostal, f.typeBien, prixM2Marche.valeur);
      sourceLoyer = loyerM2Final ? "IA" : null;
    }
    let rFinal;
    if (f.mode === "rp") {
      rFinal = calculerAchatRP(f, prixM2Marche, loyerM2Final, sourceLoyer);
    } else {
      const r = calculerAnalyse(f, prixM2Marche, loyerM2Final, sourceLoyer);
      const prixMaxRentable = trouverPrixMaxRentable(f, prixM2Marche, loyerM2Final, sourceLoyer, 0);
      const prixM2MaxRentable = r.surface > 0 ? Math.round(prixMaxRentable / r.surface) : 0;
      rFinal = { ...r, prixMaxRentable, prixM2MaxRentable };
    }
    setResultat(rFinal); setChargement(false); setVue("resultat");
    window.exionTrack?.("ViewContent");
    const nouveauProjet = { id: Date.now(), ...rFinal };
    const liste = [nouveauProjet, ...projets].slice(0, 20);
    setProjets(liste);
    try { localStorage.setItem("analyses", JSON.stringify(liste)); } catch (e) {}
    const moisActuel = moisKey(Date.now());
    setAnalysesUsage((prev) => {
      const count = (prev.date === moisActuel ? prev.count : 0) + 1;
      const next = { date: moisActuel, count };
      try { localStorage.setItem("analyses-usage", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }

  function ouvrirOutil(id) {
    if (!OUTILS_GRATUITS.includes(id) && !estPro(profil)) {
      const raisons = {
        credit: "La simulation de crédit est réservée au plan Pro.",
        travaux: "L'estimation travaux est réservée au plan Pro.",
        lexique: "Le lexique complet est réservé au plan Pro.",
      };
      setRaisonPro(raisons[id] || "Cet outil est réservé au plan Pro.");
      setVue("pro");
      return;
    }
    if (id === "checklist") setVue("checklist");
    else if (id === "credit") setVue("credit");
    else if (id === "calculateur") setVue("calculateur");
    else if (id === "travaux") setVue("travaux");
    else if (id === "lexique") setVue("lexique");
    else setVue("formulaire");
  }

  const moisCourant = moisKey(Date.now());
  const analysesCeMois = analysesUsage.date === moisCourant ? analysesUsage.count : 0;
  const [raisonPro, setRaisonPro] = useState("");
  const [proRetour, setProRetour] = useState("");
  // Le retour vers le résultat ne vaut que si on quitte l'écran Pro par sa flèche retour
  useEffect(() => { if (vue !== "pro") setProRetour(""); }, [vue]);

  function onNouveauAnalyse() {
    if (!estPro(profil) && analysesCeMois >= FREE_ANALYSES_PAR_MOIS) {
      setRaisonPro(`Le plan gratuit inclut ${FREE_ANALYSES_PAR_MOIS} analyse par mois. Passe Pro pour des analyses illimitées.`);
      setVue("pro");
    } else {
      setVue("formulaire");
    }
  }

  function onVoirBiensGate() {
    if (!estPro(profil)) {
      setRaisonPro("L'annuaire VueBiens complet est réservé au plan Pro.");
      setVue("pro");
    } else {
      setVue("biens");
    }
  }

  return (
    <div className="min-h-screen w-full" style={{ background: "radial-gradient(circle at 50% 0%, #2A2470 0%, #14133A 45%, #100F2C 100%)" }}>
      <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden" style={{ background: "transparent" }}>
        {vue === "accueil" && <VueAccueil projets={projets} onNouveau={onNouveauAnalyse} onOuvrir={(p) => { setResultat(p); setVue("resultat"); }} onSupprimer={supprimerProjet} onOutil={ouvrirOutil} onVoirBiens={onVoirBiensGate} onVoirOutils={() => setVue("outils")} onProfil={() => setVue("profil")} profil={profil} />}
        {vue === "biens" && <VueBiens onBack={() => setVue("accueil")} onNouveau={onNouveauAnalyse} />}
        {vue === "pro" && <EcranPro onBack={() => { setVue(proRetour || "accueil"); setProRetour(""); }} raison={raisonPro} profil={profil} onDemandeCompte={() => { setProRetour(""); setVue("profil"); }} />}
        {vue === "outils" && <VueOutils onBack={() => setVue("accueil")} onOutil={ouvrirOutil} />}
        {vue === "checklist" && <VueChecklist onBack={() => setVue("accueil")} />}
        {vue === "lexique" && <VueLexique onBack={() => setVue("accueil")} onVoirBail={() => setVue("bail")} />}
        {vue === "bail" && <VueBailModele onBack={() => setVue("lexique")} />}
        {vue === "credit" && <VueCredit onBack={() => setVue("accueil")} credit={credit} setCredit={updateCredit} />}
        {vue === "travaux" && <VueTravaux onBack={() => setVue("accueil")} bien={bien} setBien={updateBien} travaux={travaux} setTravaux={updateTravaux} />}
        {vue === "calculateur" && <VueCalculateur onBack={() => setVue("accueil")} onVoirAnalyse={() => setVue("formulaire")} onOuvrirCredit={() => setVue("credit")} credit={credit} bien={bien} setBien={updateBien} />}
        {vue === "formulaire" && <VueFormulaire onCalculer={lancerAnalyse} chargement={chargement} onBack={() => setVue("accueil")} credit={credit} setCredit={updateCredit} bien={bien} setBien={updateBien} travaux={travaux} setTravaux={updateTravaux} />}
        {vue === "resultat" && resultat?.mode === "rp" && <VueResultatRP r={resultat} onDiscuter={() => setChatOuvert(true)} onBack={() => setVue("accueil")} pro={estPro(profil)}
          onPasserPro={() => { setRaisonPro("Le détail de l'analyse « Acheter pour y vivre » est réservé au plan Pro."); setProRetour("resultat"); setVue("pro"); }} />}
        {vue === "resultat" && resultat?.mode !== "rp" && <VueResultat r={resultat} onDiscuter={() => setChatOuvert(true)} onBack={() => setVue("accueil")} verrouille={!profil?.email} onDebloquer={() => { setRetourResultat(true); setVue("profil"); }} />}
        {vue === "projets" && <VueProjets projets={projets} onNouveau={() => setVue("formulaire")} onOuvrir={(p) => { setResultat(p); setVue("resultat"); }} onSupprimer={supprimerProjet} />}
        {vue === "profil" && <VueProfil profil={profil} onSave={creerCompte} onRequestCode={demanderCode} onVerifyCode={verifierCode} onLogout={deconnecter} onDelete={supprimerCompte} nbProjets={projets.length} onVoirPro={() => { setRaisonPro(""); setVue("pro"); }} onOuvrirLegal={(p) => { setPageLegale(p); setVue("legal"); }} />}
        {vue === "legal" && <VueLegale page={pageLegale} onBack={() => setVue("profil")} />}

        {chatOuvert && <ChatIA contexte={resultat} onClose={() => setChatOuvert(false)} profil={profil} onCreerCompte={() => { setChatOuvert(false); setVue("profil"); }} />}
        {!chatOuvert && ["accueil", "biens", "outils", "projets", "profil"].includes(vue) && (
          <div
            onPointerDown={bulleDown}
            onPointerMove={bulleMove}
            onPointerUp={bulleUp}
            onPointerCancel={bulleUp}
            role="button"
            tabIndex={0}
            aria-label="Ouvrir l'assistant Exion (glisse pour déplacer)"
            className="fixed z-20 flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full exion-press"
            style={{
              bottom: "104px",
              right: "max(16px, calc(50% - 224px + 16px))",
              transform: `translate(${bulleOffset.x}px, ${bulleOffset.y}px)`,
              background: C.gradient,
              boxShadow: "0 10px 26px rgba(139,92,246,0.45)",
              touchAction: "none",
              cursor: "grab",
            }}
          >
 <span className="font-semibold whitespace-nowrap pointer-events-none" style={{ fontSize: '12.5px', color: "#fff", ...font }}>Pose-moi tes questions</span>
            <div className="w-11 h-11 rounded-full shrink-0 relative overflow-hidden">
              <img src={MASCOT_ARMS_IMG} alt="" className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: "cover" }} />
              <div className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: "inset 0 0 8px 3px rgba(16,15,44,0.5)" }} />
            </div>
          </div>
        )}
        {!chatOuvert && <NavBar vue={vue} setVue={setVue} />}
      <Analytics />
      </div>
    </div>
  );
}

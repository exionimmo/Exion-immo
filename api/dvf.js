// Relais Vercel vers les ventes immobilières DVF (Etalab / data.gouv.fr).
// Avant : on interrogeait l'API du Cerema, trop lente (jusqu'à 2 min par
// page) -> l'app abandonnait et affichait la moyenne nationale.
// Maintenant : on lit les fichiers DVF officiels déjà découpés par commune
// et par année (fichiers statiques, rapides), et on renvoie les ventes au
// même format qu'avant, pour que l'app n'ait rien à changer.
const BASE = "https://files.data.gouv.fr/geo-dvf/latest/csv";

function departement(codeInsee) {
  return codeInsee.startsWith("97") ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2);
}

// Découpe une ligne CSV en respectant les guillemets éventuels
function splitCsv(ligne) {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (q) {
      if (c === '"' && ligne[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function lireAnnee(codeInsee, annee) {
  const url = `${BASE}/${annee}/communes/${departement(codeInsee)}/${codeInsee}.csv`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return []; // année pas encore publiée ou aucune vente : on ignore
    const lignes = (await r.text()).split(/\r?\n/).filter(Boolean);
    if (lignes.length < 2) return [];
    const entete = splitCsv(lignes[0]);
    const col = (nom) => entete.indexOf(nom);
    const iId = col("id_mutation"), iDate = col("date_mutation"), iNat = col("nature_mutation"),
      iVal = col("valeur_fonciere"), iType = col("code_type_local"), iSurf = col("surface_reelle_bati");
    return lignes.slice(1).map((l) => {
      const v = splitCsv(l);
      return { id: v[iId], annee: Number(String(v[iDate]).slice(0, 4)), nature: v[iNat],
        valeur: v[iVal], type: v[iType], surface: v[iSurf] };
    });
  } catch (e) {
    return [];
  } finally {
    clearTimeout(t);
  }
}

// Une vente DVF = plusieurs lignes (une par local / parcelle). On ne garde que
// les ventes d'UN seul logement (une maison OU un appartement), pour que
// prix / surface donne un vrai prix au m².
function regrouperVentes(lignes) {
  const parMutation = new Map();
  for (const l of lignes) {
    if (!l.id) continue;
    if (!parMutation.has(l.id)) parMutation.set(l.id, { ...l, locaux: new Set(), autres: false });
    const m = parMutation.get(l.id);
    if (l.type === "1" || l.type === "2") m.locaux.add(`${l.type}|${l.surface}`);
    else if (l.type === "4") m.autres = true; // local commercial mélangé : prix faussé
  }
  const ventes = [];
  for (const m of parMutation.values()) {
    if (m.nature !== "Vente" || m.autres || m.locaux.size !== 1) continue;
    const [type, surface] = [...m.locaux][0].split("|");
    ventes.push({
      libnatmut: "Vente",
      codtypbien: type === "1" ? "111" : "121",
      anneemut: m.annee,
      valeurfonc: m.valeur,
      sbati: surface,
    });
  }
  return ventes;
}

const sansAccents = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Trouve le code INSEE d'une commune à partir de son nom et de son code postal.
// Fait côté serveur : plus fiable que depuis le navigateur du visiteur.
async function codeCommune(ville, cp) {
  const nom = sansAccents(ville);
  try {
    const r = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(cp)}&fields=nom,code`);
    if (r.ok) {
      const communes = await r.json();
      if (Array.isArray(communes) && communes.length) {
        const exacte = communes.find((c) => sansAccents(c.nom) === nom);
        const proche = communes.find((c) => nom && (sansAccents(c.nom).includes(nom) || nom.includes(sansAccents(c.nom))));
        const c = exacte || proche || (communes.length === 1 ? communes[0] : null);
        if (c) return c.code;
      }
    }
  } catch (e) {}
  try {
    const r = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(ville)}&postcode=${encodeURIComponent(cp)}&type=municipality&limit=1`);
    if (r.ok) {
      const d = await r.json();
      return d?.features?.[0]?.properties?.citycode || null;
    }
  } catch (e) {}
  return null;
}

export default async function handler(req, res) {
  // Mode « code commune » : /api/dvf?ville=Fréjus&cp=83600
  if (req.query?.ville !== undefined) {
    const ville = String(req.query.ville || "").slice(0, 80);
    const cp = String(req.query.cp || "").trim();
    if (!/^[0-9][0-9AB][0-9]{3}$/.test(cp)) return res.status(400).json({ error: "code postal invalide" });
    const code_insee = await codeCommune(ville, cp);
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({ code_insee });
  }

  const { code_insee = "", codtypbien = "", anneemut_min = "", page = "1" } = req.query || {};
  if (!/^[0-9][0-9AB][0-9]{3}$/.test(code_insee) || !["111", "121"].includes(codtypbien)
    || !/^[0-9]{4}$/.test(anneemut_min) || !/^[1-9][0-9]?$/.test(page)) {
    return res.status(400).json({ error: "paramètres invalides" });
  }
  // Tout est renvoyé d'un coup en page 1
  if (page !== "1") return res.status(200).json({ count: 0, next: false, results: [] });

  const anneeActuelle = new Date().getFullYear();
  const annees = [];
  for (let a = Math.max(Number(anneemut_min), anneeActuelle - 10); a <= anneeActuelle; a++) annees.push(a);

  const lignes = (await Promise.all(annees.map((a) => lireAnnee(code_insee, a)))).flat();
  const results = regrouperVentes(lignes).filter((v) => v.codtypbien === codtypbien);

  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).json({ count: results.length, next: false, results });
}

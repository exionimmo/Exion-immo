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

// Nombre de lettres à changer pour passer d'un mot à l'autre (tolère les fautes de frappe)
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

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
        // Faute de frappe (« Fregus » pour « Fréjus ») : la commune du code postal au nom le plus proche
        const tri = communes.map((c) => ({ c, d: distance(nom, sansAccents(c.nom)) })).sort((x, y) => x.d - y.d);
        const ressemblante = nom && tri[0].d <= Math.max(2, Math.floor(nom.length / 3)) ? tri[0].c : null;
        const c = exacte || proche || ressemblante || (communes.length === 1 ? communes[0] : null);
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

// Paris, Lyon et Marseille : les ventes (et les loyers) sont rangées par
// arrondissement. On remplace le code de la ville par celui de l'arrondissement,
// déduit du code postal (75011 -> 75111, 69003 -> 69383, 13008 -> 13208).
function codeArrondissement(code, cp) {
  const n = Number(cp.slice(-2));
  if (code === "75056" && /^75(0(0[1-9]|1[0-9]|20)|116)$/.test(cp)) return cp === "75116" ? "75116" : `751${cp.slice(-2)}`;
  if (code === "69123" && n >= 1 && n <= 9 && cp.startsWith("6900")) return `6938${n}`;
  if (code === "13055" && n >= 1 && n <= 16 && cp.startsWith("130")) return `132${cp.slice(-2)}`;
  return code;
}

export default async function handler(req, res) {
  // Mode « code commune » : /api/dvf?ville=Fréjus&cp=83600
  if (req.query?.ville !== undefined) {
    const ville = String(req.query.ville || "").slice(0, 80);
    const cp = String(req.query.cp || "").trim();
    if (!/^[0-9][0-9AB][0-9]{3}$/.test(cp)) return res.status(400).json({ error: "code postal invalide" });
    const trouve = await codeCommune(ville, cp);
    const code_insee = trouve ? codeArrondissement(trouve, cp) : null;
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

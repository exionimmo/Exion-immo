// Relais Vercel vers l'API Données foncières du Cerema (ventes DVF).
// Le navigateur ne peut pas interroger le Cerema directement, ce petit
// serveur le fait à sa place et ne renvoie que les champs utiles.
export default async function handler(req, res) {
  const { code_insee = "", codtypbien = "", anneemut_min = "", page = "1" } = req.query || {};
  if (!/^[0-9][0-9AB][0-9]{3}$/.test(code_insee) || !["111", "121"].includes(codtypbien)
    || !/^[0-9]{4}$/.test(anneemut_min) || !/^[1-9][0-9]?$/.test(page)) {
    return res.status(400).json({ error: "paramètres invalides" });
  }
  const url = `https://apidf-preprod.cerema.fr/dvf_opendata/mutations/?code_insee=${code_insee}&codtypbien=${codtypbien}&anneemut_min=${anneemut_min}&page_size=500&page=${page}`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return res.status(502).json({ error: `Cerema ${r.status}` });
    const data = await r.json();
    const results = (Array.isArray(data?.results) ? data.results : []).map((v) => ({
      libnatmut: v.libnatmut, codtypbien: v.codtypbien, anneemut: v.anneemut, valeurfonc: v.valeurfonc, sbati: v.sbati,
    }));
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({ count: data?.count || 0, next: !!data?.next, results });
  } catch (e) {
    return res.status(502).json({ error: "Cerema injoignable" });
  }
}

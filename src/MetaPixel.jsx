import React, { useEffect, useState } from "react";

/* =========================================================
   Pixel Meta + bandeau cookies (RGPD) — Exion Immo
   Le pixel n'est chargé QUE si le visiteur clique "Accepter".
   ========================================================= */

const PIXEL_ID = "1760630188492570";
const CLE = "exion_cookies"; // "oui" | "non"

function lireChoix() {
  try { return localStorage.getItem(CLE); } catch (e) { return null; }
}

function chargerPixel() {
  if (window.fbq) return;
  const n = (window.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView");
}

// À appeler depuis l'app : window.exionTrack("CompleteRegistration")
// N'envoie rien si le visiteur a refusé les cookies.
// Événements standard Meta (PageView, ViewContent, CompleteRegistration…) ou personnalisés (AnalyseLancee…)
const EVENEMENTS_STANDARD = ["PageView", "ViewContent", "CompleteRegistration", "Lead", "Search", "InitiateCheckout", "Purchase", "Subscribe", "StartTrial"];
window.exionTrack = (evenement) => {
  if (lireChoix() !== "oui" || !window.fbq) return;
  window.fbq(EVENEMENTS_STANDARD.includes(evenement) ? "track" : "trackCustom", evenement);
};

// Pour un futur lien "Gérer mes cookies" : window.exionCookies()
window.exionCookies = () => {
  try { localStorage.removeItem(CLE); } catch (e) {}
  window.location.reload();
};

export default function BandeauCookies() {
  const [choix, setChoix] = useState(lireChoix);

  useEffect(() => {
    if (choix === "oui") chargerPixel();
  }, [choix]);

  if (choix) return null;

  const decider = (valeur) => {
    try { localStorage.setItem(CLE, valeur); } catch (e) {}
    setChoix(valeur);
  };

  const bouton = {
    flex: 1,
    padding: "11px 14px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div
      role="dialog"
      aria-label="Choix des cookies"
      style={{
        position: "fixed",
        left: "12px",
        right: "12px",
        bottom: "12px",
        zIndex: 9999,
        maxWidth: "520px",
        margin: "0 auto",
        background: "#1A1B42",
        border: "1px solid rgba(139,92,246,0.35)",
        borderRadius: "16px",
        padding: "16px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>
        On mesure l'efficacité de nos pubs ?
      </p>
      <p style={{ margin: "6px 0 14px", fontSize: "13px", lineHeight: 1.5, color: "#8C97B3" }}>
        Avec ton accord, Exion Immo utilise un cookie Meta (Facebook et Instagram) pour savoir
        quelles publicités amènent des visiteurs et des inscriptions. Refuser ne change rien à
        l'utilisation de l'app.
      </p>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => decider("non")}
          style={{ ...bouton, background: "transparent", color: "#E7ECF6", border: "1px solid #8C97B3" }}
        >
          Refuser
        </button>
        <button
          onClick={() => decider("oui")}
          style={{
            ...bouton,
            color: "#FFFFFF",
            border: "none",
            background: "linear-gradient(135deg, #14F1D9 0%, #8B5CF6 55%, #EC4899 100%)",
          }}
        >
          Accepter
        </button>
      </div>
    </div>
  );
}

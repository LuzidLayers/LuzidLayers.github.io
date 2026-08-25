/* ──────────────────────────────────────────────────────────────────────────
   LuZiD LaYeRs — Schriftwahl auf jeder Seite
   Ein kleiner Knopf unten rechts. Draufdrücken, Schrift antippen, fertig —
   die ganze Seite stellt sofort um, und die Wahl wandert mit auf jede andere
   Seite (sessionStorage, derselbe Schlüssel wie beim Intro auf home.html).
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var SCHLUESSEL = "ll_font";
  var STANDARD   = "Luzid Speedlines";

  var SCHRIFTEN = [
    { name: "Luzid Speedlines", standard: true },
    { name: "C1st Font" },
    { name: "Luzid Wurm" },
    { name: "Luzid PinkSketch" },
    { name: "Luzid GruenGelb" },
    { name: "Luzid Camo" },
    { name: "Luzid Candy" },
    { name: "Luzid Knochen" },
    { name: "Luzid Kugelschreiber", hinweis: "keine großen Umlaute" },
    { name: "Luzid Melting" },
    { name: "Luzid Marker",         hinweis: "nur Buchstaben, keine Ziffern" }
  ];

  /* sessionStorage kann in strengen Einstellungen werfen — nie daran scheitern */
  function lies() {
    try { return sessionStorage.getItem(SCHLUESSEL); } catch (e) { return null; }
  }
  function schreib(wert) {
    try { sessionStorage.setItem(SCHLUESSEL, wert); } catch (e) { /* egal */ }
  }

  function aktuelle() { return lies() || STANDARD; }

  function anwenden(name) {
    document.documentElement.style.setProperty("--brand-font", "'" + name + "'");
    /* fonts.html setzt beim Ausprobieren body.style.fontFamily — das würde
       unsere Wahl überstimmen, also räumen wir es weg. */
    if (document.body && document.body.style.fontFamily) {
      document.body.style.fontFamily = "";
    }
  }

  var stile =
    '.sw-knopf{position:fixed;right:18px;bottom:18px;z-index:8000;' +
      'width:46px;height:46px;border-radius:50%;display:grid;place-items:center;' +
      'background:rgba(12,14,20,.82);backdrop-filter:blur(10px);' +
      'border:1px solid rgba(255,255,255,.22);color:rgba(255,255,255,.85);' +
      'font-family:var(--brand-font),serif;font-size:19px;line-height:1;' +
      'padding:0;transition:border-color .2s,transform .2s,background .2s}' +
    '.sw-knopf:hover{border-color:rgba(255,255,255,.6);transform:translateY(-2px)}' +
    '.sw-knopf:focus-visible{outline:2px solid #fff;outline-offset:3px}' +

    '.sw-blende{position:fixed;inset:0;z-index:7999;background:rgba(0,0,0,.45);' +
      'opacity:0;pointer-events:none;transition:opacity .18s}' +
    '.sw-blende.auf{opacity:1;pointer-events:auto}' +

    '.sw-tafel{position:fixed;right:18px;bottom:74px;z-index:8001;width:262px;' +
      'max-height:min(70vh,520px);overflow-y:auto;border-radius:16px;' +
      'background:rgba(10,12,17,.94);backdrop-filter:blur(14px);' +
      'border:1px solid rgba(255,255,255,.16);' +
      'box-shadow:0 24px 60px -20px rgba(0,0,0,.9);' +
      'padding:8px;opacity:0;transform:translateY(8px) scale(.98);' +
      'pointer-events:none;transition:opacity .18s,transform .18s}' +
    '.sw-tafel.auf{opacity:1;transform:none;pointer-events:auto}' +
    '@media(max-width:420px){.sw-tafel{left:18px;width:auto}}' +

    '.sw-kopf{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:9.5px;' +
      'letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.4);' +
      'padding:8px 12px 10px}' +

    '.sw-eintrag{display:flex;align-items:baseline;gap:9px;width:100%;text-align:left;' +
      'padding:9px 12px;border-radius:10px;border:1px solid transparent;' +
      'background:transparent;color:rgba(255,255,255,.9);transition:background .15s}' +
    '.sw-eintrag:hover{background:rgba(255,255,255,.07)}' +
    '.sw-eintrag:focus-visible{outline:2px solid #fff;outline-offset:-2px}' +
    '.sw-eintrag.jetzt{background:rgba(255,255,255,.11);border-color:rgba(255,255,255,.28)}' +
    '.sw-probe{font-size:21px;line-height:1;width:34px;flex:none}' +
    '.sw-text{flex:1;min-width:0}' +
    '.sw-name{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11px;' +
      'letter-spacing:.08em;display:block;white-space:nowrap;overflow:hidden;' +
      'text-overflow:ellipsis}' +
    '.sw-hinweis{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:8.5px;' +
      'letter-spacing:.06em;color:rgba(255,255,255,.34);display:block;margin-top:2px}' +
    '.sw-marke{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:8px;' +
      'letter-spacing:.14em;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.28);' +
      'border-radius:20px;padding:1px 6px;flex:none;align-self:center}' +

    '.sw-fuss{padding:9px 12px 6px;border-top:1px solid rgba(255,255,255,.1);margin-top:6px;' +
      'font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:8.5px;' +
      'letter-spacing:.06em;color:rgba(255,255,255,.32);line-height:1.5}' +
    '.sw-fuss a{color:rgba(255,255,255,.55);text-decoration:underline}' +

    '@media(prefers-reduced-motion:reduce){' +
      '.sw-knopf,.sw-tafel,.sw-blende{transition:none!important}}';

  function bauen() {
    /* Auf home.html führt das Intro selbst durch die Wahl — solange es liegt,
       bleibt der Knopf weg, damit er nicht darüber schwebt. */
    var intro = document.getElementById("intro");

    var blatt = document.createElement("style");
    blatt.textContent = stile;
    document.head.appendChild(blatt);

    var knopf = document.createElement("button");
    knopf.className = "sw-knopf";
    knopf.type = "button";
    knopf.textContent = "Aa";
    knopf.setAttribute("aria-haspopup", "true");
    knopf.setAttribute("aria-expanded", "false");
    knopf.title = "Schrift wechseln";
    knopf.setAttribute("aria-label", "Schrift wechseln");

    var blende = document.createElement("div");
    blende.className = "sw-blende";

    var tafel = document.createElement("div");
    tafel.className = "sw-tafel";
    tafel.setAttribute("role", "menu");
    tafel.setAttribute("aria-label", "Schrift wählen");

    var kopf = document.createElement("div");
    kopf.className = "sw-kopf";
    kopf.textContent = "Schrift · gilt für die ganze Seite";
    tafel.appendChild(kopf);

    SCHRIFTEN.forEach(function (f) {
      var e = document.createElement("button");
      e.className = "sw-eintrag";
      e.type = "button";
      e.setAttribute("role", "menuitem");
      e.dataset.font = f.name;

      var probe = document.createElement("span");
      probe.className = "sw-probe";
      probe.style.fontFamily = "'" + f.name + "', serif";
      probe.textContent = "Aa";

      var text = document.createElement("span");
      text.className = "sw-text";
      var nm = document.createElement("span");
      nm.className = "sw-name";
      nm.textContent = f.name.replace("Luzid ", "");
      text.appendChild(nm);
      if (f.hinweis) {
        var hw = document.createElement("span");
        hw.className = "sw-hinweis";
        hw.textContent = f.hinweis;
        text.appendChild(hw);
      }

      e.appendChild(probe);
      e.appendChild(text);
      if (f.standard) {
        var m = document.createElement("span");
        m.className = "sw-marke";
        m.textContent = "STANDARD";
        e.appendChild(m);
      }

      e.addEventListener("click", function () {
        anwenden(f.name);
        schreib(f.name);
        markieren();
        zu();
        knopf.focus();
      });
      tafel.appendChild(e);
    });

    var fuss = document.createElement("div");
    fuss.className = "sw-fuss";
    fuss.innerHTML = 'Gilt für diesen Besuch. Alle elf gibt es auf der ' +
                     '<a href="fonts.html">Schriften-Seite</a> zum Mitnehmen.';
    tafel.appendChild(fuss);

    document.body.appendChild(blende);
    document.body.appendChild(tafel);
    document.body.appendChild(knopf);

    function markieren() {
      var jetzt = aktuelle();
      tafel.querySelectorAll(".sw-eintrag").forEach(function (e) {
        var an = e.dataset.font === jetzt;
        e.classList.toggle("jetzt", an);
        e.setAttribute("aria-current", an ? "true" : "false");
      });
    }

    var offen = false;
    function auf() {
      offen = true;
      markieren();
      tafel.classList.add("auf");
      blende.classList.add("auf");
      knopf.setAttribute("aria-expanded", "true");
      var jetzt = tafel.querySelector(".sw-eintrag.jetzt") || tafel.querySelector(".sw-eintrag");
      if (jetzt) jetzt.focus();
    }
    function zu() {
      offen = false;
      tafel.classList.remove("auf");
      blende.classList.remove("auf");
      knopf.setAttribute("aria-expanded", "false");
    }

    knopf.addEventListener("click", function () { offen ? zu() : auf(); });
    blende.addEventListener("click", zu);
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && offen) { zu(); knopf.focus(); }
    });

    markieren();

    /* Intro auf home.html: Knopf erst zeigen, wenn es weg ist. */
    if (intro) {
      var pruefe = function () {
        var weg = intro.style.display === "none" ||
                  intro.classList.contains("out") ||
                  !document.body.contains(intro);
        knopf.style.display = weg ? "grid" : "none";
      };
      pruefe();
      new MutationObserver(pruefe).observe(intro, {
        attributes: true, attributeFilter: ["style", "class"]
      });
    }
  }

  /* Gewählte Schrift sofort anwenden — auch wenn das Inline-Skript im Kopf
     schon lief, schadet ein zweites Mal nicht. */
  var gewaehlt = lies();
  if (gewaehlt) anwenden(gewaehlt);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bauen);
  } else {
    bauen();
  }
})();

/* TABI TABI PO — guest RSVP flow */
(function () {
  "use strict";
  var CFG = window.TTP_CONFIG || {};
  var STORE_KEY = "ttp_ticket_" + (CFG.eventSlug || "event");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var configured = CFG.supabaseUrl && CFG.supabaseAnonKey &&
    CFG.supabaseUrl.indexOf("YOUR-") === -1 && CFG.supabaseAnonKey.indexOf("YOUR-") === -1;
  var db = (configured && window.supabase)
    ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: false } })
    : null;

  function rpc(name, args) {
    if (!db) return Promise.reject(new Error("RSVPs aren't open yet: the site isn't connected to the database. Please try again later."));
    return db.rpc(name, args).then(function (res) {
      if (res.error) throw new Error(res.error.message || "Something went wrong. Please try again.");
      return res.data;
    });
  }

  function eventDateLabel() {
    if (CFG.eventStartISO && (!CFG.dateLabel || CFG.dateLabel === "Date TBA")) {
      try {
        return new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Manila" })
          .format(new Date(CFG.eventStartISO));
      } catch (e) { /* fall through */ }
    }
    return CFG.dateLabel || "Date TBA";
  }
  var DATE_LABEL = eventDateLabel();
  var TBA = /tba/i.test(DATE_LABEL);
  var WHEN = DATE_LABEL + " · " + (CFG.timeLabel || "");

  function fillConfig() {
    $$("[data-cfg]").forEach(function (el) {
      var k = el.getAttribute("data-cfg");
      if (k === "dateLabel") el.textContent = TBA ? "[" + DATE_LABEL + "]" : DATE_LABEL;
      else if (CFG[k]) el.textContent = CFG[k];
    });
    var djs = (CFG.djs && CFG.djs.length ? CFG.djs : ["DJ Name"]).map(function (n) {
      return /^dj name$/i.test(n) ? "[" + n + "]" : n;
    });
    var djEl = $("#djs");
    djEl.textContent = "";
    djs.forEach(function (n, i) {
      if (i) { var x = document.createElement("span"); x.className = "x"; x.textContent = "x"; djEl.appendChild(x); }
      djEl.appendChild(document.createTextNode(n));
    });
    if (CFG.mapsUrl) $("#maps-link").href = CFG.mapsUrl;
    if (CFG.contactEmail) { $("#f-mail").href = "mailto:" + CFG.contactEmail; $("#f-mail").textContent = CFG.contactEmail; }
    if (CFG.instagram) $("#f-ig").href = CFG.instagram;
    if (CFG.facebook) $("#f-fb").href = CFG.facebook;
    if (CFG.website) $("#f-web").href = CFG.website;
    if (!CFG.requireAdult) $("#adult-wrap").remove();

    if (CFG.perks && CFG.perks.length) {
      var box = $("#perks");
      CFG.perks.forEach(function (p) {
        var d = document.createElement("div"); d.className = "perk";
        var ic = document.createElement("span"); ic.className = "ic"; ic.textContent = p.icon || "✦";
        var tx = document.createElement("div");
        var b = document.createElement("b"); b.textContent = p.title || "";
        var s = document.createElement("span"); s.textContent = p.text || "";
        tx.appendChild(b); tx.appendChild(s); d.appendChild(ic); d.appendChild(tx); box.appendChild(d);
      });
      box.hidden = false;
    }
  }

  function startCountdown() {
    if (!CFG.eventStartISO) return;
    var target = new Date(CFG.eventStartISO).getTime();
    if (isNaN(target)) return;
    var wrap = $("#countdown"); wrap.hidden = false;
    var t;
    function tick() {
      var diff = Math.max(0, target - Date.now());
      var d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
      $("#cd-d").textContent = d; $("#cd-h").textContent = h; $("#cd-m").textContent = m; $("#cd-s").textContent = s;
      if (diff <= 0) { wrap.hidden = true; clearInterval(t); }
    }
    tick(); t = setInterval(tick, 1000);
  }

  function watchEyes() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var eyes = $$(".eye");
    var raf = null, lx = 0, ly = 0;
    window.addEventListener("pointermove", function (e) {
      lx = e.clientX; ly = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        eyes.forEach(function (eye) {
          var r = eye.getBoundingClientRect();
          var dx = lx - (r.left + r.width / 2), dy = ly - (r.top + r.height / 2);
          var len = Math.hypot(dx, dy) || 1;
          var max = r.width * 0.3;
          var k = Math.min(1, len / 300);
          eye.style.setProperty("--px", (dx / len * max * k).toFixed(1) + "px");
          eye.style.setProperty("--py", (dy / len * r.height * 0.12 * k).toFixed(1) + "px");
        });
      });
    }, { passive: true });
  }

  function saveLocal(t) { try { localStorage.setItem(STORE_KEY, JSON.stringify(t)); } catch (e) {} }
  function loadLocal() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { return null; } }
  function clearLocal() { try { localStorage.removeItem(STORE_KEY); } catch (e) {} }

  var MYTHS = ["Tikbalang", "Kapre", "Manananggal", "Aswang", "Diwata", "Nuno sa Punso", "Tiyanak", "White Lady", "Sirena"];
  var QUESTIONS = [
    { key: "costume", title: "Who are you coming as?", hint: "For best in costume. Pick one or type your own.", type: "single", other: true,
      options: MYTHS.concat(["Still deciding"]) },
    { key: "drink", title: "What's usually in your hand on a night out?", type: "single",
      options: ["Beer", "Cocktails", "Wine", "Shots", "Mocktails / non-alc", "I don't drink"] },
    { key: "staying", title: "Where are you staying that night?", type: "single",
      options: ["Staying at Z Hostel", "Elsewhere in Poblacion", "Heading home after", "Still deciding"] },
    { key: "payment", title: "How do you usually pay at events like this?", type: "single",
      options: ["GCash / Maya", "Cash", "Credit / debit card"] },
    { key: "interests", title: "What are you coming for?", hint: "Pick as many as you like.", type: "multi",
      options: ["DJ sets", "Dancing", "Costumes & photos", "Drinks", "Contests", "Meeting new people"] },
    { key: "age_bracket", title: "Age bracket", hint: "Helps us plan the night.", type: "single",
      options: ["18–24", "25–34", "35–44", "45+"] },
    { key: "notes", title: "Anything else we should know?", hint: "Accessibility needs, group bookings, questions for the team.", type: "text" }
  ];
  var TOTAL_STEPS = QUESTIONS.length + 1;

  var state = { ticket: null, email: null, answers: { interests: [] }, qIndex: 0 };

  function setProgress(stepNumber) { $("#progress-bar").style.width = Math.min(100, (stepNumber / (TOTAL_STEPS + 1)) * 100) + "%"; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function renderQuestion(i) {
    var q = QUESTIONS[i];
    var box = $("#questions");
    box.textContent = "";
    var step = el("div", "step"); step.tabIndex = -1;

    if (i === 0) {
      var made = el("p", "made-it");
      made.appendChild(el("b", null, "You're on the list. "));
      made.appendChild(document.createTextNode("These next few are optional, one tap each. Skip whenever you like."));
      step.appendChild(made);
    }
    step.appendChild(el("p", "step-count", "Optional · " + (i + 1) + " of " + QUESTIONS.length));
    var h = el("h3", "step-title", q.title); h.id = "q-title-" + q.key; step.appendChild(h);
    if (q.hint) step.appendChild(el("p", "hint", q.hint));

    if (q.type === "text") {
      var ta = document.createElement("textarea"); ta.maxLength = 1000; ta.setAttribute("aria-labelledby", h.id);
      ta.value = state.answers[q.key] || "";
      ta.addEventListener("input", function () { state.answers[q.key] = ta.value; });
      step.appendChild(ta);
    } else {
      var chips = el("div", "chips"); chips.setAttribute("role", "group"); chips.setAttribute("aria-labelledby", h.id);
      var otherInput = null;
      q.options.forEach(function (opt) {
        var c = el("button", "chip", opt); c.type = "button";
        var selected = q.type === "multi" ? state.answers[q.key].indexOf(opt) > -1 : state.answers[q.key] === opt;
        c.setAttribute("aria-pressed", selected ? "true" : "false");
        c.addEventListener("click", function () {
          if (q.type === "multi") {
            var arr = state.answers[q.key], at = arr.indexOf(opt);
            if (at > -1) arr.splice(at, 1); else arr.push(opt);
            c.setAttribute("aria-pressed", at > -1 ? "false" : "true");
          } else {
            state.answers[q.key] = opt;
            $$(".chip", chips).forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
            if (otherInput) otherInput.value = "";
            saveProgress();
            setTimeout(function () { go(i + 1); }, 220);
          }
        });
        chips.appendChild(c);
      });
      step.appendChild(chips);
      if (q.other) {
        otherInput = document.createElement("input"); otherInput.type = "text"; otherInput.className = "other-input";
        otherInput.placeholder = "Something else? Type it here"; otherInput.maxLength = 80;
        otherInput.setAttribute("aria-label", "Other answer");
        if (state.answers[q.key] && q.options.indexOf(state.answers[q.key]) === -1) otherInput.value = state.answers[q.key];
        otherInput.addEventListener("input", function () {
          state.answers[q.key] = otherInput.value;
          $$(".chip", chips).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        });
        step.appendChild(otherInput);
      }
    }

    var nav = el("div", "step-nav");
    var left = el("div");
    if (i > 0) {
      var back = el("button", "linkbtn", "Back"); back.type = "button";
      back.addEventListener("click", function () { go(i - 1); });
      left.appendChild(back);
    }
    var skipAll = el("button", "linkbtn", "Skip the rest, show my ticket"); skipAll.type = "button";
    skipAll.style.marginLeft = i > 0 ? "18px" : "0";
    skipAll.addEventListener("click", function () { finish(false); });
    left.appendChild(skipAll);
    nav.appendChild(left);

    var last = i === QUESTIONS.length - 1;
    var nextBtn = el("button", "btn", last ? "Get my ticket" : (q.type === "single" && !q.other ? "Skip" : "Continue"));
    if (!last && q.type === "single" && !q.other) nextBtn.className = "btn ghost";
    nextBtn.type = "button";
    nextBtn.addEventListener("click", function () {
      if (last) finish(true);
      else { saveProgress(); go(i + 1); }
    });
    nav.appendChild(nextBtn);
    step.appendChild(nav);

    box.appendChild(step);
    setProgress(i + 2);
    step.focus({ preventScroll: true });
  }

  function go(i) {
    if (i < 0) return;
    if (i >= QUESTIONS.length) { finish(true); return; }
    state.qIndex = i;
    renderQuestion(i);
  }

  var saveTimer = null;
  function surveyPayload(completed) {
    var a = state.answers;
    return {
      p_ticket_code: state.ticket.code, p_email: state.email,
      p_drink: a.drink || null, p_staying: a.staying || null, p_payment: a.payment || null,
      p_interests: (a.interests && a.interests.length) ? a.interests : null,
      p_age_bracket: a.age_bracket || null, p_costume: a.costume || null, p_notes: a.notes || null,
      p_completed: !!completed
    };
  }
  function saveProgress() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { rpc("rsvp_update_survey", surveyPayload(false)).catch(function () {}); }, 400);
  }

  function finish(completed) {
    clearTimeout(saveTimer);
    $("#questions").textContent = "";
    showTicket(state.ticket, false);
    rpc("rsvp_update_survey", surveyPayload(completed)).catch(function () { /* guest already on the list */ });
  }

  function initBasics() {
    var form = $("#step-basics");
    var party = null;
    $$(".chips[data-single=party_size] .chip", form).forEach(function (c, _, all) {
      c.addEventListener("click", function () {
        var on = c.getAttribute("aria-pressed") !== "true";
        all.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        c.setAttribute("aria-pressed", on ? "true" : "false");
        party = on ? c.getAttribute("data-value") : null;
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("#basics-error"); err.textContent = "";
      var name = form.full_name.value.trim();
      var email = form.email.value.trim();
      if (!name) { err.textContent = "Enter your full name."; form.full_name.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = "Enter a valid email address, like juan@gmail.com."; form.email.focus(); return; }
      if (form.adult && !form.adult.checked) { err.textContent = "This is an 18+ event. Tick the box to confirm."; form.adult.focus(); return; }

      var btn = $("#basics-submit"); btn.disabled = true; btn.textContent = "Saving…";
      rpc("rsvp_create", {
        p_event_slug: CFG.eventSlug, p_full_name: name, p_email: email,
        p_phone: form.phone.value.trim() || null, p_party_size: party
      }).then(function (data) {
        state.ticket = { code: data.ticket_code, name: data.full_name, email: email.toLowerCase() };
        state.email = email.toLowerCase();
        state.returning = !!data.returning;
        saveLocal(state.ticket);
        form.hidden = true;
        go(0);
      }).catch(function (ex) {
        err.textContent = ex.message;
      }).then(function () { btn.disabled = false; btn.textContent = "Save my spot"; });
    });
  }

  function showTicket(t, fromDevice) {
    $("#step-basics").hidden = true;
    $("#questions").textContent = "";
    $("#saved-ticket").hidden = true;
    var step = $("#step-ticket"); step.hidden = false;
    $("#ticket-heading").textContent = (fromDevice || state.returning) ? "Here's your ticket." : "You're on the list.";
    $("#t-name").textContent = t.name;
    $("#t-code").textContent = t.code;
    $("#t-when").textContent = WHEN + " · " + (CFG.venue || "");
    var qrBox = $("#qr"); qrBox.textContent = "";
    if (window.QRCode) {
      new window.QRCode(qrBox, {
        text: t.code, width: 480, height: 480,
        colorDark: "#131311", colorLight: "#F2EFE6", correctLevel: window.QRCode.CorrectLevel.M
      });
    } else {
      qrBox.textContent = "QR couldn't load. Show this code at the door: " + t.code;
    }
    setProgress(TOTAL_STEPS + 1);
    step.focus({ preventScroll: true });
    $("#rsvp").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function loadImage(src) {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; });
  }

  function drawTicketPNG(t) {
    var W = 1080, H = 1500, c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d");
    var ink = "#131311", bone = "#F2EFE6", gold = "#F5C518";
    g.fillStyle = ink; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(242,239,230,.17)"; g.lineWidth = 2;
    for (var x = 0; x <= W; x += W / 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (var y = 0; y <= H; y += W / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

    function spaced(text, cx, cy, size, track, color) {
      g.font = "600 " + size + "px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif";
      g.fillStyle = color || bone; g.textBaseline = "middle"; g.textAlign = "left";
      var chars = text.toUpperCase().split(""), widths = chars.map(function (ch) { return g.measureText(ch).width; });
      var total = widths.reduce(function (a, b) { return a + b; }, 0) + track * (chars.length - 1);
      var px = cx - total / 2;
      chars.forEach(function (ch, i) { g.fillText(ch, px, cy); px += widths[i] + track; });
    }

    return loadImage("assets/z-hostel-logo.png").catch(function () { return null; }).then(function (logo) {
      if (logo) g.drawImage(logo, W / 2 - 70, 60, 140, 140);
      spaced("Salakot opening night · Halloween", W / 2, 250, 30, 10);
      g.textAlign = "center"; g.textBaseline = "alphabetic";
      g.font = "900 150px 'Archivo', 'Arial Black', sans-serif";
      try { g.fontStretch = "expanded"; } catch (e) {}
      g.fillStyle = bone; g.shadowColor = "rgba(245,197,24,.75)"; g.shadowBlur = 40;
      g.fillText("TABI TABI PO", W / 2, 420, W - 100);
      g.shadowBlur = 0;

      var cardX = 170, cardY = 490, cardW = W - 340, cardH = 840;
      g.fillStyle = bone;
      if (g.roundRect) { g.beginPath(); g.roundRect(cardX, cardY, cardW, cardH, 28); g.fill(); } else g.fillRect(cardX, cardY, cardW, cardH);
      var qrCanvas = $("#qr canvas"), qrImg = $("#qr img");
      var src = (qrCanvas && qrCanvas.width) ? qrCanvas : qrImg;
      g.imageSmoothingEnabled = false;
      if (src) g.drawImage(src, W / 2 - 260, cardY + 40, 520, 520);
      g.imageSmoothingEnabled = true;
      g.fillStyle = ink; g.textAlign = "center";
      g.font = "700 46px 'Archivo', Arial, sans-serif";
      g.fillText(t.name, W / 2, cardY + 640, cardW - 60);
      g.font = "800 54px 'Archivo', Arial, sans-serif";
      g.fillText(t.code, W / 2, cardY + 715);
      g.font = "400 30px 'Archivo', Arial, sans-serif"; g.fillStyle = "#555";
      g.fillText(WHEN, W / 2, cardY + 775, cardW - 60);

      spaced((CFG.venue || "") + " · Poblacion Makati", W / 2, 1400, 26, 7, gold);
      return new Promise(function (res) { c.toBlob(res, "image/png"); });
    });
  }

  function initTicketActions() {
    $("#download-ticket").addEventListener("click", function () {
      var t = state.ticket || loadLocal(); if (!t) return;
      var btn = this; btn.disabled = true; $("#ticket-error").textContent = "";
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { return drawTicketPNG(t); }).then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a"); a.href = url; a.download = "tabi-tabi-po-" + t.code + ".png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      }).catch(function () {
        $("#ticket-error").textContent = "Download didn't work on this browser. Take a screenshot of the ticket instead.";
      }).then(function () { btn.disabled = false; });
    });

    $("#new-rsvp").addEventListener("click", function () {
      clearLocal();
      state = { ticket: null, email: null, answers: { interests: [] }, qIndex: 0 };
      var form = $("#step-basics"); form.reset(); form.hidden = false;
      $$(".chip", form).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      $("#step-ticket").hidden = true; setProgress(1);
      form.full_name.focus();
    });

    $("#show-saved").addEventListener("click", function () {
      var t = loadLocal(); if (!t) return;
      state.ticket = t; state.email = t.email;
      showTicket(t, true);
    });
  }

  fillConfig();
  startCountdown();
  watchEyes();
  initBasics();
  initTicketActions();
  setProgress(1);

  var saved = loadLocal();
  if (saved && saved.code) { $("#saved-name").textContent = saved.name; $("#saved-ticket").hidden = false; }
  if (!db) $("#basics-error").textContent = configured ? "Couldn't load the RSVP service. Check your connection and refresh." : "";
})();

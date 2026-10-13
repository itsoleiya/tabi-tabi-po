/* TABI TABI PO — ambient motion: living eyes, fireflies (alitaptap), scroll reveals.
   Everything here is decorative and switches off for visitors who prefer reduced motion. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var visible = !document.hidden;
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; });

  /* ---------- 1. The eyes look around on their own ---------- */
  function livingEyes() {
    var eyes = $$(".hero .eye");
    if (!eyes.length || reduce) return;
    // [x, y] in "fraction of max travel"; a mix of glances, a long stare ahead, and peeks at the page
    var spots = [[0, 0], [0, 0], [-1, 0], [1, 0], [-0.8, 0.6], [0.8, 0.6], [-0.6, -0.5], [0.6, -0.5], [0, 0.8], [-1, 0.3], [1, 0.3]];
    var lastSpot = 0;

    function look(x, y, speed) {
      eyes.forEach(function (eye) {
        var r = eye.getBoundingClientRect();
        var pupil = eye.firstElementChild;
        if (pupil) pupil.style.transitionDuration = speed + "s";
        eye.style.setProperty("--px", (x * r.width * 0.3).toFixed(1) + "px");
        eye.style.setProperty("--py", (y * r.height * 0.12).toFixed(1) + "px");
      });
    }
    function blink(times) {
      eyes.forEach(function (e) { e.classList.remove("blink"); void e.offsetWidth; e.classList.add("blink"); });
      if (times > 1) setTimeout(function () { blink(times - 1); }, 230);
    }
    function nextLook() {
      if (visible) {
        var i; do { i = Math.floor(Math.random() * spots.length); } while (i === lastSpot);
        lastSpot = i;
        var slow = Math.random() < 0.25;                 // sometimes a slow, suspicious drift
        look(spots[i][0], spots[i][1], slow ? rand(0.8, 1.4) : rand(0.12, 0.22));
        if (Math.random() < 0.18) setTimeout(function () { blink(Math.random() < 0.3 ? 2 : 1); }, rand(80, 260));
      }
      setTimeout(nextLook, rand(900, 3200));
    }
    function nextBlink() {
      if (visible) blink(Math.random() < 0.2 ? 2 : 1);
      setTimeout(nextBlink, rand(2600, 6500));
    }
    setTimeout(function () { nextLook(); nextBlink(); }, 2200);  // start after the eyes open
  }

  /* ---------- 2. Fireflies drifting through the hero ---------- */
  function fireflies() {
    var hero = document.querySelector(".hero");
    if (!hero || reduce || !window.requestAnimationFrame) return;
    var cv = document.createElement("canvas"); cv.className = "fireflies"; cv.setAttribute("aria-hidden", "true");
    hero.insertBefore(cv, hero.firstChild);
    var ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, flies = [], onScreen = true;

    function size() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = W < 700 ? 14 : 26;
      while (flies.length < n) flies.push(spawn(true));
      flies.length = n;
    }
    function spawn(anywhere) {
      return { x: rand(0, W), y: anywhere ? rand(H * 0.25, H) : H + 10, r: rand(1.2, 2.6),
        vx: rand(-0.15, 0.15), vy: rand(-0.35, -0.08), ph: rand(0, 6.28), sp: rand(0.012, 0.03), wob: rand(0.3, 0.9) };
    }
    function frame() {
      if (onScreen && visible) {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < flies.length; i++) {
          var f = flies[i];
          f.ph += f.sp; f.x += f.vx + Math.sin(f.ph * 0.7) * f.wob * 0.25; f.y += f.vy;
          if (f.y < -12 || f.x < -12 || f.x > W + 12) flies[i] = f = spawn(false);
          var a = Math.max(0, Math.sin(f.ph)) * 0.85;          // fireflies pulse on and off
          if (a < 0.02) continue;
          var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 6);
          g.addColorStop(0, "rgba(255,226,120," + a + ")");
          g.addColorStop(0.25, "rgba(245,197,24," + (a * 0.45) + ")");
          g.addColorStop(1, "rgba(245,197,24,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 6, 0, 6.283); ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }
    size(); window.addEventListener("resize", size);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; }).observe(hero);
    requestAnimationFrame(frame);
  }

  /* ---------- 3. Sections ease in as you scroll ---------- */
  function reveals() {
    if (reduce || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("fx");
    var targets = $$(".night h2, .night-copy > *, .come-head > *, .rsvp-head > *, #rsvp-panel, .venue > *, .partner-grid > *, .sponsor-strip");
    targets.forEach(function (el) { el.classList.add("reveal"); });
    $$(".myths li").forEach(function (li, i) {
      li.classList.add("reveal");
      li.style.transitionDelay = (i % 4) * 90 + "ms";
      li.style.setProperty("--d", ((i % 4) * 0.12 + 0.15) + "s");
      $$(".myth-art path", li).forEach(function (p) { p.setAttribute("pathLength", "1"); });
      targets.push(li);
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    targets.forEach(function (el) { io.observe(el); });
  }

  livingEyes();
  fireflies();
  reveals();
})();

(() => {
  const LIFE_YEARS = 80;
  const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
  const PLAYBACK_MS = 2800;
  const NOTE_KEY = "life-clock-note";
  const BG_KEY = "life-clock-bg";
  const RING_ELAPSED = 2 * Math.PI * 52;
  const RING_REMAIN = 2 * Math.PI * 44;
  const BG_COUNT = 8;

  const form = document.getElementById("birth-form");
  const birthYear = document.getElementById("birth-year");
  const birthMonth = document.getElementById("birth-month");
  const birthDay = document.getElementById("birth-day");
  const clocks = document.getElementById("clocks");
  const caption = document.getElementById("caption");
  const nowLabel = document.getElementById("now-label");
  const compareLine = document.getElementById("compare-line");
  const seasonTag = document.getElementById("season-tag");
  const noteInput = document.getElementById("life-note");
  const soundBtn = document.getElementById("sound-btn");
  const soundLabel = document.getElementById("sound-label");
  const mirrorBtn = document.getElementById("mirror-btn");
  const mirrorLabel = document.getElementById("mirror-label");
  const bgBtn = document.getElementById("bg-btn");
  const shareBtn = document.getElementById("share-btn");
  const poetryText = document.getElementById("poetry-text");
  const poetryRefresh = document.getElementById("poetry-refresh");
  const poetryAutoBtn = document.getElementById("poetry-auto");
  const progressElapsed = document.getElementById("progress-elapsed");
  const progressRemain = document.getElementById("progress-remain");
  const progressPct = document.getElementById("progress-pct");
  const progressSub = document.getElementById("progress-sub");
  const elapsedKicker = document.getElementById("elapsed-kicker");
  const afterglowKicker = document.getElementById("afterglow-kicker");
  const dragHint = document.getElementById("drag-hint");
  const elapsedFaceWrap = document.getElementById("elapsed-face-wrap");
  const shareCanvas = document.getElementById("share-canvas");
  const milestonesGroup = document.getElementById("milestones");
  const milestoneList = document.getElementById("milestone-list");
  const seasonCanvas = document.getElementById("season-canvas");
  const starCanvas = document.getElementById("star-canvas");

  const elapsedDigital = document.getElementById("elapsed-digital");
  const afterglowDigital = document.getElementById("afterglow-digital");
  const elapsedMeta = document.getElementById("elapsed-meta");
  const afterglowMeta = document.getElementById("afterglow-meta");
  const elapsedHour = document.getElementById("elapsed-hour");
  const elapsedMinute = document.getElementById("elapsed-minute");
  const elapsedSecond = document.getElementById("elapsed-second");
  const afterglowHour = document.getElementById("afterglow-hour");
  const afterglowMinute = document.getElementById("afterglow-minute");
  const afterglowSecond = document.getElementById("afterglow-second");

  let birthDate = null;
  let rafId = null;
  let stageId = "";
  let seasonId = "";
  let lastSnapshot = null;
  let soundOn = false;
  let audio = null;
  let noteTouched = false;
  let lastDefaultNote = "";
  let mirrorOn = false;
  let previewHours = null;
  let dragging = false;
  let bgIndex = 0;
  let poetryTimer = null;
  let poetryAutoTimer = null;
  let poetryAutoOn = false;
  let poetryToken = 0;
  let lastPoem = "";
  const litMilestones = new Set();

  const milestones = [
    { age: 6, label: "入学" },
    { age: 18, label: "成年" },
    { age: 22, label: "入世" },
    { age: 30, label: "而立" },
    { age: 40, label: "不惑" },
  ];

  const stageMeta = {
    morning: { season: "spring", seasonLabel: "春 · 晨光初启" },
    noon: { season: "summer", seasonLabel: "夏 · 日正当空" },
    afternoon: { season: "late", seasonLabel: "长夏 · 斜晖渐暖" },
    dusk: { season: "autumn", seasonLabel: "秋 · 暮色温柔" },
    night: { season: "winter", seasonLabel: "冬 · 星火未灭" },
  };

  const poems = {
    morning: [
      "露水还停在叶尖，你已出发。",
      "一天很长，不必跑完全程。",
      "把朝阳当作尚未拆封的信。",
      "轻一点走，路会自己亮起来。",
    ],
    noon: [
      "盛夏的影子最短，心可以最满。",
      "高处不只有风，也有开阔。",
      "此刻用力，不是为了证明什么。",
      "光落在肩上，像一句无声的加油。",
    ],
    afternoon: [
      "斜晖把故事拉长，也把心放软。",
      "不必追着太阳，余温也会到。",
      "午后适合慢慢想清楚一件事。",
      "走了很远，也仍可以重新开始。",
    ],
    dusk: [
      "黄昏不是结束，是一天最温柔的句号。",
      "金边还在，说明还来得及。",
      "余晖很短，所以更值得被看见。",
      "把今天收好，明天会记得你。",
    ],
    night: [
      "夜色里的星，是没说完的白天。",
      "慢一点，黑暗也会发光。",
      "时钟仍在走，你不必慌张。",
      "合上眼之前，先对自己说声谢谢。",
    ],
  };

  const stagePalette = {
    morning: { top: "#b8d9c8", mid: "#e8dcc4", bot: "#f0c9a0", ink: "#14181f" },
    noon: { top: "#7eb8e0", mid: "#f2d090", bot: "#ef9a48", ink: "#14181f" },
    afternoon: { top: "#9ab0c0", mid: "#e8b888", bot: "#d07040", ink: "#14181f" },
    dusk: { top: "#3a4058", mid: "#8a5a48", bot: "#c86838", ink: "#f3ebe3" },
    night: { top: "#0e1620", mid: "#1a2838", bot: "#3a4555", ink: "#ebe4da" },
  };

  const stages = [
    { id: "morning", from: 0, to: 8, elapsed: "清晨刚展开，脚步还轻", afterglow: "长昼仍在前方", caption: "人生还在上午" },
    { id: "noon", from: 8, to: 14, elapsed: "正值盛昼，指针走得最满", afterglow: "午后的余温还很长", caption: "你正站在一天的高处" },
    { id: "afternoon", from: 14, to: 18, elapsed: "斜晖渐长，故事已有厚度", afterglow: "暮色尚远，仍可从容", caption: "下午的光，温和而清楚" },
    { id: "dusk", from: 18, to: 21, elapsed: "黄昏将近，金边还在天际", afterglow: "余晖往往是最温柔的一段", caption: "光开始向西倾斜" },
    { id: "night", from: 21, to: 24, elapsed: "夜色覆来，白昼已走得很远", afterglow: "星光也是一种余晖", caption: "时钟仍在走，不必慌张" },
  ];

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function pad(n) {
    return String(Math.floor(n)).padStart(2, "0");
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function partsFromHours(lifeHours) {
    const h = clamp(lifeHours, 0, 23.999999);
    const hours = Math.floor(h);
    const minutesFloat = (h - hours) * 60;
    const minutes = Math.floor(minutesFloat);
    const secondsFloat = (minutesFloat - minutes) * 60;
    const seconds = Math.floor(secondsFloat);
    const ms = (secondsFloat - seconds) * 1000;
    return { hours, minutes, seconds, ms };
  }

  function formatDigital(lifeHours) {
    const { hours, minutes, seconds } = partsFromHours(lifeHours);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function formatWallClock(date = new Date()) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function setHand(el, deg) {
    el.setAttribute("transform", `rotate(${deg} 100 100)`);
  }

  function applyHands(hourEl, minuteEl, secondEl, lifeHours) {
    const { hours, minutes, seconds, ms } = partsFromHours(lifeHours);
    setHand(hourEl, (hours + minutes / 60 + seconds / 3600) * 15);
    setHand(minuteEl, (minutes + seconds / 60 + ms / 60000) * 6);
    setHand(secondEl, (seconds + ms / 1000) * 6);
  }

  function exactAgeYears(from, to = new Date()) {
    return (to - from) / MS_PER_YEAR;
  }

  function getStage(lifeHours) {
    const h = clamp(lifeHours, 0, 23.999);
    return stages.find((s) => h >= s.from && h < s.to) || stages[stages.length - 1];
  }

  function ageToLifeHours(age) {
    return (age / LIFE_YEARS) * 24;
  }

  function trueElapsedHours() {
    if (!birthDate) return 0;
    return clamp(exactAgeYears(birthDate) / LIFE_YEARS, 0, 1) * 24;
  }

  function applyBg(index) {
    bgIndex = ((index % BG_COUNT) + BG_COUNT) % BG_COUNT;
    document.body.dataset.bg = String(bgIndex);
    try {
      localStorage.setItem(BG_KEY, String(bgIndex));
    } catch (_) {}
  }

  function shuffleBg() {
    let next = Math.floor(Math.random() * BG_COUNT);
    if (next === bgIndex) next = (next + 1) % BG_COUNT;
    applyBg(next);
  }

  function currentPoetryStage() {
    const hours = previewHours != null ? previewHours : trueElapsedHours();
    return getStage(hours);
  }

  function clearPoetryTimers() {
    if (poetryTimer) {
      clearTimeout(poetryTimer);
      poetryTimer = null;
    }
  }

  function stopPoetryAuto() {
    poetryAutoOn = false;
    if (poetryAutoTimer) {
      clearTimeout(poetryAutoTimer);
      poetryAutoTimer = null;
    }
    if (poetryAutoBtn) {
      poetryAutoBtn.setAttribute("aria-pressed", "false");
      poetryAutoBtn.textContent = "动态播放";
    }
  }

  function schedulePoetryAuto() {
    if (!poetryAutoOn) return;
    if (poetryAutoTimer) clearTimeout(poetryAutoTimer);
    // hold after typing finishes, then fade to next
    poetryAutoTimer = setTimeout(() => {
      if (!poetryAutoOn) return;
      drawPoetry(currentPoetryStage(), { animate: true, forceNext: true });
    }, 4200);
  }

  function typePoetry(text) {
    clearPoetryTimers();
    const token = ++poetryToken;
    const chars = [...text];
    let i = 0;
    poetryText.classList.remove("is-fading", "is-holding");
    poetryText.classList.add("is-typing");
    poetryText.textContent = "";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      poetryText.textContent = text;
      poetryText.classList.remove("is-typing");
      lastPoem = text;
      schedulePoetryAuto();
      return;
    }

    function step() {
      if (token !== poetryToken) return;
      if (i <= chars.length) {
        poetryText.textContent = chars.slice(0, i).join("");
        i += 1;
        poetryTimer = setTimeout(step, 48 + Math.random() * 40);
      } else {
        poetryText.classList.remove("is-typing");
        poetryText.classList.add("is-holding");
        lastPoem = text;
        schedulePoetryAuto();
      }
    }
    step();
  }

  function drawPoetry(stage, { animate = true, forceNext = false } = {}) {
    const list = poems[stage.id] || poems.morning;
    let next = pick(list);
    if (forceNext && list.length > 1) {
      let guard = 0;
      while (next === lastPoem && guard < 8) {
        next = pick(list);
        guard += 1;
      }
    }

    if (!animate) {
      clearPoetryTimers();
      poetryText.classList.remove("is-typing", "is-fading");
      poetryText.textContent = next;
      lastPoem = next;
      schedulePoetryAuto();
      return;
    }

    // fade out then typewriter in
    clearPoetryTimers();
    const token = ++poetryToken;
    poetryText.classList.add("is-fading");
    poetryText.classList.remove("is-typing");
    poetryTimer = setTimeout(() => {
      if (token !== poetryToken) return;
      typePoetry(next);
    }, 320);
  }

  function startPoetryAuto({ forceNext = false } = {}) {
    poetryAutoOn = true;
    poetryAutoBtn.setAttribute("aria-pressed", "true");
    poetryAutoBtn.textContent = "停止播放";
    drawPoetry(currentPoetryStage(), { animate: true, forceNext });
  }

  function togglePoetryAuto() {
    if (poetryAutoOn) {
      stopPoetryAuto();
      return;
    }
    startPoetryAuto({ forceNext: true });
  }

  function updateProgress(progress) {
    const p = clamp(progress, 0, 1);
    progressElapsed.style.strokeDashoffset = String(RING_ELAPSED * (1 - p));
    progressRemain.style.strokeDashoffset = String(RING_REMAIN * p);
    progressPct.textContent = `${Math.round(p * 100)}%`;
    progressSub.textContent = mirrorOn ? "若余晖作今日" : "已走过的人生";
  }

  function applySeason(stage) {
    const meta = stageMeta[stage.id] || stageMeta.morning;
    const showStars = stage.id === "night" || stage.id === "dusk";
    document.body.classList.toggle("show-stars", showStars);
    starCanvas.hidden = !showStars;

    if (meta.season === seasonId) return;
    seasonId = meta.season;
    document.body.classList.remove(
      "season-spring",
      "season-summer",
      "season-late",
      "season-autumn",
      "season-winter"
    );
    document.body.classList.add(`season-${meta.season}`);
    seasonTag.textContent = meta.seasonLabel;
    spawnSeasonParticles(meta.season);
  }

  function applyStage(stage, { refreshPoetry = false } = {}) {
    if (stage.id !== stageId) {
      stageId = stage.id;
      document.body.classList.remove(
        "stage-morning",
        "stage-noon",
        "stage-afternoon",
        "stage-dusk",
        "stage-night"
      );
      document.body.classList.add(`stage-${stage.id}`);
      if (audio) audio.setStage(stage.id);
      syncDefaultNote(stage);
      drawPoetry(stage);
    } else if (refreshPoetry) {
      drawPoetry(stage);
    }
    applySeason(stage);
  }

  function syncDefaultNote(stage) {
    if (noteTouched) return;
    const next = stage.caption;
    if (!noteInput.value || noteInput.value === lastDefaultNote) {
      noteInput.value = next;
      lastDefaultNote = next;
    }
  }

  function updateMilestones(elapsedHours, ageYears) {
    milestonesGroup.querySelectorAll(".milestone-dot").forEach((dot) => {
      const age = Number(dot.dataset.age);
      const lifeH = ageToLifeHours(age);
      const passed = ageYears >= age;
      const justLit = passed && Math.abs(elapsedHours - lifeH) < 0.35 && !litMilestones.has(age);
      dot.classList.toggle("passed", passed);
      if (justLit) {
        litMilestones.add(age);
        dot.classList.add("lit");
        setTimeout(() => dot.classList.remove("lit"), 1600);
      }
    });
    milestoneList.querySelectorAll("li").forEach((li) => {
      const age = Number(li.dataset.age);
      li.classList.toggle("passed", ageYears >= age);
    });
  }

  function renderLife(elapsedHours, opts = {}) {
    let showElapsed = clamp(elapsedHours, 0, 24);
    let showRemain = Math.max(0, 24 - showElapsed);
    const stageForTime = getStage(showElapsed);
    const now = new Date();
    const age = birthDate ? exactAgeYears(birthDate, now) : 0;
    const progress = clamp(age / LIFE_YEARS, 0, 1);

    if (mirrorOn && previewHours == null) {
      // swap display: imagine living the remaining day as "today"
      const tmp = showElapsed;
      showElapsed = showRemain;
      showRemain = tmp;
    }

    const leftStage = getStage(showElapsed);
    const baseStage = getStage(elapsedHours);

    elapsedDigital.textContent = formatDigital(showElapsed);
    afterglowDigital.textContent = formatDigital(showRemain);

    if (mirrorOn) {
      elapsedKicker.textContent = "余晖·今日";
      afterglowKicker.textContent = "已行·倒影";
      elapsedMeta.textContent = "若把余晖过成这一天";
      afterglowMeta.textContent = "回望已经走过的光";
    } else {
      elapsedKicker.textContent = "已行";
      afterglowKicker.textContent = "余晖";
      elapsedMeta.textContent = leftStage.elapsed;
      afterglowMeta.textContent = baseStage.afterglow;
    }

    caption.textContent =
      opts.caption ||
      (previewHours != null
        ? "预览中 · 松手回到此刻"
        : mirrorOn
          ? "若再活一天，余晖便是清晨"
          : stageForTime.caption);

    nowLabel.textContent =
      opts.nowLabel ||
      (previewHours != null ? "预览" : mirrorOn ? "倒影" : progress >= 1 ? "圆满" : "此刻");

    compareLine.textContent = `现实 ${formatWallClock(now)} · 人生 ${formatDigital(
      previewHours != null ? previewHours : trueElapsedHours()
    )}`;

    applyHands(elapsedHour, elapsedMinute, elapsedSecond, showElapsed);
    applyHands(afterglowHour, afterglowMinute, afterglowSecond, showRemain);
    applyStage(stageForTime, { refreshPoetry: false });
    updateMilestones(previewHours != null ? previewHours : trueElapsedHours(), age);
    updateProgress(previewHours != null ? previewHours / 24 : progress);

    dragHint.textContent = previewHours != null ? "松手回到此刻" : "可拖动预览";

    lastSnapshot = {
      elapsedHours: previewHours != null ? previewHours : trueElapsedHours(),
      remainHours: Math.max(0, 24 - (previewHours != null ? previewHours : trueElapsedHours())),
      stage: stageForTime,
      birth: getBirthValue(),
      ageYears: age,
      wall: formatWallClock(now),
      note: noteInput.value.trim(),
      seasonLabel: (stageMeta[stageForTime.id] || {}).seasonLabel || "",
      poetry: poetryText.textContent,
      progress: previewHours != null ? previewHours / 24 : progress,
      mirrorOn,
    };
  }

  /* ---------- Seasonal particles ---------- */
  const seasonCtx = seasonCanvas.getContext("2d");
  let particles = [];
  let particleSeason = "spring";
  let particleRaf = null;

  function resizeSeasonCanvas() {
    seasonCanvas.width = window.innerWidth * devicePixelRatio;
    seasonCanvas.height = window.innerHeight * devicePixelRatio;
    seasonCanvas.style.width = `${window.innerWidth}px`;
    seasonCanvas.style.height = `${window.innerHeight}px`;
    seasonCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function spawnSeasonParticles(season) {
    particleSeason = season;
    const count = season === "winter" ? 36 : season === "autumn" ? 28 : 22;
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1 + Math.random() * 3,
      vx: -0.25 + Math.random() * 0.5,
      vy: season === "winter" ? 0.4 + Math.random() * 0.5 : 0.15 + Math.random() * 0.4,
      a: 0.25 + Math.random() * 0.45,
      rot: Math.random() * Math.PI,
      spin: -0.02 + Math.random() * 0.04,
    }));
  }

  function drawSeasonParticles() {
    seasonCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      if (p.y > window.innerHeight + 10) p.y = -10;
      if (p.x < -10) p.x = window.innerWidth + 10;
      if (p.x > window.innerWidth + 10) p.x = -10;
      seasonCtx.save();
      seasonCtx.translate(p.x, p.y);
      seasonCtx.rotate(p.rot);
      if (particleSeason === "spring") {
        seasonCtx.fillStyle = `rgba(255, 170, 190, ${p.a})`;
        seasonCtx.beginPath();
        seasonCtx.ellipse(0, 0, p.r * 1.4, p.r * 0.7, 0, 0, Math.PI * 2);
        seasonCtx.fill();
      } else if (particleSeason === "summer") {
        seasonCtx.fillStyle = `rgba(255, 230, 140, ${p.a * 0.7})`;
        seasonCtx.beginPath();
        seasonCtx.arc(0, 0, p.r * 0.8, 0, Math.PI * 2);
        seasonCtx.fill();
      } else if (particleSeason === "autumn" || particleSeason === "late") {
        seasonCtx.fillStyle = `rgba(200, 100, 55, ${p.a})`;
        seasonCtx.beginPath();
        seasonCtx.moveTo(0, -p.r);
        seasonCtx.quadraticCurveTo(p.r, 0, 0, p.r);
        seasonCtx.quadraticCurveTo(-p.r, 0, 0, -p.r);
        seasonCtx.fill();
      } else {
        seasonCtx.fillStyle = `rgba(230, 240, 255, ${p.a})`;
        seasonCtx.beginPath();
        seasonCtx.arc(0, 0, p.r * 0.7, 0, Math.PI * 2);
        seasonCtx.fill();
      }
      seasonCtx.restore();
    }
    particleRaf = requestAnimationFrame(drawSeasonParticles);
  }

  /* ---------- Night star map ---------- */
  const starCtx = starCanvas.getContext("2d");
  let stars = [];
  let starAngle = 0;
  let starRaf = null;

  function resizeStarCanvas() {
    starCanvas.width = window.innerWidth * devicePixelRatio;
    starCanvas.height = window.innerHeight * devicePixelRatio;
    starCanvas.style.width = `${window.innerWidth}px`;
    starCanvas.style.height = `${window.innerHeight}px`;
    starCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function spawnStars() {
    const count = 90;
    stars = Array.from({ length: count }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 40 + Math.random() * Math.min(window.innerWidth, window.innerHeight) * 0.55,
      s: 0.6 + Math.random() * 1.8,
      tw: Math.random() * Math.PI * 2,
      bright: 0.35 + Math.random() * 0.65,
    }));
  }

  function drawStars() {
    if (starCanvas.hidden) {
      starRaf = requestAnimationFrame(drawStars);
      return;
    }
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.42;
    starCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    starAngle += 0.00035;
    for (const st of stars) {
      const ang = st.a + starAngle;
      const x = cx + Math.cos(ang) * st.r;
      const y = cy + Math.sin(ang) * st.r * 0.72;
      st.tw += 0.03;
      const a = st.bright * (0.55 + 0.45 * Math.sin(st.tw));
      starCtx.beginPath();
      starCtx.fillStyle = `rgba(255, 245, 220, ${a})`;
      starCtx.arc(x, y, st.s, 0, Math.PI * 2);
      starCtx.fill();
    }
    // faint constellation lines
    starCtx.strokeStyle = "rgba(255,240,210,0.08)";
    starCtx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = stars[i];
      const b = stars[i + 12];
      if (!a || !b) continue;
      const ax = cx + Math.cos(a.a + starAngle) * a.r;
      const ay = cy + Math.sin(a.a + starAngle) * a.r * 0.72;
      const bx = cx + Math.cos(b.a + starAngle) * b.r;
      const by = cy + Math.sin(b.a + starAngle) * b.r * 0.72;
      starCtx.beginPath();
      starCtx.moveTo(ax, ay);
      starCtx.lineTo(bx, by);
      starCtx.stroke();
    }
    starRaf = requestAnimationFrame(drawStars);
  }

  /* ---------- Ambient music ---------- */
  function createAmbient() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0;
    const compressor = ctx.createDynamicsCompressor();
    master.connect(compressor);
    compressor.connect(ctx.destination);

    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.38;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.28;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.22;
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(master);

    const padGain = ctx.createGain();
    padGain.gain.value = 0.045;
    padGain.connect(master);
    padGain.connect(delay);
    const melGain = ctx.createGain();
    melGain.gain.value = 0.055;
    melGain.connect(master);
    melGain.connect(delay);

    const scales = {
      morning: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
      noon: [293.66, 349.23, 392.0, 440.0, 523.25, 587.33],
      afternoon: [246.94, 293.66, 329.63, 369.99, 440.0, 493.88],
      dusk: [220.0, 261.63, 293.66, 329.63, 392.0, 440.0],
      night: [174.61, 196.0, 220.0, 261.63, 293.66, 349.23],
    };
    const padRoots = {
      morning: [130.81, 164.81, 196.0],
      noon: [146.83, 185.0, 220.0],
      afternoon: [123.47, 155.56, 185.0],
      dusk: [110.0, 146.83, 174.61],
      night: [87.31, 110.0, 130.81],
    };

    let stage = "morning";
    let running = false;
    let step = 0;
    let timer = null;
    const padOscs = [];

    function stopPads() {
      padOscs.splice(0).forEach(({ o, g }) => {
        try {
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
          o.stop(ctx.currentTime + 0.5);
        } catch (_) {}
      });
    }

    function startPads() {
      stopPads();
      (padRoots[stage] || padRoots.morning).forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        o.type = i === 0 ? "sine" : "triangle";
        o.frequency.value = freq;
        o.detune.value = i === 1 ? -6 : i === 2 ? 5 : 0;
        f.type = "lowpass";
        f.frequency.value = 900;
        g.gain.value = 0;
        o.connect(f);
        f.connect(g);
        g.connect(padGain);
        g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 1.2);
        o.start();
        padOscs.push({ o, g });
      });
    }

    function playNote(freq, dur = 1.1, gain = 0.08) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      o1.type = "sine";
      o2.type = "triangle";
      o1.frequency.value = freq;
      o2.frequency.value = freq * 2;
      f.type = "lowpass";
      f.frequency.value = 1800;
      g.gain.value = 0;
      o1.connect(f);
      o2.connect(f);
      f.connect(g);
      g.connect(melGain);
      const t0 = ctx.currentTime;
      g.gain.linearRampToValueAtTime(gain, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o1.start(t0);
      o2.start(t0);
      o1.stop(t0 + dur + 0.05);
      o2.stop(t0 + dur + 0.05);
    }

    function tickMelody() {
      if (!running) return;
      const scale = scales[stage] || scales.morning;
      const pattern = [0, 2, 4, 2, 3, 5, 4, 1];
      const idx = pattern[step % pattern.length] % scale.length;
      playNote(scale[idx] * (step % 16 < 8 ? 1 : 0.5), stage === "night" ? 1.8 : 1.15, 0.085);
      if (step % 4 === 0) playNote(scale[(idx + 2) % scale.length] * 0.5, 2.2, 0.04);
      step += 1;
      const tempo = stage === "noon" ? 520 : stage === "morning" ? 640 : stage === "dusk" ? 780 : 900;
      timer = setTimeout(tickMelody, tempo + Math.random() * 80);
    }

    function schedule() {
      if (!running) return;
      if (timer) clearTimeout(timer);
      startPads();
      step = 0;
      tickMelody();
    }

    return {
      async resume() {
        if (ctx.state === "suspended") await ctx.resume();
        running = true;
        master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1);
        schedule();
      },
      mute() {
        running = false;
        if (timer) clearTimeout(timer);
        stopPads();
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      },
      setStage(id) {
        stage = id;
        if (running) schedule();
      },
    };
  }

  async function toggleSound() {
    if (!audio) audio = createAmbient();
    if (!audio) return alert("当前浏览器不支持音景");
    soundOn = !soundOn;
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    soundLabel.textContent = soundOn ? "音景开启" : "开启音景";
    if (soundOn) {
      if (stageId) audio.setStage(stageId);
      await audio.resume();
    } else audio.mute();
  }

  function toggleMirror() {
    mirrorOn = !mirrorOn;
    document.body.classList.toggle("is-mirror", mirrorOn);
    mirrorBtn.setAttribute("aria-pressed", mirrorOn ? "true" : "false");
    mirrorLabel.textContent = mirrorOn ? "回到此刻" : "若再活一天";
    const h = previewHours != null ? previewHours : trueElapsedHours();
    renderLife(h);
  }

  /* ---------- Drag preview ---------- */
  function pointerToLifeHours(clientX, clientY) {
    const rect = elapsedFaceWrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let ang = Math.atan2(clientX - cx, cy - clientY); // 0 at 12 o'clock
    if (ang < 0) ang += Math.PI * 2;
    return (ang / (Math.PI * 2)) * 24;
  }

  function beginDrag(e) {
    if (!birthDate || document.body.classList.contains("is-playing")) return;
    dragging = true;
    elapsedFaceWrap.classList.add("is-dragging");
    document.body.classList.add("is-preview");
    if (rafId) cancelAnimationFrame(rafId);
    const point = e.touches ? e.touches[0] : e;
    previewHours = pointerToLifeHours(point.clientX, point.clientY);
    renderLife(previewHours);
    e.preventDefault();
  }

  function moveDrag(e) {
    if (!dragging) return;
    const point = e.touches ? e.touches[0] : e;
    previewHours = pointerToLifeHours(point.clientX, point.clientY);
    renderLife(previewHours);
    e.preventDefault();
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    elapsedFaceWrap.classList.remove("is-dragging");
    document.body.classList.remove("is-preview");
    // ease back to true time
    const from = previewHours ?? trueElapsedHours();
    const to = trueElapsedHours();
    previewHours = null;
    const start = performance.now();
    const dur = 700;
    function snap(now) {
      const t = clamp((now - start) / dur, 0, 1);
      const h = from + (to - from) * easeOutCubic(t);
      renderLife(h, { caption: t < 1 ? "回到此刻…" : undefined });
      if (t < 1) rafId = requestAnimationFrame(snap);
      else rafId = requestAnimationFrame(liveTick);
    }
    rafId = requestAnimationFrame(snap);
  }

  /* ---------- Share card ---------- */
  async function exportShareCard() {
    if (!lastSnapshot || !birthDate) return alert("请先启动时钟");
    await document.fonts.ready;
    const { elapsedHours, remainHours, stage, birth, ageYears, wall, note, seasonLabel, poetry, progress } =
      lastSnapshot;
    const palette = stagePalette[stage.id] || stagePalette.noon;
    const ctx = shareCanvas.getContext("2d");
    const W = shareCanvas.width;
    const H = shareCanvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, palette.top);
    grad.addColorStop(0.5, palette.mid);
    grad.addColorStop(1, palette.bot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = palette.ink;
    ctx.textAlign = "center";
    ctx.font = "800 84px Syne, sans-serif";
    ctx.fillText("生命时钟", W / 2, 140);
    ctx.globalAlpha = 0.65;
    ctx.font = "300 28px Outfit, sans-serif";
    ctx.fillText(seasonLabel || "", W / 2, 195);
    ctx.globalAlpha = 0.5;
    ctx.font = "500 24px Outfit, sans-serif";
    ctx.fillText(`生于 ${birth}  ·  约 ${ageYears.toFixed(1)} 岁  ·  ${Math.round(progress * 100)}%`, W / 2, 250);
    ctx.globalAlpha = 0.7;
    ctx.fillText(`现实 ${wall}  ·  人生 ${formatDigital(elapsedHours)}`, W / 2, 300);
    ctx.globalAlpha = 1;

    const elapsedColor = stage.id === "dusk" || stage.id === "night" ? "#e2a86a" : "#c45c3a";
    const afterglowColor = stage.id === "dusk" || stage.id === "night" ? "#8eb8c4" : "#2f6f7a";
    ctx.fillStyle = elapsedColor;
    ctx.font = "600 22px Outfit, sans-serif";
    ctx.fillText("已行", W * 0.28, 390);
    ctx.fillStyle = palette.ink;
    ctx.font = "700 64px Syne, sans-serif";
    ctx.fillText(formatDigital(elapsedHours), W * 0.28, 470);
    ctx.fillStyle = afterglowColor;
    ctx.font = "600 22px Outfit, sans-serif";
    ctx.fillText("余晖", W * 0.72, 390);
    ctx.fillStyle = palette.ink;
    ctx.font = "700 64px Syne, sans-serif";
    ctx.fillText(formatDigital(remainHours), W * 0.72, 470);

    ctx.font = "500 34px Syne, sans-serif";
    ctx.globalAlpha = 0.9;
    wrapText(ctx, poetry || stage.caption, W / 2, 560, W - 160, 48);
    ctx.globalAlpha = 1;

    if (note) {
      ctx.font = "300 28px Outfit, sans-serif";
      ctx.globalAlpha = 0.75;
      wrapText(ctx, `「${note}」`, W / 2, 700, W - 180, 42);
      ctx.globalAlpha = 1;
    }

    drawMiniClock(ctx, W / 2, 1000, 115, elapsedHours, palette.ink);

    ctx.font = "500 20px Outfit, sans-serif";
    ctx.globalAlpha = 0.4;
    ctx.fillText("80 年 = 24 小时  ·  生命时钟", W / 2, 1320);
    ctx.globalAlpha = 1;

    shareCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `生命时钟-${birth}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = [...text];
    let line = "";
    let yy = y;
    for (const ch of chars) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = ch;
        yy += lineHeight;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function drawMiniClock(ctx, cx, cy, r, lifeHours, ink) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(247,244,239,0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(20,24,31,0.15)";
    ctx.lineWidth = 3;
    ctx.stroke();
    for (let h = 0; h < 24; h += 3) {
      const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14));
      ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
      ctx.strokeStyle = "rgba(20,24,31,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const { hours, minutes } = partsFromHours(lifeHours);
    const hourA = ((hours + minutes / 60) / 24) * Math.PI * 2 - Math.PI / 2;
    const minA = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = ink;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hourA) * r * 0.45, cy + Math.sin(hourA) * r * 0.45);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(minA) * r * 0.7, cy + Math.sin(minA) * r * 0.7);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- Build dial ---------- */
  function buildTicks() {
    document.querySelectorAll("[data-ticks]").forEach((group) => {
      group.innerHTML = "";
      for (let i = 0; i < 48; i++) {
        const major = i % 2 === 0;
        const angle = (i / 48) * Math.PI * 2;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", major ? "tick major" : "tick");
        line.setAttribute("x1", 100 + Math.sin(angle) * (major ? 76 : 81));
        line.setAttribute("y1", 100 - Math.cos(angle) * (major ? 76 : 81));
        line.setAttribute("x2", 100 + Math.sin(angle) * 86);
        line.setAttribute("y2", 100 - Math.cos(angle) * 86);
        group.appendChild(line);
      }
    });
  }

  function buildHourLabels() {
    document.querySelectorAll("[data-hours]").forEach((group) => {
      group.innerHTML = "";
      [0, 3, 6, 9, 12, 15, 18, 21].forEach((h) => {
        const angle = (h / 24) * Math.PI * 2;
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "hour-label");
        text.setAttribute("x", 100 + Math.sin(angle) * 64);
        text.setAttribute("y", 100 - Math.cos(angle) * 64);
        text.textContent = String(h);
        group.appendChild(text);
      });
    });
  }

  function buildMilestones() {
    milestonesGroup.innerHTML = "";
    milestoneList.innerHTML = "";
    milestones.forEach((m) => {
      const angle = (ageToLifeHours(m.age) / 24) * Math.PI * 2;
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("class", "milestone-dot");
      dot.setAttribute("cx", 100 + Math.sin(angle) * 70);
      dot.setAttribute("cy", 100 - Math.cos(angle) * 70);
      dot.setAttribute("r", 3.5);
      dot.dataset.age = String(m.age);
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${m.label} · ${m.age}岁`;
      dot.appendChild(title);
      milestonesGroup.appendChild(dot);
      const li = document.createElement("li");
      li.dataset.age = String(m.age);
      li.textContent = `${m.label} ${m.age}`;
      milestoneList.appendChild(li);
    });
  }

  /* ---------- Tick / playback ---------- */
  function liveTick() {
    if (!birthDate || dragging || previewHours != null) return;
    renderLife(trueElapsedHours());
    rafId = requestAnimationFrame(liveTick);
  }

  function playToNow() {
    if (!birthDate) return;
    if (rafId) cancelAnimationFrame(rafId);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = trueElapsedHours();
    if (reduceMotion) {
      document.body.classList.remove("is-playing");
      renderLife(target);
      startPoetryAuto({ forceNext: false });
      rafId = requestAnimationFrame(liveTick);
      return;
    }
    document.body.classList.add("is-playing");
    litMilestones.clear();
    const start = performance.now();
    function anim(now) {
      const t = clamp((now - start) / PLAYBACK_MS, 0, 1);
      renderLife(target * easeOutCubic(t), {
        caption: t < 1 ? "正在走到此刻…" : undefined,
        nowLabel: t < 1 ? "回放" : undefined,
      });
      if (t < 1) rafId = requestAnimationFrame(anim);
      else {
        document.body.classList.remove("is-playing");
        startPoetryAuto({ forceNext: false });
        rafId = requestAnimationFrame(liveTick);
      }
    }
    rafId = requestAnimationFrame(anim);
  }

  function reveal(date, { playback = true } = {}) {
    birthDate = date;
    clocks.dataset.active = "true";
    stageId = "";
    seasonId = "";
    previewHours = null;
    litMilestones.clear();
    if (playback) playToNow();
    else {
      if (rafId) cancelAnimationFrame(rafId);
      renderLife(trueElapsedHours());
      drawPoetry(getStage(trueElapsedHours()));
      rafId = requestAnimationFrame(liveTick);
    }
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function getBirthValue() {
    const y = birthYear.value;
    const m = birthMonth.value;
    const d = birthDay.value;
    if (!y || !m || !d) return "";
    return `${y}-${pad(Number(m))}-${pad(Number(d))}`;
  }

  function getBirthDate() {
    const value = getBirthValue();
    if (!value) return null;
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function fillSelect(select, start, end, selected, padLen = 0) {
    select.innerHTML = "";
    for (let i = start; i <= end; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = padLen ? pad(i) : String(i);
      if (i === selected) opt.selected = true;
      select.appendChild(opt);
    }
  }

  function syncDayOptions() {
    const y = Number(birthYear.value) || 2000;
    const m = Number(birthMonth.value) || 1;
    const maxDay = daysInMonth(y, m);
    const current = Number(birthDay.value) || 1;
    fillSelect(birthDay, 1, maxDay, Math.min(current, maxDay), 2);
  }

  function initBirthSelects(defaultY = 2000, defaultM = 10, defaultD = 5) {
    const now = new Date();
    fillSelect(birthYear, 1900, now.getFullYear(), defaultY);
    fillSelect(birthMonth, 1, 12, defaultM, 2);
    fillSelect(birthDay, 1, daysInMonth(defaultY, defaultM), defaultD, 2);
  }

  birthYear.addEventListener("change", syncDayOptions);
  birthMonth.addEventListener("change", syncDayOptions);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = getBirthDate();
    if (!date) {
      birthYear.focus();
      return alert("请选择完整的年月日");
    }
    if (date > new Date()) return alert("未来的日子，时钟还走不到");
    if (exactAgeYears(date) > 120) return alert("超出刻度了");
    reveal(date, { playback: true });
  });

  noteInput.addEventListener("input", () => {
    noteTouched = true;
    try {
      localStorage.setItem(NOTE_KEY, noteInput.value);
    } catch (_) {}
  });

  soundBtn.addEventListener("click", () => toggleSound().catch(() => {}));
  mirrorBtn.addEventListener("click", toggleMirror);
  bgBtn.addEventListener("click", shuffleBg);
  poetryRefresh.addEventListener("click", () => {
    if (!birthDate) return;
    drawPoetry(currentPoetryStage(), { animate: true, forceNext: true });
  });
  poetryAutoBtn.addEventListener("click", togglePoetryAuto);
  shareBtn.addEventListener("click", () => exportShareCard().catch(() => alert("分享卡生成失败")));

  elapsedFaceWrap.addEventListener("pointerdown", beginDrag);
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  try {
    const saved = localStorage.getItem(NOTE_KEY);
    if (saved) {
      noteInput.value = saved;
      noteTouched = true;
    }
    const savedBg = Number(localStorage.getItem(BG_KEY));
    applyBg(Number.isFinite(savedBg) ? savedBg : Math.floor(Math.random() * BG_COUNT));
  } catch (_) {
    applyBg(Math.floor(Math.random() * BG_COUNT));
  }

  buildTicks();
  buildHourLabels();
  buildMilestones();
  initBirthSelects(2000, 10, 5);
  soundBtn.setAttribute("aria-pressed", "false");
  resizeSeasonCanvas();
  resizeStarCanvas();
  spawnSeasonParticles("spring");
  spawnStars();
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    drawSeasonParticles();
    drawStars();
  }
  window.addEventListener("resize", () => {
    resizeSeasonCanvas();
    resizeStarCanvas();
    spawnSeasonParticles(particleSeason);
    spawnStars();
  });

  reveal(getBirthDate(), { playback: true });
})();

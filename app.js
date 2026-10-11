(() => {
  const LIFE_YEARS = 80;
  const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
  const PLAYBACK_MS = 2800;
  const NOTE_KEY = "life-clock-note";

  const form = document.getElementById("birth-form");
  const birthInput = document.getElementById("birth-date");
  const clocks = document.getElementById("clocks");
  const caption = document.getElementById("caption");
  const nowLabel = document.getElementById("now-label");
  const compareLine = document.getElementById("compare-line");
  const seasonTag = document.getElementById("season-tag");
  const noteInput = document.getElementById("life-note");
  const soundBtn = document.getElementById("sound-btn");
  const soundLabel = document.getElementById("sound-label");
  const shareBtn = document.getElementById("share-btn");
  const shareCanvas = document.getElementById("share-canvas");
  const milestonesGroup = document.getElementById("milestones");
  const milestoneList = document.getElementById("milestone-list");
  const seasonCanvas = document.getElementById("season-canvas");

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

  const stagePalette = {
    morning: { top: "#b8d9c8", mid: "#e8dcc4", bot: "#f0c9a0", ink: "#14181f" },
    noon: { top: "#7eb8e0", mid: "#f2d090", bot: "#ef9a48", ink: "#14181f" },
    afternoon: { top: "#9ab0c0", mid: "#e8b888", bot: "#d07040", ink: "#14181f" },
    dusk: { top: "#3a4058", mid: "#8a5a48", bot: "#c86838", ink: "#f3ebe3" },
    night: { top: "#0e1620", mid: "#1a2838", bot: "#3a4555", ink: "#ebe4da" },
  };

  const stages = [
    {
      id: "morning",
      from: 0,
      to: 8,
      elapsed: "清晨刚展开，脚步还轻",
      afterglow: "长昼仍在前方",
      caption: "人生还在上午",
    },
    {
      id: "noon",
      from: 8,
      to: 14,
      elapsed: "正值盛昼，指针走得最满",
      afterglow: "午后的余温还很长",
      caption: "你正站在一天的高处",
    },
    {
      id: "afternoon",
      from: 14,
      to: 18,
      elapsed: "斜晖渐长，故事已有厚度",
      afterglow: "暮色尚远，仍可从容",
      caption: "下午的光，温和而清楚",
    },
    {
      id: "dusk",
      from: 18,
      to: 21,
      elapsed: "黄昏将近，金边还在天际",
      afterglow: "余晖往往是最温柔的一段",
      caption: "光开始向西倾斜",
    },
    {
      id: "night",
      from: 21,
      to: 24,
      elapsed: "夜色覆来，白昼已走得很远",
      afterglow: "星光也是一种余晖",
      caption: "时钟仍在走，不必慌张",
    },
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
    const hourDeg = (hours + minutes / 60 + seconds / 3600) * 15;
    const minuteDeg = (minutes + seconds / 60 + ms / 60000) * 6;
    const secondDeg = (seconds + ms / 1000) * 6;
    setHand(hourEl, hourDeg);
    setHand(minuteEl, minuteDeg);
    setHand(secondEl, secondDeg);
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

  function applySeason(stage) {
    const meta = stageMeta[stage.id] || stageMeta.morning;
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

  function applyStage(stage) {
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
      const justLit =
        passed &&
        Math.abs(elapsedHours - lifeH) < 0.35 &&
        !litMilestones.has(age);

      dot.classList.toggle("passed", passed);
      if (justLit) {
        litMilestones.add(age);
        dot.classList.add("lit");
        setTimeout(() => dot.classList.remove("lit"), 1600);
      }
    });

    milestoneList.querySelectorAll("li").forEach((li) => {
      const age = Number(li.dataset.age);
      const passed = ageYears >= age;
      li.classList.toggle("passed", passed);
      li.classList.toggle("lit", litMilestones.has(age) && Math.abs(ageYears - age) < 0.05);
    });
  }

  function renderLife(elapsedHours, opts = {}) {
    const remainHours = Math.max(0, 24 - elapsedHours);
    const stage = getStage(elapsedHours);
    const now = new Date();
    const age = birthDate ? exactAgeYears(birthDate, now) : 0;
    const progress = clamp(age / LIFE_YEARS, 0, 1);

    elapsedDigital.textContent = formatDigital(elapsedHours);
    afterglowDigital.textContent = formatDigital(remainHours);
    elapsedMeta.textContent = stage.elapsed;
    afterglowMeta.textContent = stage.afterglow;
    caption.textContent = opts.caption || stage.caption;
    nowLabel.textContent = opts.nowLabel || (progress >= 1 ? "圆满" : age < 0 ? "未至" : "此刻");
    compareLine.textContent = `现实 ${formatWallClock(now)} · 人生 ${formatDigital(elapsedHours)}`;

    applyHands(elapsedHour, elapsedMinute, elapsedSecond, elapsedHours);
    applyHands(afterglowHour, afterglowMinute, afterglowSecond, remainHours);
    applyStage(stage);
    updateMilestones(elapsedHours, age);

    lastSnapshot = {
      elapsedHours,
      remainHours,
      stage,
      birth: birthInput.value,
      ageYears: age,
      wall: formatWallClock(now),
      note: noteInput.value.trim(),
      seasonLabel: (stageMeta[stage.id] || {}).seasonLabel || "",
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
    const count =
      season === "winter" ? 36 : season === "autumn" ? 28 : season === "summer" ? 18 : 24;
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1 + Math.random() * (season === "autumn" ? 3.5 : 2.2),
      vx: -0.25 + Math.random() * 0.5,
      vy: season === "winter" ? 0.35 + Math.random() * 0.55 : 0.15 + Math.random() * 0.4,
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
        seasonCtx.fillStyle =
          particleSeason === "late"
            ? `rgba(220, 140, 70, ${p.a})`
            : `rgba(200, 90, 50, ${p.a})`;
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

  /* ---------- Ambient music (melodic pads + arps) ---------- */
  function createAmbient() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.25;

    master.connect(compressor);
    compressor.connect(ctx.destination);

    // Soft delay "room"
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
      morning: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25], // C major pent-ish
      noon: [293.66, 349.23, 392.0, 440.0, 523.25, 587.33], // D mix
      afternoon: [246.94, 293.66, 329.63, 369.99, 440.0, 493.88], // warmer
      dusk: [220.0, 261.63, 293.66, 329.63, 392.0, 440.0], // A minor-ish
      night: [174.61, 196.0, 220.0, 261.63, 293.66, 349.23], // low calm
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
          g.gain.cancelScheduledValues(ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
          o.stop(ctx.currentTime + 0.5);
        } catch (_) {}
      });
    }

    function startPads() {
      stopPads();
      const roots = padRoots[stage] || padRoots.morning;
      roots.forEach((freq, i) => {
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
        const t0 = ctx.currentTime;
        g.gain.linearRampToValueAtTime(0.22 / roots.length, t0 + 1.2);
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
      o2.detune.value = 3;
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
      // gentle rising/falling arp pattern
      const pattern = [0, 2, 4, 2, 3, 5, 4, 1];
      const idx = pattern[step % pattern.length] % scale.length;
      const octave = step % 16 < 8 ? 1 : 0.5;
      playNote(scale[idx] * octave, stage === "night" ? 1.8 : 1.15, stage === "noon" ? 0.07 : 0.09);
      // occasional harmony
      if (step % 4 === 0) {
        playNote(scale[(idx + 2) % scale.length] * 0.5, 2.2, 0.04);
      }
      step += 1;
      const tempo =
        stage === "noon" ? 520 : stage === "morning" ? 640 : stage === "dusk" ? 780 : 900;
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
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.0);
        schedule();
      },
      mute() {
        running = false;
        if (timer) clearTimeout(timer);
        stopPads();
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      },
      setStage(id) {
        stage = id;
        if (running) schedule();
      },
    };
  }

  function updateSoundUi() {
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    soundLabel.textContent = soundOn ? "音景开启" : "开启音景";
  }

  async function toggleSound() {
    if (!audio) audio = createAmbient();
    if (!audio) {
      alert("当前浏览器不支持音景");
      return;
    }
    soundOn = !soundOn;
    updateSoundUi();
    if (soundOn) {
      if (stageId) audio.setStage(stageId);
      await audio.resume();
    } else {
      audio.mute();
    }
  }

  /* ---------- Share card ---------- */
  async function exportShareCard() {
    if (!lastSnapshot || !birthDate) {
      alert("请先启动时钟");
      return;
    }

    await document.fonts.ready;
    const { elapsedHours, remainHours, stage, birth, ageYears, wall, note, seasonLabel } =
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

    const glow = ctx.createRadialGradient(W * 0.7, H * 0.12, 40, W * 0.7, H * 0.12, 420);
    glow.addColorStop(0, "rgba(255,255,255,0.28)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = palette.ink;
    ctx.textAlign = "center";

    ctx.font = "800 88px Syne, sans-serif";
    ctx.fillText("生命时钟", W / 2, 150);

    ctx.globalAlpha = 0.65;
    ctx.font = "300 30px Outfit, sans-serif";
    ctx.fillText(seasonLabel || "八十载，浓缩成一天", W / 2, 210);
    ctx.globalAlpha = 1;

    ctx.font = "500 24px Outfit, sans-serif";
    ctx.globalAlpha = 0.5;
    ctx.fillText(`生于 ${birth}  ·  约 ${ageYears.toFixed(1)} 岁`, W / 2, 270);
    ctx.globalAlpha = 1;

    ctx.font = "400 26px Outfit, sans-serif";
    ctx.globalAlpha = 0.7;
    ctx.fillText(`现实 ${wall}  ·  人生 ${formatDigital(elapsedHours)}`, W / 2, 330);
    ctx.globalAlpha = 1;

    const drawBlock = (x, label, time, color) => {
      ctx.fillStyle = color;
      ctx.font = "600 24px Outfit, sans-serif";
      ctx.fillText(label, x, 430);
      ctx.fillStyle = palette.ink;
      ctx.font = "700 68px Syne, sans-serif";
      ctx.fillText(time, x, 515);
    };

    const elapsedColor = stage.id === "dusk" || stage.id === "night" ? "#e2a86a" : "#c45c3a";
    const afterglowColor = stage.id === "dusk" || stage.id === "night" ? "#8eb8c4" : "#2f6f7a";
    drawBlock(W * 0.28, "已行", formatDigital(elapsedHours), elapsedColor);
    drawBlock(W * 0.72, "余晖", formatDigital(remainHours), afterglowColor);

    ctx.strokeStyle = palette.ink;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 400);
    ctx.lineTo(W / 2, 540);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.font = "400 36px Outfit, sans-serif";
    ctx.fillStyle = palette.ink;
    ctx.globalAlpha = 0.88;
    wrapText(ctx, stage.caption, W / 2, 620, W - 160, 52);
    ctx.globalAlpha = 1;

    if (note) {
      ctx.font = "300 30px Outfit, sans-serif";
      ctx.globalAlpha = 0.75;
      wrapText(ctx, `「${note}」`, W / 2, 760, W - 180, 44);
      ctx.globalAlpha = 1;
    }

    drawMiniClock(ctx, W / 2, 1050, 120, elapsedHours, palette.ink);

    // milestone legend
    const passed = milestones.filter((m) => ageYears >= m.age).map((m) => m.label);
    if (passed.length) {
      ctx.font = "500 22px Outfit, sans-serif";
      ctx.globalAlpha = 0.45;
      ctx.fillText(`已抵达：${passed.join(" · ")}`, W / 2, 1240);
      ctx.globalAlpha = 1;
    }

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
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = chars[i];
        yy += lineHeight;
      } else {
        line = test;
      }
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

    // milestone dots
    milestones.forEach((m) => {
      const lifeH = ageToLifeHours(m.age);
      const a = (lifeH / 24) * Math.PI * 2 - Math.PI / 2;
      const rr = r - 22;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#c45c3a";
      ctx.fill();
    });

    const { hours, minutes } = partsFromHours(lifeHours);
    const hourA = ((hours + minutes / 60) / 24) * Math.PI * 2 - Math.PI / 2;
    const minA = (minutes / 60) * Math.PI * 2 - Math.PI / 2;

    ctx.strokeStyle = ink;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hourA) * (r * 0.45), cy + Math.sin(hourA) * (r * 0.45));
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(minA) * (r * 0.7), cy + Math.sin(minA) * (r * 0.7));
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#c45c3a";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- Clock face build ---------- */
  function buildTicks() {
    document.querySelectorAll("[data-ticks]").forEach((group) => {
      group.innerHTML = "";
      for (let i = 0; i < 48; i++) {
        const major = i % 2 === 0;
        const angle = (i / 48) * Math.PI * 2;
        const outer = 86;
        const inner = major ? 76 : 81;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", major ? "tick major" : "tick");
        line.setAttribute("x1", 100 + Math.sin(angle) * inner);
        line.setAttribute("y1", 100 - Math.cos(angle) * inner);
        line.setAttribute("x2", 100 + Math.sin(angle) * outer);
        line.setAttribute("y2", 100 - Math.cos(angle) * outer);
        group.appendChild(line);
      }
    });
  }

  function buildHourLabels() {
    const marks = [0, 3, 6, 9, 12, 15, 18, 21];
    document.querySelectorAll("[data-hours]").forEach((group) => {
      group.innerHTML = "";
      marks.forEach((h) => {
        const angle = (h / 24) * Math.PI * 2;
        const r = 64;
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "hour-label");
        text.setAttribute("x", 100 + Math.sin(angle) * r);
        text.setAttribute("y", 100 - Math.cos(angle) * r);
        text.textContent = String(h);
        group.appendChild(text);
      });
    });
  }

  function buildMilestones() {
    milestonesGroup.innerHTML = "";
    milestoneList.innerHTML = "";
    milestones.forEach((m) => {
      const lifeH = ageToLifeHours(m.age);
      const angle = (lifeH / 24) * Math.PI * 2;
      const r = 70;
      const x = 100 + Math.sin(angle) * r;
      const y = 100 - Math.cos(angle) * r;
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("class", "milestone-dot");
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", y);
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
    if (!birthDate) return;
    const age = exactAgeYears(birthDate);
    const elapsedHours = clamp(age / LIFE_YEARS, 0, 1) * 24;
    renderLife(elapsedHours);
    rafId = requestAnimationFrame(liveTick);
  }

  function playToNow() {
    if (!birthDate) return;
    if (rafId) cancelAnimationFrame(rafId);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = clamp(exactAgeYears(birthDate) / LIFE_YEARS, 0, 1) * 24;

    if (reduceMotion) {
      document.body.classList.remove("is-playing");
      renderLife(target);
      rafId = requestAnimationFrame(liveTick);
      return;
    }

    document.body.classList.add("is-playing");
    litMilestones.clear();
    const start = performance.now();

    function anim(now) {
      const t = clamp((now - start) / PLAYBACK_MS, 0, 1);
      const eased = easeOutCubic(t);
      const elapsedHours = target * eased;
      renderLife(elapsedHours, {
        caption: t < 1 ? "正在走到此刻…" : undefined,
        nowLabel: t < 1 ? "回放" : undefined,
      });

      if (t < 1) {
        rafId = requestAnimationFrame(anim);
      } else {
        document.body.classList.remove("is-playing");
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
    litMilestones.clear();
    if (playback) playToNow();
    else {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(liveTick);
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = birthInput.value;
    if (!value) {
      birthInput.focus();
      return;
    }
    const date = new Date(`${value}T12:00:00`);
    const now = new Date();
    if (Number.isNaN(date.getTime())) {
      alert("请输入有效的出生日期");
      return;
    }
    if (date > now) {
      alert("未来的日子，时钟还走不到");
      return;
    }
    if (exactAgeYears(date) > 120) {
      alert("超出刻度了");
      return;
    }
    reveal(date, { playback: true });
  });

  noteInput.addEventListener("input", () => {
    noteTouched = true;
    try {
      localStorage.setItem(NOTE_KEY, noteInput.value);
    } catch (_) {}
  });

  soundBtn.addEventListener("click", () => {
    toggleSound().catch(() => {});
  });

  shareBtn.addEventListener("click", () => {
    exportShareCard().catch(() => alert("分享卡生成失败"));
  });

  const today = new Date();
  birthInput.max = today.toISOString().slice(0, 10);
  birthInput.min = "1900-01-01";

  try {
    const saved = localStorage.getItem(NOTE_KEY);
    if (saved) {
      noteInput.value = saved;
      noteTouched = true;
    }
  } catch (_) {}

  buildTicks();
  buildHourLabels();
  buildMilestones();
  updateSoundUi();
  resizeSeasonCanvas();
  spawnSeasonParticles("spring");
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    drawSeasonParticles();
  }
  window.addEventListener("resize", () => {
    resizeSeasonCanvas();
    spawnSeasonParticles(particleSeason);
  });

  const defaultBirth = "2000-10-05";
  if (!birthInput.value) birthInput.value = defaultBirth;
  reveal(new Date(`${birthInput.value}T12:00:00`), { playback: true });
})();

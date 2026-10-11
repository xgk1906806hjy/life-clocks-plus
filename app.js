(() => {
  const LIFE_YEARS = 80;
  const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
  const PLAYBACK_MS = 2800;

  const form = document.getElementById("birth-form");
  const birthInput = document.getElementById("birth-date");
  const clocks = document.getElementById("clocks");
  const caption = document.getElementById("caption");
  const nowLabel = document.getElementById("now-label");
  const soundBtn = document.getElementById("sound-btn");
  const soundLabel = document.getElementById("sound-label");
  const shareBtn = document.getElementById("share-btn");
  const shareCanvas = document.getElementById("share-canvas");

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
  let lastSnapshot = null;
  let soundOn = false;
  let audio = null;

  const stagePalette = {
    morning: { top: "#c9dcec", mid: "#e7dcc8", bot: "#e2b88a", ink: "#14181f" },
    noon: { top: "#b7d4ea", mid: "#f0d9a8", bot: "#e8a85c", ink: "#14181f" },
    afternoon: { top: "#b0c2d0", mid: "#e3b894", bot: "#d07a52", ink: "#14181f" },
    dusk: { top: "#2c3a48", mid: "#6a4e4a", bot: "#a85a3e", ink: "#f3ebe3" },
    night: { top: "#121820", mid: "#1e2834", bot: "#3a3538", ink: "#ebe4da" },
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

  function applyStage(stage) {
    if (stage.id === stageId) return;
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
  }

  function renderLife(elapsedHours, opts = {}) {
    const remainHours = Math.max(0, 24 - elapsedHours);
    const stage = getStage(elapsedHours);
    const age = birthDate ? exactAgeYears(birthDate) : 0;
    const progress = clamp(age / LIFE_YEARS, 0, 1);

    elapsedDigital.textContent = formatDigital(elapsedHours);
    afterglowDigital.textContent = formatDigital(remainHours);
    elapsedMeta.textContent = stage.elapsed;
    afterglowMeta.textContent = stage.afterglow;
    caption.textContent = opts.caption || stage.caption;
    nowLabel.textContent = opts.nowLabel || (progress >= 1 ? "圆满" : age < 0 ? "未至" : "此刻");

    applyHands(elapsedHour, elapsedMinute, elapsedSecond, elapsedHours);
    applyHands(afterglowHour, afterglowMinute, afterglowSecond, remainHours);
    applyStage(stage);

    lastSnapshot = {
      elapsedHours,
      remainHours,
      stage,
      birth: birthInput.value,
      ageYears: age,
    };
  }

  /* ---------- Ambient soundscape (Web Audio, no assets) ---------- */
  function createAmbient() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.045;
    bedGain.connect(master);

    const eventGain = ctx.createGain();
    eventGain.gain.value = 0.08;
    eventGain.connect(master);

    // Soft noise bed
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.7;

    noise.connect(filter);
    filter.connect(bedGain);
    noise.start();

    let stage = "morning";
    let timers = [];
    let running = false;

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function tone(freq, dur, type = "sine", gain = 0.04, dest = eventGain) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = 0;
      o.connect(g);
      g.connect(dest);
      const t0 = ctx.currentTime;
      g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }

    function chirp() {
      const f = 1800 + Math.random() * 1400;
      tone(f, 0.08 + Math.random() * 0.06, "triangle", 0.025);
      if (Math.random() > 0.5) {
        setTimeout(() => tone(f * 1.15, 0.06, "triangle", 0.018), 70);
      }
    }

    function bustle() {
      tone(220 + Math.random() * 180, 0.12, "sawtooth", 0.012);
      tone(90 + Math.random() * 40, 0.2, "sine", 0.02);
    }

    function pianoNote() {
      const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
      const f = scale[Math.floor(Math.random() * scale.length)];
      tone(f, 1.6, "sine", 0.035);
      tone(f * 2, 1.2, "triangle", 0.012);
    }

    function nightDrop() {
      tone(55 + Math.random() * 20, 2.4, "sine", 0.03);
    }

    function schedule() {
      if (!running) return;
      clearTimers();

      const loop = (fn, min, max) => {
        const delay = min + Math.random() * (max - min);
        const id = setTimeout(() => {
          if (!running) return;
          fn();
          loop(fn, min, max);
        }, delay);
        timers.push(id);
      };

      if (stage === "morning") {
        filter.frequency.setTargetAtTime(1400, ctx.currentTime, 0.5);
        bedGain.gain.setTargetAtTime(0.035, ctx.currentTime, 0.4);
        loop(chirp, 900, 2200);
      } else if (stage === "noon") {
        filter.frequency.setTargetAtTime(700, ctx.currentTime, 0.5);
        bedGain.gain.setTargetAtTime(0.055, ctx.currentTime, 0.4);
        loop(bustle, 400, 1100);
      } else if (stage === "afternoon") {
        filter.frequency.setTargetAtTime(500, ctx.currentTime, 0.5);
        bedGain.gain.setTargetAtTime(0.04, ctx.currentTime, 0.4);
        loop(() => tone(180 + Math.random() * 80, 0.5, "sine", 0.02), 1200, 2600);
      } else if (stage === "dusk") {
        filter.frequency.setTargetAtTime(350, ctx.currentTime, 0.5);
        bedGain.gain.setTargetAtTime(0.03, ctx.currentTime, 0.4);
        loop(pianoNote, 1800, 3600);
      } else {
        filter.frequency.setTargetAtTime(180, ctx.currentTime, 0.5);
        bedGain.gain.setTargetAtTime(0.02, ctx.currentTime, 0.4);
        loop(nightDrop, 2800, 5200);
      }
    }

    return {
      async resume() {
        if (ctx.state === "suspended") await ctx.resume();
        running = true;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
        schedule();
      },
      mute() {
        running = false;
        clearTimers();
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
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
    const { elapsedHours, remainHours, stage, birth, ageYears } = lastSnapshot;
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

    // soft light
    const glow = ctx.createRadialGradient(W * 0.7, H * 0.15, 40, W * 0.7, H * 0.15, 420);
    glow.addColorStop(0, "rgba(255,255,255,0.28)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = palette.ink;
    ctx.textAlign = "center";

    ctx.font = "800 92px Syne, sans-serif";
    ctx.fillText("生命时钟", W / 2, 180);

    ctx.globalAlpha = 0.7;
    ctx.font = "300 34px Outfit, sans-serif";
    ctx.fillText("八十载，浓缩成一天", W / 2, 250);
    ctx.globalAlpha = 1;

    ctx.font = "500 28px Outfit, sans-serif";
    ctx.globalAlpha = 0.55;
    ctx.fillText(`生于 ${birth}  ·  约 ${ageYears.toFixed(1)} 岁`, W / 2, 320);
    ctx.globalAlpha = 1;

    // dual times
    const drawBlock = (x, label, time, color) => {
      ctx.fillStyle = color;
      ctx.font = "600 26px Outfit, sans-serif";
      ctx.fillText(label, x, 470);
      ctx.fillStyle = palette.ink;
      ctx.font = "700 72px Syne, sans-serif";
      ctx.fillText(time, x, 560);
    };

    const elapsedColor = stage.id === "dusk" || stage.id === "night" ? "#e2a86a" : "#c45c3a";
    const afterglowColor = stage.id === "dusk" || stage.id === "night" ? "#8eb8c4" : "#2f6f7a";
    drawBlock(W * 0.28, "已行", formatDigital(elapsedHours), elapsedColor);
    drawBlock(W * 0.72, "余晖", formatDigital(remainHours), afterglowColor);

    // divider
    ctx.strokeStyle = palette.ink;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 430);
    ctx.lineTo(W / 2, 590);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.font = "400 40px Outfit, sans-serif";
    ctx.fillStyle = palette.ink;
    ctx.globalAlpha = 0.85;
    wrapText(ctx, stage.caption, W / 2, 720, W - 160, 56);
    ctx.globalAlpha = 1;

    ctx.font = "300 28px Outfit, sans-serif";
    ctx.globalAlpha = 0.55;
    wrapText(ctx, `${stage.elapsed}  /  ${stage.afterglow}`, W / 2, 860, W - 180, 42);
    ctx.globalAlpha = 1;

    // mini clock face
    drawMiniClock(ctx, W / 2, 1080, 110, elapsedHours, palette.ink);

    ctx.font = "500 22px Outfit, sans-serif";
    ctx.globalAlpha = 0.4;
    ctx.fillText("80 年 = 24 小时  ·  生命时钟", W / 2, 1280);
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
    const chars = text.split("");
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

    const { hours, minutes, seconds } = partsFromHours(lifeHours);
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

  soundBtn.addEventListener("click", () => {
    toggleSound().catch(() => {});
  });

  shareBtn.addEventListener("click", () => {
    exportShareCard().catch(() => alert("分享卡生成失败"));
  });

  const today = new Date();
  birthInput.max = today.toISOString().slice(0, 10);
  birthInput.min = "1900-01-01";

  buildTicks();
  buildHourLabels();
  updateSoundUi();

  const defaultBirth = "2000-10-05";
  if (!birthInput.value) birthInput.value = defaultBirth;
  reveal(new Date(`${birthInput.value}T12:00:00`), { playback: true });
})();

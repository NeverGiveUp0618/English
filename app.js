/* ============================================================
 * 魔法英语乐园 - 主逻辑
 * ============================================================ */

/* ---------------- 工具 ---------------- */
const $ = s => document.querySelector(s);
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function sample(a, n) { return shuffle(a).slice(0, n); }
function todayStr() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function yesterdayStr() { const d = new Date(Date.now() - 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

const WORD_INDEX = {};
UNITS.forEach(u => u.words.forEach(w => { WORD_INDEX[w.w] = w; }));

/* ---------------- 存档 ---------------- */
const LS_KEY = "magicEnglish_v1";
function defState() {
  return {
    coins: 0, xp: 0, streak: 0, lastDaily: "",
    daily: { date: todayStr(), w: 0, g: 0, r: 0, earn: 0, t1: false, t2: false, t3: false, t4: false, bonus: false },
    units: {},    // id -> {learned:[], stars:0, s3:false}
    wrong: {},    // word -> 次数
    stickers: {}, // 贴纸名 -> 数量
    buddy: null,  // 挂在宠物身边的贴纸（小伙伴）
    hat: null,    // 戴在宠物头上的贴纸
    setDone: {},  // 已领过的集齐奖励：r1/r2/r3
    checkins: {},  // 打卡成功的日期（完成当天全部任务才算）
    cyclesPaid: 0, // 已发过奖励的学习周期数（每满 7 天一个周期）
    tickets: 0,   // 转盘券
    wheel: null,  // 家长自定义转盘奖品，null=用默认
    vouchers: [], // 转盘中的实物奖励券 {n, d, used}
    wheelTouched: todayStr(), // 上次更换转盘奖品的日期，驱动14天上新提醒
    theme: "candy",
    themesOwned: ["candy"],
    sound: true,
    diff: "auto",    // 难度：auto=随掌握词量自动升段，或家长手动锁 1/2/3
    testMode: false, // 家长测试模式：解锁全部内容，给孩子用前记得关掉
    phonics: {},   // 拼读规则id -> {learned:true, stars:0}
    learnedAt: {}, // 单词 -> 首次学会日期
    srs: {},       // 单词 -> {lv:1..6, due:"YYYY-MM-DD"}  间隔重复调度器
    history: {},   // 日期 -> {right, total, w, g, mins}
    bestExam: 0    // 魔法大考最高分
  };
}
let S = defState();
try { const raw = localStorage.getItem(LS_KEY); if (raw) S = Object.assign(defState(), JSON.parse(raw)); } catch (e) {}
S.daily = Object.assign(defState().daily, S.daily);
if (!S.wheelTouched) S.wheelTouched = todayStr();
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} }
function unitS(id) { if (!S.units[id]) S.units[id] = { learned: [], stars: 0 }; return S.units[id]; }

/* 跨天重置每日任务 */
function ensureDaily() { if (S.daily.date !== todayStr()) S.daily = defState().daily; }
ensureDaily();

/* 老存档迁移：打卡日历上线前已完成过任务的，把最后一次打卡补进日历 */
function migrateCheckins() {
  if (!Object.keys(S.checkins).length && S.lastDaily) {
    S.checkins[S.lastDaily] = 1;
    S.cyclesPaid = Math.floor(Object.keys(S.checkins).length / CYCLE_DAYS);
    save();
  }
}

/* 老存档迁移：SRS 上线前学会的词还没有复习排程，全部安排成今天到期 */
function migrateSRS() {
  let n = 0;
  UNITS.forEach(u => {
    const us = S.units[u.id];
    if (!us || !us.learned) return;
    us.learned.forEach(word => {
      if (!S.learnedAt[word]) S.learnedAt[word] = todayStr();
      if (!S.srs[word]) { S.srs[word] = { lv: 1, due: todayStr() }; n++; }
    });
  });
  if (n) save();
}

/* ---------------- 难度成长曲线 ----------------
 * 刚上四年级的孩子先要的是"我能行"，不是"这好难"。
 * 一开始题目少、选项少、不催时间、拼写有提示；掌握的词变多后自动升段，难度悄悄加上去。
 */
const DIFFS = {
  1: {
    rank: "🌱 小小魔法学徒", next: 25,
    newWords: 3, games: 2, reviews: 2,      // 每日任务量（约10分钟）
    opts: 3,                                 // 3选1，先建立信心
    timer: 0,                                // 闪电轮不倒计时
    blanks: 1,                               // 补字母只挖1个
    spellMax: 6, spellHint: true,            // 拼写只出短词，并给提示
    sentMax: 5,                              // 句子小火车只排短句
    bossQ: 8, examQ: 10, pairs: 4
  },
  2: {
    rank: "✨ 魔法师", next: 60,
    newWords: 4, games: 3, reviews: 3,
    opts: 4,
    timer: 12000,                            // 开始有时间感，但很宽松
    blanks: 1,
    spellMax: 8, spellHint: true,
    sentMax: 7,
    bossQ: 10, examQ: 12, pairs: 5
  },
  3: {
    rank: "🦄 大魔法师", next: 0,
    newWords: 5, games: 3, reviews: 3,
    opts: 4,
    timer: 8000,                             // 正常的闪电轮
    blanks: 2,
    spellMax: 99, spellHint: false,          // 拼写全开，无提示
    sentMax: 99,
    bossQ: 10, examQ: 15, pairs: 6
  }
};
function masteredCount() { return UNITS.reduce((a, u) => a + unitS(u.id).learned.length, 0); }
function levelNum() {
  if (S.diff && S.diff !== "auto") return +S.diff;
  const m = masteredCount();
  if (m >= DIFFS[2].next) return 3;
  if (m >= DIFFS[1].next) return 2;
  return 1;
}
function D() { return DIFFS[levelNum()]; }
/* 干扰项数量随难度变化：3选1 / 4选1 */
function distract(pool, exclude) {
  return sample(pool.filter(x => x.w !== exclude), D().opts - 1);
}

/* ---------------- 语音 ---------------- */
let enVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  enVoice = vs.find(v => /female|samantha|karen|zira|aria|jenny/i.test(v.name)) || vs[0] || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

/* ---------------- 真人发音（edge-tts 预合成 mp3，主通道） ----------------
 * 手机自带的语音合成引擎经常没有英文语音包（安卓）或被系统限制，
 * 所以单词/句子发音一律播放网站里预先合成好的 mp3；找不到文件时才退回系统 TTS。
 */
const AUD = typeof Audio !== "undefined" ? new Audio() : null;
if (AUD) { AUD.preload = "auto"; AUD.crossOrigin = "anonymous"; }
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";
function audioFile(text) {
  if (typeof AUDIO_MAP === "undefined") return null;
  return AUDIO_MAP[text] || null;
}

/* iOS/安卓要求：音频必须先在一次真实触摸里"解锁"，否则后续全部静音 */
let audioReady = false, ttsWarned = false;
function unlockAudio() {
  if (audioReady) return;
  audioReady = true;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
  } catch (e) {}
  try {
    /* 在手势里播一段静音，解锁 <audio> 播放权限 */
    if (AUD) { AUD.src = SILENT_WAV; const p = AUD.play(); if (p && p.catch) p.catch(() => {}); }
  } catch (e) {}
  try {
    /* 顺便解锁 speechSynthesis（兜底通道用） */
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0.01; u.lang = "en-US";
    speechSynthesis.speak(u);
    pickVoice();
  } catch (e) {}
}
document.addEventListener("touchend", unlockAudio, { passive: true });
document.addEventListener("click", unlockAudio);
/* Chrome 长时间不说话会自己暂停，定时唤醒 */
setInterval(() => {
  try { if (window.speechSynthesis && speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {}
}, 5000);

function ttsFail() {
  if (ttsWarned) return;
  ttsWarned = true;
  toast("🔇 听不到发音？去「奖励屋→家长设置→发音自检」看看", 4000);
}
/* 主通道：播放预合成 mp3。onEnd 在音频真正播完时回调 */
function speak(text, rate, onEnd) {
  unlockAudio();
  const f = audioFile(text);
  if (AUD && f) {
    try {
      AUD.pause();
      AUD.onended = null;
      AUD.src = "audio/" + f;
      AUD.playbackRate = Math.min(1, Math.max(0.6, rate || 0.95));
      AUD.currentTime = 0;
      if (onEnd) AUD.onended = () => { AUD.onended = null; onEnd(); };
      const p = AUD.play();
      if (p && p.catch) p.catch(() => speakTTS(text, rate, onEnd));   // 被浏览器拦截 → 退回系统TTS
      return;
    } catch (e) { /* 落到 TTS */ }
  }
  speakTTS(text, rate, onEnd);
}
/* 兜底通道：系统语音合成 */
function speakTTS(text, rate, onEnd) {
  if (!("speechSynthesis" in window)) { ttsFail(); if (onEnd) onEnd(); return; }
  try {
    if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = rate || 0.8; u.volume = 1; u.pitch = 1.1;
    if (!enVoice) pickVoice();
    if (enVoice) u.voice = enVoice;
    if (onEnd) u.onend = onEnd;
    u.onerror = e => {
      if (e && e.error !== "interrupted" && e.error !== "canceled") ttsFail();
      if (onEnd) onEnd();
    };
    /* cancel() 之后立刻 speak 在 iOS 上常常不出声，隔一帧更稳 */
    setTimeout(() => {
      try { speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) { ttsFail(); if (onEnd) onEnd(); }
    }, 50);
  } catch (e) { ttsFail(); if (onEnd) onEnd(); }
}
/* 读完这句再往下走：等音频真正结束（带兜底超时，避免卡死） */
function speakThen(text, rate, cb, pauseMs) {
  let fired = false;
  const go = () => {
    if (fired) return;
    fired = true;
    clearTimeout(guard);
    setTimeout(cb, pauseMs === undefined ? 500 : pauseMs);
  };
  const guard = setTimeout(go, 8000);   // 音频没能触发结束事件时的兜底
  speak(text, rate, go);
}

/* ---------------- 音效 ---------------- */
let AC = null;
function tone(freq, dur, type, when, vol) {
  if (S.sound === false) return;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.value = vol || 0.15;
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + (when || 0) + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(AC.currentTime + (when || 0)); o.stop(AC.currentTime + (when || 0) + dur);
  } catch (e) {}
}
function sndRight() { tone(660, .12); tone(880, .18, "sine", .1); }
function sndWrong() { tone(200, .25, "sawtooth", 0, .08); }
function sndCoin() { tone(988, .1, "square", 0, .06); tone(1319, .2, "square", .08, .06); }
function sndWin() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, "sine", i * .12)); }

/* ---------------- 反馈特效 ---------------- */
let toastTimer = null;
function toast(msg, ms) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms || 1600);
}
function confetti() {
  const ems = ["🎉", "⭐", "💖", "🌸", "✨", "🎀"];
  for (let i = 0; i < 22; i++) {
    const d = document.createElement("div");
    d.className = "confetti"; d.textContent = ems[i % ems.length];
    d.style.left = Math.random() * 100 + "vw";
    d.style.animationDuration = (1.6 + Math.random() * 1.4) + "s";
    d.style.animationDelay = Math.random() * .5 + "s";
    document.body.appendChild(d); setTimeout(() => d.remove(), 3600);
  }
}
function coinFly(n) {
  const box = $("#coinBox").getBoundingClientRect();
  const d = document.createElement("div");
  d.className = "coinFly"; d.textContent = "+" + n + " 🪙";
  d.style.left = (box.left - 10) + "px"; d.style.top = (box.bottom + 6) + "px";
  document.body.appendChild(d); setTimeout(() => d.remove(), 1000);
}

/* ---------------- 金币 / 经验 / 宠物 ---------------- */
function petStage(xp) { let st = PET_STAGES[0]; PET_STAGES.forEach(p => { if (xp >= p.xp) st = p; }); return st; }
function petNext(xp) { return PET_STAGES.find(p => p.xp > xp) || null; }
function addCoins(n) {
  if (n <= 0) return;
  const before = petStage(S.xp).n;
  S.coins += n; S.xp += n;
  ensureDaily(); S.daily.earn += n;
  if (S.daily.earn >= 60 && !S.daily.t4) { S.daily.t4 = true; addTicket(1, "今日勤奋超额"); }
  save();
  $("#coinNum").textContent = S.coins;
  coinFly(n); sndCoin();
  const after = petStage(S.xp);
  if (after.n !== before) { confetti(); sndWin(); toast("🎊 宠物进化成【" + after.n + "】啦！", 2600); }
}
function addTicket(n, reason) {
  S.tickets += n; save();
  setTimeout(() => toast("🎡 获得转盘券 ×" + n + "（" + reason + "）", 2400), 900);
}
function updateCoinBox() { $("#coinNum").textContent = S.coins; }

/* ---------------- 每日任务 ---------------- */
function wrongCount() { return Object.keys(S.wrong).length; }
function bumpDaily(key, n) {
  ensureDaily();
  S.daily[key] += (n || 1);
  if (key === "g") hToday().g++;
  checkTasks();
}
/* 每日任务量按约15分钟设计：学5词≈4分钟 + 3局游戏≈8分钟 + 3错词≈2分钟 */
function noFreshWords() {
  return UNITS.filter(isUnlocked).every(u => unitS(u.id).learned.length >= u.words.length);
}
function taskDone() {
  const noReview = dueCount() === 0 && wrongCount() === 0;
  const d = D();
  return {
    /* 已解锁单元的新词全学完时，改为「复习也算数」，否则任务永远无法完成 */
    t1: S.daily.w >= d.newWords || (noFreshWords() && S.daily.g >= 2),
    t2: S.daily.g >= d.games,
    /* 复习任务：做掉到期词/错词；今天本来就没有要复习的，玩1局也算完成 */
    t3: S.daily.r >= d.reviews || (noReview && S.daily.g >= 1)
  };
}
function checkTasks() {
  const d = taskDone();
  ["t1", "t2", "t3"].forEach(k => {
    if (d[k] && !S.daily[k]) { S.daily[k] = true; addCoins(10); toast("✅ 完成每日任务，+10金币！"); }
  });
  if (d.t1 && d.t2 && d.t3 && !S.daily.bonus) {
    S.daily.bonus = true;
    S.streak = (S.lastDaily === yesterdayStr()) ? S.streak + 1 : 1;
    S.lastDaily = todayStr();
    S.checkins[todayStr()] = 1;          // 打卡成功
    addCoins(20); confetti(); sndWin();
    setTimeout(() => toast("🔥 今日全部任务完成！奖励20金币，连续 " + S.streak + " 天！", 2800), 400);
    addTicket(1, "完成今日全部任务");
    if (S.streak > 0 && S.streak % 3 === 0) setTimeout(() => addTicket(1, "连续学习" + S.streak + "天"), 1600);
    checkCycle();
  }
  save();
}

/* ---------------- 学习周期：累计打卡满 7 天 = 一个周期，奖励 2 张转盘券 ----------------
 * 用「累计」而不是「必须连续」：孩子偶尔漏一天不至于前功尽弃，
 * 连续性另有 🔥连续天数 在激励，两者互补。
 */
const CYCLE_DAYS = 7;
function checkinCount() { return Object.keys(S.checkins).length; }
function cycleProgress() { return checkinCount() % CYCLE_DAYS; }   // 本周期已打卡天数
function checkCycle() {
  const cycles = Math.floor(checkinCount() / CYCLE_DAYS);
  if (cycles > S.cyclesPaid) {
    const gain = (cycles - S.cyclesPaid) * 2;
    S.cyclesPaid = cycles; save();
    setTimeout(() => {
      confetti(); sndWin();
      toast("🎊 完成第 " + cycles + " 个学习周期！奖励 " + gain + " 张转盘券！", 3200);
    }, 2400);
    addTicket(gain, "坚持满 " + CYCLE_DAYS + " 天学习周期");
  }
}

/* ---------------- 错词本 + 答题统计 ---------------- */
function hToday() {
  const d = todayStr();
  if (!S.history[d]) S.history[d] = { right: 0, total: 0, w: 0, g: 0 };
  return S.history[d];
}
function logAnswer(isRight) {
  const h = hToday(); h.total++; if (isRight) h.right++; save();
}
function recordWrong(w) {
  S.wrong[w] = (S.wrong[w] || 0) + 2;
  logAnswer(false);
  srsGrade(w, false);          // 答错＝没记住，记忆等级打回1级，明天重练
  save();
}
function recordRight(w) {
  logAnswer(true);
  if (S.wrong[w]) { S.wrong[w]--; if (S.wrong[w] <= 0) delete S.wrong[w]; }
  srsGrade(w, true);           // 只有"到期的词"答对才升级（见 srsGrade）
  save();
}
/* ---------------- 间隔重复调度器（SRS） ----------------
 * 每个学会的词有记忆等级 lv(1~6) 和到期日 due。
 * 复习答对 → 升一级，间隔按 1/2/4/7/15/30 天拉长；答错 → 打回 1 级，明天再练。
 * 这样"当时学会但没进错词本"的词也会被系统主动召回，不会悄悄忘掉。
 */
const SRS_STEPS = [1, 2, 4, 7, 15, 30];   // 各等级的复习间隔（天）
const SRS_MAX = SRS_STEPS.length;         // 6 级＝已进入长期记忆

function dateAdd(days) {
  const d = new Date(Date.now() + days * 864e5);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function srsInit(word) {
  if (!S.srs[word]) S.srs[word] = { lv: 1, due: dateAdd(SRS_STEPS[0]) };
  return S.srs[word];
}
/* 复习结果驱动等级升降 */
function srsGrade(word, right) {
  if (!S.learnedAt[word]) return;              // 还没正式学过的词不排程
  const s = srsInit(word);
  if (right) {
    /* 只有到期的词答对才升级：防止同一天反复刷同一个词就冲到长期记忆 */
    if (s.due > todayStr()) return;
    s.lv = Math.min(SRS_MAX, s.lv + 1);
  } else {
    s.lv = 1;                                  // 答错一律打回重练
  }
  s.due = dateAdd(SRS_STEPS[s.lv - 1]);
  save();
}
/* 今天到期（含逾期）的词 */
function dueWords() {
  const t = todayStr();
  return Object.keys(S.srs)
    .filter(w => S.srs[w].due <= t && WORD_INDEX[w])
    .sort((a, b) => (S.srs[a].due < S.srs[b].due ? -1 : 1))   // 逾期最久的排前面
    .map(w => WORD_INDEX[w]);
}
function dueCount() { return dueWords().length; }
/* 记忆分层：1-2级=刚学 3-4级=熟悉 5-6级=长期记忆 */
function memoryTiers() {
  const t = { fresh: 0, familiar: 0, solid: 0 };
  Object.values(S.srs).forEach(s => {
    if (s.lv <= 2) t.fresh++; else if (s.lv <= 4) t.familiar++; else t.solid++;
  });
  return t;
}

/* 出题优先级：到期复习词 + 错词 优先 */
function priorityPick(pool, n) {
  const t = todayStr();
  const hot = pool.filter(w => S.wrong[w.w] || (S.srs[w.w] && S.srs[w.w].due <= t));
  const cold = pool.filter(w => !(S.wrong[w.w] || (S.srs[w.w] && S.srs[w.w].due <= t)));
  const picked = shuffle(hot).slice(0, n);
  return shuffle(picked.concat(shuffle(cold).slice(0, n - picked.length)));
}

/* ---------------- 导航 ---------------- */
let navStack = [];
function show(id, title) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("on"));
  $("#scr-" + id).classList.add("on");
  $("#barTitle").textContent = title;
  $("#backBtn").style.visibility = navStack.length > 1 ? "visible" : "hidden";
  $("#screens").scrollTop = 0;
}
function go(render) { navStack.push(render); render(); }
function goTab(render) { navStack = [render]; render(); }
function goBack() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  clearTimer();
  if (echoCleanup) { echoCleanup(); echoCleanup = null; }   // 关掉麦克风
  if (navStack.length > 1) navStack.pop();
  navStack[navStack.length - 1]();
}
$("#backBtn").onclick = goBack;
document.querySelectorAll(".tab").forEach(t => {
  t.onclick = () => {
    clearTimer();
    if (echoCleanup) { echoCleanup(); echoCleanup = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("on"));
    t.classList.add("on");
    ({ home: () => goTab(renderHome), map: () => goTab(renderMap), phonics: () => goTab(renderPhonicsList), arcade: () => goTab(renderArcade), reward: () => goTab(renderReward) })[t.dataset.tab]();
  };
});

/* ---------------- 解锁逻辑 ---------------- */
function bookUnits(book) { return UNITS.filter(u => u.book === book); }
function isUnlocked(u) {
  if (S.testMode) return true;
  const list = bookUnits(u.book);
  const idx = list.indexOf(u);
  if (idx === 0) return true;
  return unitS(list[idx - 1].id).stars >= 1;
}
function currentUnit() {
  for (const u of UNITS) if (isUnlocked(u) && unitS(u.id).stars < 1) return u;
  return UNITS[0];
}
function unlockedWords() {
  let ws = [];
  UNITS.forEach(u => { if (isUnlocked(u)) ws = ws.concat(u.words); });
  return ws;
}
function unlockedSents() {
  let ss = [];
  UNITS.forEach(u => { if (isUnlocked(u)) ss = ss.concat(u.sents); });
  return ss;
}

/* ================= 首页 ================= */
function renderHome() {
  const st = petStage(S.xp), nx = petNext(S.xp);
  const prevXp = st.xp, nextXp = nx ? nx.xp : S.xp;
  const pct = nx ? Math.min(100, Math.round((S.xp - prevXp) / (nextXp - prevXp) * 100)) : 100;
  const d = taskDone();
  const cu = currentUnit();
  const wc = wrongCount();
  const dc = dueCount();
  const mt = memoryTiers();
  const lv = levelNum(), df = D(), mc = masteredCount();
  const rankTip = S.diff !== "auto"
    ? "（家长已锁定难度）"
    : df.next ? "再学会 " + Math.max(0, df.next - mc) + " 个单词就能升段！" : "已是最高段位，太厉害了！";
  $("#scr-home").innerHTML = `
    ${S.testMode ? `<div class="card" id="testBanner" style="background:#fff3d6;text-align:center;padding:10px;font-size:13px;font-weight:700;color:#e8842d">🧪 测试模式开启中（全部内容已解锁）· 点我关闭</div>` : ""}
    <div class="card" id="petCard">
      <div id="streakChip">🔥 连续 ${S.streak} 天</div>
      <button id="themeQuick" style="position:absolute;top:10px;right:10px;border:none;background:none;font-size:22px">🎨</button>
      <div class="petShow" id="petShow">
        <span class="petHat">${S.hat ? stickerOf(S.hat).e : ""}</span>
        <span id="petEmoji">${st.e}</span>
        <span class="petBuddy">${S.buddy ? stickerOf(S.buddy).e : ""}</span>
      </div>
      <div id="petStage">${st.n}</div>
      <div id="petTip">${(S.hat || S.buddy) ? "点宠物有惊喜　·　贴纸册可换装扮" : Object.keys(S.stickers).length ? "去贴纸册，给宠物戴上贴纸！" : "点我一下，给你惊喜～"}</div>
      <div class="xpbarWrap"><div class="xpbar" style="width:${pct}%"></div></div>
      <div id="xpText">${nx ? "距离进化【" + nx.n + "】还差 " + (nx.xp - S.xp) + " 魔法值" : "已经是最终形态啦！"}</div>
      <div id="rankChip">${df.rank}　<span style="font-weight:400;color:#c0a8d0">${rankTip}</span></div>
    </div>
    <div class="sectionTitle">📋 今日任务 · 约${lv === 1 ? "10" : "15"}分钟（全完成 +20🪙+🎟️）</div>
    <div class="card">
      <div class="taskRow ${d.t1 ? "done" : ""}"><span class="tIcon">📖</span><span class="tName">${noFreshWords() ? "复习巩固（新词已学完）" : "学会 " + df.newWords + " 个新单词"}</span><span class="tProg">${noFreshWords() ? Math.min(S.daily.g, 2) + "/2" : Math.min(S.daily.w, df.newWords) + "/" + df.newWords}</span></div>
      <div class="taskRow ${d.t2 ? "done" : ""}"><span class="tIcon">🎮</span><span class="tName">完成 ${df.games} 局小游戏</span><span class="tProg">${Math.min(S.daily.g, df.games)}/${df.games}</span></div>
      <div class="taskRow ${d.t3 ? "done" : ""}"><span class="tIcon">📅</span><span class="tName">复习 ${df.reviews} 个到期单词</span><span class="tProg">${(dc === 0 && wc === 0) ? "无需复习" : Math.min(S.daily.r, df.reviews) + "/" + df.reviews}</span></div>
    </div>
    ${dc ? `<button class="btn" id="homeDue" style="background:linear-gradient(135deg,#ffd166,#ff9ec6)">📅 今天有 ${dc} 个词该复习了！（点我）</button><div style="height:12px"></div>` : ""}
    <button class="btn ${dc ? "ghost" : ""}" id="homeGo">✨ 继续闯关：${cu.num} ${cu.zh} →</button>
    <div style="height:12px"></div>
    <div class="card" style="display:flex;text-align:center;padding:12px">
      <div style="flex:1"><div style="font-size:19px;font-weight:800;color:#e8a33d">${mt.fresh}</div><div style="font-size:11px;color:#b8a8c8">刚学会</div></div>
      <div style="flex:1"><div style="font-size:19px;font-weight:800;color:#b98ff0">${mt.familiar}</div><div style="font-size:11px;color:#b8a8c8">越来越熟</div></div>
      <div style="flex:1"><div style="font-size:19px;font-weight:800;color:#7cc576">${mt.solid}</div><div style="font-size:11px;color:#b8a8c8">🏆 记牢了</div></div>
    </div>
    <div class="homeGrid">
      <div class="card" id="homeReview"><div class="hIcon">📕</div><div class="hName">错词本</div><div class="hSub">${wc ? wc + " 个词等你消灭" : "干干净净，真棒！"}</div></div>
      <div class="card" id="homeAlbum"><div class="hIcon">📔</div><div class="hName">贴纸册</div><div class="hSub">已收集 ${Object.keys(S.stickers).length}/${STICKERS.length}</div></div>
      <div class="card" id="homeWheel"><div class="hIcon">🎡</div><div class="hName">幸运大转盘</div><div class="hSub">${S.tickets ? "有 " + S.tickets + " 张转盘券！" : "完成任务赢转盘券"}</div></div>
      <div class="card" id="homeVoucher"><div class="hIcon">🎟️</div><div class="hName">我的奖励券</div><div class="hSub">${(() => { const p = S.vouchers.filter(v => !v.used).length; return p ? p + " 张待兑换" : "转转盘赢真奖励"; })()}</div></div>
    </div>
    ${renderCalendar()}`;
  $("#petEmoji").onclick = () => {
    const p = PRAISES[Math.floor(Math.random() * PRAISES.length)];
    const el = $("#petEmoji"); el.classList.remove("bounce"); void el.offsetWidth; el.classList.add("bounce");
    speak(p.en, 0.9); toast(p.en + "  " + p.zh);
  };
  $("#homeGo").onclick = () => go(() => renderUnit(cu));
  if (dc) $("#homeDue").onclick = () => go(() => startDueReview());
  $("#homeReview").onclick = () => { if (wrongCount()) go(() => startReview()); else toast("错词本是空的，去玩游戏吧！"); };
  $("#homeAlbum").onclick = () => go(renderAlbum);
  $("#homeWheel").onclick = () => go(renderWheel);
  $("#homeVoucher").onclick = () => go(renderVoucher);
  $("#themeQuick").onclick = () => go(renderTheme);
  if (S.testMode) $("#testBanner").onclick = () => {
    S.testMode = false; save(); toast("✅ 测试模式已关闭，恢复正常闯关", 2200); renderHome();
  };
  show("home", "魔法英语乐园");
  updateCoinBox();
}

/* ================= 打卡日历（首页底部） ================= */
function renderCalendar() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1).getDay();          // 本月1号是周几（0=周日）
  const days = new Date(y, m + 1, 0).getDate();      // 本月天数
  const today = todayStr();
  const key = d => y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");

  let cells = "";
  for (let i = 0; i < first; i++) cells += `<div class="calCell blank"></div>`;
  for (let d = 1; d <= days; d++) {
    const k = key(d);
    const done = !!S.checkins[k];
    const isToday = k === today;
    const future = k > today;
    cells += `<div class="calCell ${done ? "done" : ""} ${isToday ? "today" : ""} ${future ? "future" : ""}">
      ${done ? "🔥" : d}
    </div>`;
  }
  const monthDone = Object.keys(S.checkins).filter(k => k.startsWith(y + "-" + String(m + 1).padStart(2, "0"))).length;
  const prog = cycleProgress();
  const left = CYCLE_DAYS - prog;
  const total = checkinCount();

  return `
    <div class="sectionTitle">📆 打卡日历</div>
    <div class="card" style="padding:14px 12px">
      <div class="calHead">
        <span>${y} 年 ${m + 1} 月</span>
        <span style="font-size:12px;color:#b8a8c8;font-weight:400">本月打卡 ${monthDone} 天 · 累计 ${total} 天</span>
      </div>
      <div class="calGrid calWeek">
        ${["日", "一", "二", "三", "四", "五", "六"].map(w => `<div class="calW">${w}</div>`).join("")}
      </div>
      <div class="calGrid">${cells}</div>

      <div class="cycleBox">
        <div class="cycleTop">
          <span>🎯 本学习周期（${CYCLE_DAYS} 天）</span>
          <span style="color:#e8842d;font-weight:800">${prog} / ${CYCLE_DAYS}</span>
        </div>
        <div class="cycleBarWrap">
          <div class="cycleBar" style="width:${prog / CYCLE_DAYS * 100}%"></div>
        </div>
        <div class="cycleTip">
          ${prog === 0 && total > 0
            ? "🎊 上个周期已完成，新周期开始啦！"
            : "再坚持 <b>" + left + "</b> 天打卡，奖励 <b>2 张转盘券</b> 🎟️🎟️"}
          ${S.cyclesPaid ? `<span style="color:#c0a8d0">　已完成 ${S.cyclesPaid} 个周期</span>` : ""}
        </div>
      </div>
      <div style="font-size:11px;color:#c0b0d0;margin-top:8px;text-align:center">
        完成当天全部任务才算打卡成功 🔥
      </div>
    </div>`;
}

/* ================= 闯关地图 ================= */
function renderMap() {
  let html = "";
  ["四上", "四下"].forEach(bk => {
    html += `<div class="bookLabel">—— 🌈 ${bk}册 ——</div>`;
    bookUnits(bk).forEach(u => {
      const us = unitS(u.id), open = isUnlocked(u);
      const stars = "★".repeat(us.stars) + "☆".repeat(3 - us.stars);
      html += `
      <div class="card unitCard ${open ? "" : "locked"}" data-uid="${u.id}">
        <div class="unitIcon">${open ? u.icon : "🔒"}</div>
        <div class="unitInfo">
          <div class="unitName">${u.num} ${esc(u.name)}</div>
          <div class="unitZh">${u.zh}</div>
          <div class="unitProg">单词 ${us.learned.length}/${u.words.length}</div>
        </div>
        <div class="unitStars" style="color:#ffb830">${stars}</div>
      </div>`;
    });
  });
  $("#scr-map").innerHTML = html;
  document.querySelectorAll("#scr-map .unitCard").forEach(c => {
    c.onclick = () => {
      const u = UNITS.find(x => x.id === c.dataset.uid);
      if (!isUnlocked(u)) { toast("先在上一单元挑战中拿到 ⭐ 才能解锁哦"); sndWrong(); return; }
      go(() => renderUnit(u));
    };
  });
  show("map", "🗺️ 闯关地图");
}

/* ================= 单元页 ================= */
function renderUnit(u) {
  const us = unitS(u.id);
  const stars = "★".repeat(us.stars) + "☆".repeat(3 - us.stars);
  const acts = [
    { icon: "📖", name: "学单词", sub: `已学 ${us.learned.length}/${u.words.length}`, fn: () => startLearn(u) },
    { icon: "🔗", name: "词语配对", sub: "单词和图片手拉手", fn: () => startMatch(u.words, u) },
    { icon: "👂", name: "听音选图", sub: "耳朵灵不灵？", fn: () => startListen(u.words, u) },
    { icon: "🔤", name: "拼写工坊", sub: "拼出魔法单词", fn: () => startSpell(u.words, u) },
    { icon: "🚂", name: "句子小火车", sub: "把句子排排队", fn: () => startSentence(u.sents, u) },
    { icon: "⭐", name: "单元挑战", sub: "当前星星：" + stars, fn: () => startBoss(u) }
  ];
  $("#scr-unit").innerHTML = `
    <div class="card" style="text-align:center">
      <div style="font-size:48px">${u.icon}</div>
      <div style="font-size:20px;font-weight:800;color:#7a5a9a">${u.num} ${esc(u.name)}</div>
      <div style="font-size:13px;color:#b8a8c8">${u.book}册 · ${u.zh} · <span style="color:#ffb830">${stars}</span></div>
    </div>
    ${acts.map((a, i) => `
      <div class="card actRow" data-i="${i}">
        <span class="aIcon">${a.icon}</span>
        <span class="aName">${a.name}<span class="aSub">${a.sub}</span></span>
        <span class="aGo">▶</span>
      </div>`).join("")}`;
  document.querySelectorAll("#scr-unit .actRow").forEach(c => {
    c.onclick = () => go(() => acts[+c.dataset.i].fn());
  });
  show("unit", u.zh);
}

/* ================= 学单词：魔法孵化（翻卡 → 每词三连击 → 闪电轮） =================
 * 设计：每个词学完立刻用三种方式提取一遍（听→看→拼），当场对错当场纠正；
 * 五个词全部点亮后进入限时连击闪电轮，把成就感堆在最后。
 */
let liveTimer = null;
function clearTimer() { if (liveTimer) { clearInterval(liveTimer); liveTimer = null; } }

function startLearn(u) {
  const us = unitS(u.id);
  const df = D();
  const fresh = u.words.filter(w => !us.learned.includes(w.w));
  const reviewMode = fresh.length === 0;
  const batch = reviewMode ? sample(u.words, df.newWords) : fresh.slice(0, df.newWords);
  const lit = [];           // 已点亮的词下标
  let idx = 0, coins = 0, combo = 0, maxCombo = 0;

  const petNow = petStage(S.xp).e;
  function lights() {
    return `<div id="wordLights">${batch.map((w, i) =>
      `<span class="wl ${lit.includes(i) ? "on" : i === idx ? "cur" : ""}">${lit.includes(i) ? w.e : "●"}</span>`).join("")}</div>`;
  }
  function comboTag() {
    const mult = combo >= 4 ? 3 : combo >= 2 ? 2 : 1;
    return mult > 1 ? `<div class="comboTag">🔥 ${mult} 倍连击！</div>` : "";
  }
  function gain(n) {
    const mult = combo >= 4 ? 3 : combo >= 2 ? 2 : 1;
    coins += n * mult;
    return n * mult;
  }

  /* —— 第1步：翻卡揭晓 —— */
  function flip() {
    const w = batch[idx];
    $("#scr-learn").innerHTML = `
      <div id="learnProg">${reviewMode ? "🌟 温故知新" : "✨ 孵化新单词"} ${idx + 1} / ${batch.length}</div>
      ${lights()}
      <div class="card flipWrap" id="flipCard">
        <div class="flipInner">
          <div class="flipBack">
            <div style="font-size:70px">🎴</div>
            <div style="font-size:15px;font-weight:700;color:#9b59b6;margin-top:6px">点我翻开新单词</div>
            <div style="font-size:12px;color:#c0a8d0">看看这次是什么？</div>
          </div>
          <div class="flipFront">
            <div id="lcEmoji">${w.e}</div>
            <div id="lcWord">${esc(w.w)}</div>
            <div id="lcZh">${w.zh}</div>
            <button id="lcSpeak">🔊</button>
          </div>
        </div>
      </div>
      <button class="btn" id="lcGo" style="visibility:hidden">开始三连击 →</button>`;
    const cardEl = $("#flipCard");
    cardEl.onclick = () => {
      if (cardEl.classList.contains("flipped")) return;
      cardEl.classList.add("flipped");
      tone(600, .08); tone(900, .12, "sine", .08);
      speak(w.w);
      confettiSmall(6);
      setTimeout(() => {
        const b = $("#lcGo");
        if (b) { b.style.visibility = "visible"; b.classList.add("pop"); }
      }, 500);
    };
    setTimeout(() => { const s = $("#lcSpeak"); if (s) s.onclick = ev => { ev.stopPropagation(); speak(w.w); }; }, 0);
    $("#lcGo").onclick = () => drill(0, 0);
    show("learn", "🥚 魔法孵化");
  }

  /* —— 第2步：这个词的三连击（听→看→拼） —— */
  function drill(step, retried) {
    const w = batch[idx];
    if (step >= 3) return litUp();
    const others = distract(u.words, w.w);
    const stepName = ["🔊 听音选图", "🖼️ 看图选词", "🔤 补出字母"][step];
    let head = "", body = "";

    if (step === 0) {
      const opts = shuffle([w].concat(others));
      head = `<button id="lcSpeak" style="margin-top:0">🔊</button><div class="qSub">听一听，是哪一个？</div>`;
      body = `<div class="optGrid">${opts.map((o, i) => `<button class="optBtn dOpt" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("")}</div>`;
      renderDrill(head, body, opts, w, step, retried);
      speak(w.w);
      setTimeout(() => { const s = $("#lcSpeak"); if (s) s.onclick = () => speak(w.w); }, 0);
    } else if (step === 1) {
      const opts = shuffle([w].concat(others));
      head = `<div class="qEmoji" style="font-size:64px">${w.e}</div><div class="qSub">${w.zh} —— 英文怎么写？</div>`;
      body = `<div class="optGrid">${opts.map((o, i) => `<button class="optBtn dOpt" data-i="${i}">${esc(o.w)}</button>`).join("")}</div>`;
      renderDrill(head, body, opts, w, step, retried);
    } else {
      /* 补字母：按难度挖掉 1~2 个字母，用字母键补回 */
      const letters = [];
      [...w.w].forEach((c, i) => { if (/[a-z]/i.test(c)) letters.push(i); });
      const nHoles = Math.min(w.w.length <= 4 ? 1 : df.blanks, letters.length);
      const holes = sample(letters, nHoles).sort((a, b) => a - b);
      const shown = [...w.w].map((c, i) => holes.includes(i) ? "▢" : c).join("");
      const need = holes.map(i => w.w[i].toLowerCase());
      const extra = "abcdefghijklmnopqrstuvwxyz".split("").filter(c => !need.includes(c));
      const keys = shuffle(need.concat(sample(extra, 5)));
      let typed = [];
      $("#scr-learn").innerHTML = `
        <div id="learnProg">${stepName}　${idx + 1}/${batch.length} 的第 ${step + 1}/3 关</div>
        ${lights()}${comboTag()}
        <div class="card" id="playQ" style="padding:16px">
          <div class="qEmoji" style="font-size:56px">${w.e}</div>
          <div class="qText" id="holeWord" style="letter-spacing:2px">${esc(shown).replace(/▢/g, '<b style="color:#e56ba0">▢</b>')}</div>
          <div class="qSub">${w.zh}　<button id="lcSpeak" style="width:40px;height:40px;font-size:18px;margin-top:0;vertical-align:middle">🔊</button></div>
        </div>
        <div id="spellKeys">${keys.map((k, i) => `<button class="key" data-k="${k}" data-i="${i}">${k}</button>`).join("")}</div>`;
      speak(w.w);
      $("#lcSpeak").onclick = () => speak(w.w);
      document.querySelectorAll("#scr-learn .key").forEach(b => {
        b.onclick = () => {
          if (b.disabled) return;
          const want = need[typed.length];
          if (b.dataset.k === want) {
            typed.push(b.dataset.k); b.disabled = true; tone(760 + typed.length * 60, .08);
            const cur = [...w.w].map((c, i) => holes.includes(i) && holes.indexOf(i) >= typed.length ? "▢" : c).join("");
            $("#holeWord").innerHTML = esc(cur).replace(/▢/g, '<b style="color:#e56ba0">▢</b>');
            if (typed.length === need.length) {
              $("#holeWord").style.color = "#7cc576";
              good(w, step, "拼对啦！");
            }
          } else {
            b.classList.add("wrong"); sndWrong();
            bad(w, step, retried, "正确拼写：" + w.w);
          }
        };
      });
      show("learn", "🥚 魔法孵化");
    }
  }

  function renderDrill(head, body, opts, w, step, retried) {
    $("#scr-learn").innerHTML = `
      <div id="learnProg">${["🔊 听音选图", "🖼️ 看图选词", "🔤 补出字母"][step]}　${idx + 1}/${batch.length} 的第 ${step + 1}/3 关</div>
      ${lights()}${comboTag()}
      <div class="card" id="playQ">${head}</div>
      ${body}`;
    let locked = false;
    document.querySelectorAll("#scr-learn .dOpt").forEach(b => {
      b.onclick = () => {
        if (locked) return; locked = true;
        const o = opts[+b.dataset.i];
        if (o.w === w.w) { b.classList.add("right"); good(w, step, ""); }
        else {
          b.classList.add("wrong");
          document.querySelectorAll("#scr-learn .dOpt").forEach(x => { if (opts[+x.dataset.i].w === w.w) x.classList.add("right"); });
          bad(w, step, retried, "");
        }
      };
    });
    show("learn", "🥚 魔法孵化");
  }

  function good(w, step, msg) {
    sndRight(); combo++; maxCombo = Math.max(maxCombo, combo);
    recordRight(w.w);
    const got = gain(2);
    coinFly(got);
    if (msg) toast(msg, 900);
    setTimeout(() => drill(step + 1, 0), 850);
  }
  function bad(w, step, retried, msg) {
    sndWrong(); combo = 0; recordWrong(w.w);
    speak(w.w, 0.7);
    toast(msg || (w.w + " = " + w.zh), 1600);
    /* 错了当场再考一遍同一关，直到会为止（最多重来1次） */
    setTimeout(() => retried ? drill(step + 1, 0) : drill(step, 1), 1700);
  }

  /* —— 第3步：点亮这个词 —— */
  function litUp() {
    const w = batch[idx];
    const rankBefore = levelNum();
    if (!us.learned.includes(w.w)) {
      us.learned.push(w.w);
      S.learnedAt[w.w] = todayStr();
      srsInit(w.w);            // 排进复习计划：明天第一次复习
      hToday().w++;
      bumpDaily("w");
    }
    save();
    if (levelNum() > rankBefore) {
      confetti(); sndWin();
      setTimeout(() => toast("🎉 升段啦！你现在是【" + D().rank + "】", 3000), 600);
    }
    lit.push(idx);
    confettiSmall(10); sndCoin();
    $("#scr-learn").innerHTML = `
      <div id="learnProg">✨ 收服成功！</div>
      ${lights()}
      <div class="card" style="text-align:center;padding:26px 16px">
        <div style="font-size:60px" class="petEat">${petNow}</div>
        <div style="font-size:22px;font-weight:800;color:#7cc576;margin-top:6px">${esc(w.w)} ${w.e}</div>
        <div style="font-size:14px;color:#b08ac0">${w.zh}　已被你收服！</div>
        <div style="font-size:12px;color:#c0a8d0;margin-top:6px">${lit.length < batch.length ? "还剩 " + (batch.length - lit.length) + " 个新单词" : "五个单词全部点亮！"}</div>
      </div>
      <button class="btn" id="nextW">${lit.length < batch.length ? "孵化下一个 →" : "⚡ 进入闪电轮！"}</button>`;
    $("#nextW").onclick = () => {
      if (lit.length < batch.length) { idx++; flip(); }
      else lightning();
    };
    show("learn", "🥚 魔法孵化");
  }

  /* —— 第4步：闪电轮（限时 + 连击倍率） —— */
  function lightning() {
    const qs = shuffle(batch.concat(sample(batch, 3)));
    let qi = 0, right = 0;
    combo = 0;
    function q() {
      clearTimer();
      if (qi >= qs.length) return finish();
      const w = qs[qi];
      const type = qi % 2 === 0 ? "listen" : "zhen";
      const opts = shuffle([w].concat(distract(batch, w.w)));
      const rush = df.timer > 0;   // 新手段位不倒计时，先建立信心
      const head = type === "listen"
        ? `<button id="lcSpeak" style="margin-top:0">🔊</button><div class="qSub">${rush ? "快！" : ""}听音选图</div>`
        : `<div class="qEmoji" style="font-size:52px">${w.e}</div><div class="qSub">${rush ? "快！" : ""}${w.zh} 的英文</div>`;
      const optHtml = type === "listen"
        ? opts.map((o, i) => `<button class="optBtn lOpt" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("")
        : opts.map((o, i) => `<button class="optBtn lOpt" data-i="${i}">${esc(o.w)}</button>`).join("");
      $("#scr-learn").innerHTML = `
        <div id="learnProg">⚡ ${rush ? "闪电轮" : "连击轮"} ${qi + 1} / ${qs.length}　已答对 ${right}</div>
        ${rush ? `<div class="timerWrap"><div class="timerBar" id="tBar"></div></div>` : `<div style="text-align:center;font-size:11px;color:#c0a8d0;margin-bottom:8px">慢慢想，答对就有连击 🔥</div>`}
        ${comboTag()}
        <div class="card" id="playQ">${head}</div>
        <div class="optGrid">${optHtml}</div>`;
      if (type === "listen") { speak(w.w); setTimeout(() => { const s = $("#lcSpeak"); if (s) s.onclick = () => speak(w.w); }, 0); }
      let locked = false, left = df.timer;
      const bar = $("#tBar");
      if (rush) liveTimer = setInterval(() => {
        left -= 100;
        if (bar) bar.style.width = Math.max(0, left / df.timer * 100) + "%";
        if (left <= 2000 && bar) bar.style.background = "#ff8fab";
        if (left <= 0) {
          clearTimer();
          if (locked) return; locked = true;
          combo = 0; sndWrong(); recordWrong(w.w);
          toast("⏰ 太慢啦！" + w.w + " = " + w.zh, 1500);
          document.querySelectorAll("#scr-learn .lOpt").forEach(x => { if (opts[+x.dataset.i].w === w.w) x.classList.add("right"); });
          setTimeout(() => { qi++; q(); }, 1400);
        }
      }, 100);
      document.querySelectorAll("#scr-learn .lOpt").forEach(b => {
        b.onclick = () => {
          if (locked) return; locked = true;
          clearTimer();
          const o = opts[+b.dataset.i];
          if (o.w === w.w) {
            b.classList.add("right"); sndRight(); right++; combo++;
            maxCombo = Math.max(maxCombo, combo);
            recordRight(w.w);
            const got = gain(3); coinFly(got);
            if (combo === 2 || combo === 4) { toast("🔥 " + (combo >= 4 ? 3 : 2) + " 倍连击！", 1000); confettiSmall(8); }
          } else {
            b.classList.add("wrong"); sndWrong(); combo = 0; recordWrong(w.w);
            document.querySelectorAll("#scr-learn .lOpt").forEach(x => { if (opts[+x.dataset.i].w === w.w) x.classList.add("right"); });
          }
          setTimeout(() => { qi++; q(); }, 800);
        };
      });
      show("learn", "⚡ 闪电轮");
    }
    q();
    function finish() {
      clearTimer();
      bumpDaily("g");
      const stars = right === qs.length ? 3 : right >= qs.length - 2 ? 2 : 1;
      renderResult({
        stars,
        title: right === qs.length ? "闪电轮全对，太强了！" : "五个新单词已收服！",
        detail: `闪电轮答对 ${right}/${qs.length}　最高连击 ${maxCombo} 连`,
        coins: coins + (right === qs.length ? 8 : 0),
        replay: () => startLearn(u)
      });
    }
  }

  flip();
}
function confettiSmall(n) {
  const ems = ["✨", "⭐", "💖"];
  for (let i = 0; i < n; i++) {
    const d = document.createElement("div");
    d.className = "confetti"; d.textContent = ems[i % ems.length];
    d.style.left = (30 + Math.random() * 40) + "vw";
    d.style.fontSize = "18px";
    d.style.animationDuration = (1 + Math.random()) + "s";
    document.body.appendChild(d); setTimeout(() => d.remove(), 2200);
  }
}

/* ================= 通用结算页 ================= */
function renderResult(r) {
  addCoins(r.coins);
  if (r.stars >= 3) { confetti(); sndWin(); } else if (r.stars >= 1) sndWin();
  $("#scr-result").innerHTML = `
    <div id="resStars">${"⭐".repeat(Math.max(r.stars, 0)) || "💪"}</div>
    <div id="resTitle">${r.title}</div>
    <div id="resDetail">${r.detail || ""}</div>
    <div id="resCoins">+${r.coins} 🪙</div>
    <button class="btn" id="resAgain">再来一次 🔁</button>
    <div style="height:10px"></div>
    <button class="btn ghost" id="resBack">返回 ↩</button>`;
  $("#resAgain").onclick = () => r.replay();
  $("#resBack").onclick = goBack;
  show("result", "🎉 结算");
}

/* ================= 游戏1：词语配对 ================= */
function startMatch(pool, u) {
  const pairs = sample(pool, Math.min(D().pairs, pool.length));
  let selL = null, selR = null, done = 0, miss = 0;
  const left = shuffle(pairs), rightC = shuffle(pairs);
  $("#scr-play").innerHTML = `
    <div id="playHead"><div id="playProg">把单词和图片配成对！</div></div>
    <div class="matchCols">
      <div class="matchCol">${left.map((w, i) => `<button class="mItem mL" data-w="${esc(w.w)}">${esc(w.w)}</button>`).join("")}</div>
      <div class="matchCol">${rightC.map((w, i) => `<button class="mItem mR" data-w="${esc(w.w)}"><span class="me">${w.e}</span><br>${w.zh}</button>`).join("")}</div>
    </div>`;
  function checkPair() {
    if (!selL || !selR) return;
    const a = selL, b = selR; selL = selR = null;
    if (a.dataset.w === b.dataset.w) {
      sndRight(); recordRight(a.dataset.w); speak(a.dataset.w);
      a.classList.remove("sel"); b.classList.remove("sel");
      a.classList.add("ok"); b.classList.add("ok");
      if (++done === pairs.length) {
        bumpDaily("g");
        const stars = miss === 0 ? 3 : miss <= 2 ? 2 : 1;
        setTimeout(() => renderResult({
          stars, title: miss === 0 ? "完美配对！" : "配对完成！",
          detail: `失误 ${miss} 次`, coins: pairs.length * 2 + (miss === 0 ? 5 : 0),
          replay: () => startMatch(pool, u)
        }), 500);
      }
    } else {
      miss++; sndWrong(); recordWrong(a.dataset.w);
      a.classList.add("bad"); b.classList.add("bad");
      setTimeout(() => { a.classList.remove("sel", "bad"); b.classList.remove("sel", "bad"); }, 400);
    }
  }
  document.querySelectorAll("#scr-play .mL").forEach(b => b.onclick = () => {
    if (b.classList.contains("ok")) return;
    if (selL) selL.classList.remove("sel");
    selL = b; b.classList.add("sel"); speak(b.dataset.w); checkPair();
  });
  document.querySelectorAll("#scr-play .mR").forEach(b => b.onclick = () => {
    if (b.classList.contains("ok")) return;
    if (selR) selR.classList.remove("sel");
    selR = b; b.classList.add("sel"); checkPair();
  });
  show("play", "🔗 词语配对");
}

/* ================= 游戏2：听音选图 ================= */
function startListen(pool, u) {
  const qs = sample(pool, Math.min(D().opts === 3 ? 6 : 8, pool.length));
  let qi = 0, right = 0;
  function q() {
    if (qi >= qs.length) {
      bumpDaily("g");
      const stars = right === qs.length ? 3 : right >= qs.length - 2 ? 2 : 1;
      return renderResult({
        stars, title: right === qs.length ? "顺风耳就是你！" : "听力挑战完成！",
        detail: `答对 ${right}/${qs.length}`, coins: right * 2 + (right === qs.length ? 5 : 0),
        replay: () => startListen(pool, u)
      });
    }
    const w = qs[qi];
    const opts = shuffle([w].concat(distract(pool, w.w)));
    $("#scr-play").innerHTML = `
      <div id="playHead"><div id="playProg">第 ${qi + 1} / ${qs.length} 题</div></div>
      <div class="card" id="playQ">
        <button id="lcSpeak" style="margin-top:0">🔊</button>
        <div class="qSub">听一听，选出正确的图片</div>
      </div>
      <div class="optGrid">${opts.map((o, i) => `<button class="optBtn" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("")}</div>`;
    speak(w.w);
    $("#lcSpeak").onclick = () => speak(w.w);
    let locked = false;
    document.querySelectorAll("#scr-play .optBtn").forEach(b => {
      b.onclick = () => {
        if (locked) return; locked = true;
        const o = opts[+b.dataset.i];
        if (o.w === w.w) { b.classList.add("right"); sndRight(); right++; recordRight(w.w); }
        else {
          b.classList.add("wrong"); sndWrong(); recordWrong(w.w);
          document.querySelectorAll("#scr-play .optBtn").forEach(x => { if (opts[+x.dataset.i].w === w.w) x.classList.add("right"); });
        }
        setTimeout(() => { qi++; q(); }, 900);
      };
    });
    show("play", "👂 听音选图");
  }
  q();
}

/* ================= 游戏3：拼写工坊 ================= */
function startSpell(pool, u) {
  const df = D();
  /* 新手段位只出短词（≤6个字母），别一上来就让她拼 blackboard */
  const cands = pool.filter(w => /^[a-zA-Z]+$/.test(w.w) && w.w.length >= 3 && w.w.length <= Math.min(9, df.spellMax));
  const fallback = pool.filter(w => /^[a-zA-Z]+$/.test(w.w) && w.w.length <= 9);
  const src = cands.length >= 3 ? cands : fallback;
  if (!src.length) { toast("这里还没有适合拼写的单词，换个游戏试试～"); goBack(); return; }
  const qs = sample(src, Math.min(5, src.length));
  let qi = 0, right = 0;
  function q() {
    if (qi >= qs.length) {
      bumpDaily("g");
      const stars = right === qs.length ? 3 : right >= qs.length - 1 ? 2 : 1;
      return renderResult({
        stars, title: right === qs.length ? "拼写小魔女！" : "拼写练习完成！",
        detail: `拼对 ${right}/${qs.length}`, coins: right * 3 + (right === qs.length ? 5 : 0),
        replay: () => startSpell(pool, u)
      });
    }
    const w = qs[qi], target = w.w.toLowerCase();
    const extra = "abcdefghijklmnopqrstuvwxyz".split("").filter(c => !target.includes(c));
    /* 新手段位少放干扰字母 */
    const keys = shuffle(target.split("").concat(sample(extra, df.spellHint ? 2 : 3)));
    let typed = [];
    $("#scr-play").innerHTML = `
      <div id="playHead"><div id="playProg">第 ${qi + 1} / ${qs.length} 题</div></div>
      <div class="card" id="playQ" style="padding:14px">
        <div class="qEmoji" style="font-size:56px">${w.e}</div>
        <div class="qSub">${w.zh}　<button id="lcSpeak" style="width:44px;height:44px;font-size:20px;margin-top:0;vertical-align:middle">🔊</button></div>
        <div id="spellSlots">${target.split("").map(() => `<div class="slot"></div>`).join("")}</div>
        ${df.spellHint ? `<button class="btn small ghost" id="spellPeek" style="margin-top:8px">💡 偷看一眼（3秒）</button>` : ""}
      </div>
      <div id="spellKeys">
        ${keys.map((k, i) => `<button class="key" data-i="${i}">${k}</button>`).join("")}
        <button class="key" id="spellDel">⌫</button>
      </div>`;
    speak(w.w);
    $("#lcSpeak").onclick = () => speak(w.w);
    const slots = document.querySelectorAll("#scr-play .slot");
    if (df.spellHint) {
      let peeked = false;
      $("#spellPeek").onclick = () => {
        if (peeked) return;
        peeked = true;
        const btn = $("#spellPeek");
        btn.disabled = true;
        slots.forEach((s, i) => { if (!typed[i]) { s.textContent = target[i]; s.style.color = "#c0a8d0"; } });
        let n = 3;
        btn.textContent = "记住了吗？" + n + "…";
        const t = setInterval(() => {
          n--;
          if (n > 0) { btn.textContent = "记住了吗？" + n + "…"; return; }
          clearInterval(t);
          slots.forEach((s, i) => { if (!typed[i]) { s.textContent = ""; s.style.color = ""; } });
          btn.textContent = "💡 已经看过啦";
        }, 1000);
      };
    }
    function refresh() {
      slots.forEach((s, i) => { s.textContent = typed[i] ? typed[i].ch : ""; s.classList.toggle("fill", !!typed[i]); });
    }
    document.querySelectorAll("#scr-play .key:not(#spellDel)").forEach(b => {
      b.onclick = () => {
        if (b.disabled || typed.length >= target.length) return;
        typed.push({ ch: b.textContent, btn: b }); b.disabled = true; tone(700 + typed.length * 40, .08); refresh();
        if (typed.length === target.length) {
          const ans = typed.map(t => t.ch).join("");
          if (ans === target) {
            sndRight(); right++; recordRight(w.w); speak(w.w);
            slots.forEach(s => s.style.background = "#eefae8");
            setTimeout(() => { qi++; q(); }, 900);
          } else {
            sndWrong(); recordWrong(w.w);
            slots.forEach(s => { s.style.background = "#ffecec"; });
            toast("正确拼写：" + w.w, 1800);
            setTimeout(() => { qi++; q(); }, 1600);
          }
        }
      };
    });
    $("#spellDel").onclick = () => {
      const t = typed.pop(); if (t) { t.btn.disabled = false; refresh(); }
    };
    show("play", "🔤 拼写工坊");
  }
  q();
}

/* ================= 游戏4：句子小火车 ================= */
function startSentence(sents, u) {
  const df = D();
  /* 新手段位只排短句（≤5个词），长句子留到升段后 */
  const short = sents.filter(s => s.en.split(" ").length <= df.sentMax);
  const src = short.length >= 3 ? short : sents;
  const qs = sample(src, Math.min(5, src.length));
  let qi = 0, right = 0;
  function q() {
    if (qi >= qs.length) {
      bumpDaily("g");
      const stars = right === qs.length ? 3 : right >= qs.length - 1 ? 2 : 1;
      return renderResult({
        stars, title: right === qs.length ? "句子火车稳稳开！" : "句子练习完成！",
        detail: `拼对 ${right}/${qs.length} 句`, coins: right * 3 + (right === qs.length ? 5 : 0),
        replay: () => startSentence(sents, u)
      });
    }
    const s = qs[qi], words = s.en.split(" ");
    let poolChips = shuffle(words.map((w, i) => ({ w, i }))), ans = [];
    $("#scr-play").innerHTML = `
      <div id="playHead"><div id="playProg">第 ${qi + 1} / ${qs.length} 句</div></div>
      <div class="card" style="text-align:center;padding:14px">
        <div style="font-size:17px;font-weight:700;color:#7a5a9a">${s.zh}</div>
        <div style="font-size:12px;color:#b8a8c8;margin-top:4px">点击单词，把英文句子排出来</div>
      </div>
      <div id="sentAns"></div>
      <div id="sentPool"></div>
      <div style="height:14px"></div>
      <button class="btn" id="sentCheck" disabled>检查 ✔</button>`;
    const ansBox = $("#sentAns"), poolBox = $("#sentPool"), checkBtn = $("#sentCheck");
    function draw() {
      ansBox.innerHTML = ans.map((c, i) => `<button class="chip" data-i="${i}">${esc(c.w)}</button>`).join("");
      poolBox.innerHTML = poolChips.map((c, i) => `<button class="chip" data-i="${i}">${esc(c.w)}</button>`).join("");
      ansBox.querySelectorAll(".chip").forEach(b => b.onclick = () => { poolChips.push(ans.splice(+b.dataset.i, 1)[0]); tone(500, .06); draw(); });
      poolBox.querySelectorAll(".chip").forEach(b => b.onclick = () => { ans.push(poolChips.splice(+b.dataset.i, 1)[0]); tone(700, .06); draw(); });
      checkBtn.disabled = ans.length !== words.length;
    }
    draw();
    checkBtn.onclick = () => {
      const built = ans.map(c => c.w).join(" ");
      checkBtn.disabled = true;
      if (built === s.en) {
        ansBox.classList.add("good"); sndRight(); right++;
        checkBtn.textContent = "✅ 正确！听一遍…";
        /* 等整句读完再翻页，不能话没说完就跳走 */
        speakThen(s.en, 0.9, () => { qi++; q(); }, 600);
      } else {
        ansBox.classList.add("bad"); sndWrong();
        checkBtn.textContent = "正确答案：" + s.en;
        toast("再想想～正确是：" + s.en, 2600);
        setTimeout(() => ansBox.classList.remove("bad"), 500);
        speakThen(s.en, 0.9, () => { qi++; q(); }, 900);
      }
    };
    show("play", "🚂 句子小火车");
  }
  q();
}

/* ================= 单元挑战（Boss战） ================= */
function startBoss(u) {
  const n = D().bossQ;
  const types = shuffle(Array.from({ length: n }, (_, i) => ["enzh", "listen", "zhen"][i % 3]));
  const ws = shuffle(u.words);
  let qi = 0, right = 0;
  function q() {
    if (qi >= n) return finish();
    const w = ws[qi % ws.length], type = types[qi];
    const others = distract(u.words, w.w);
    const opts = shuffle([w].concat(others));
    let head = "", optHtml = "";
    if (type === "enzh") {
      head = `<div class="qText">${esc(w.w)}</div><div class="qSub">选出正确的意思</div>`;
      optHtml = opts.map((o, i) => `<button class="optBtn" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("");
    } else if (type === "listen") {
      head = `<button id="lcSpeak" style="margin-top:0">🔊</button><div class="qSub">听一听，选出对的</div>`;
      optHtml = opts.map((o, i) => `<button class="optBtn" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("");
    } else {
      head = `<div class="qEmoji" style="font-size:56px">${w.e}</div><div class="qSub">${w.zh} —— 选出英文</div>`;
      optHtml = opts.map((o, i) => `<button class="optBtn" data-i="${i}">${esc(o.w)}</button>`).join("");
    }
    $("#scr-play").innerHTML = `
      <div id="playHead"><div id="playProg">⚔️ 挑战 ${qi + 1} / ${n}　已答对 ${right}</div></div>
      <div class="card" id="playQ">${head}</div>
      <div class="optGrid">${optHtml}</div>`;
    if (type === "listen") { speak(w.w); $("#lcSpeak").onclick = () => speak(w.w); }
    else if (type === "enzh") speak(w.w);
    let locked = false;
    document.querySelectorAll("#scr-play .optBtn").forEach(b => {
      b.onclick = () => {
        if (locked) return; locked = true;
        const o = opts[+b.dataset.i];
        if (o.w === w.w) { b.classList.add("right"); sndRight(); right++; recordRight(w.w); if (type === "zhen") speak(w.w); }
        else {
          b.classList.add("wrong"); sndWrong(); recordWrong(w.w);
          document.querySelectorAll("#scr-play .optBtn").forEach(x => { if (opts[+x.dataset.i].w === w.w) x.classList.add("right"); });
        }
        setTimeout(() => { qi++; q(); }, 850);
      };
    });
    show("play", "⭐ 单元挑战");
  }
  function finish() {
    bumpDaily("g");
    const pc = right / n;
    const stars = pc >= 0.9 ? 3 : pc >= 0.7 ? 2 : pc >= 0.5 ? 1 : 0;
    const us = unitS(u.id);
    let bonus = 0;
    if (stars > us.stars) { bonus = (stars - us.stars) * 15; us.stars = stars; save(); }
    if (stars === 3 && !us.s3) { us.s3 = true; save(); addTicket(1, u.num + " 首次满星"); }
    const nextTip = stars >= 1 ? "🎉 下一单元已解锁！" : "答对一半以上才能拿星星，再试一次！";
    renderResult({
      stars, title: stars >= 3 ? "满星通关，超级学霸！" : stars >= 1 ? "挑战成功！" : "差一点点，别放弃！",
      detail: `答对 ${right}/${n}　${nextTip}`,
      coins: right * 2 + bonus,
      replay: () => startBoss(u)
    });
  }
  q();
}

/* ================= 今日复习（SRS 到期词） ================= */
function startDueReview() {
  const due = dueWords();
  if (!due.length) { toast("今天没有到期的词，去学新单词吧！🌟", 2200); goBack(); return; }
  const qs = due.slice(0, 12);                       // 一次最多12个，控制在几分钟内
  const pool = unlockedWords();
  let qi = 0, right = 0, ups = 0;
  function q() {
    if (qi >= qs.length) {
      const rest = dueCount();
      return renderResult({
        stars: right === qs.length ? 3 : right >= qs.length - 2 ? 2 : 1,
        title: right === qs.length ? "复习全对，记得真牢！" : "今日复习完成！",
        detail: `答对 ${right}/${qs.length}　${ups} 个词记得更牢了${rest ? "　还剩 " + rest + " 个到期词" : "　🎉 今天的复习全部清空！"}`,
        coins: right * 3 + (right === qs.length ? 8 : 0),
        replay: () => dueCount() ? startDueReview() : (toast("今天的复习已全部完成！"), goBack())
      });
    }
    const w = qs[qi];
    const lv = (S.srs[w.w] || { lv: 1 }).lv;
    const type = ["enzh", "listen", "zhen"][qi % 3];
    const opts = shuffle([w].concat(distract(pool, w.w)));
    let head, optHtml;
    if (type === "enzh") {
      head = `<div class="qText">${esc(w.w)}</div><div class="qSub">还记得是什么意思吗？</div>`;
      optHtml = opts.map((o, i) => `<button class="optBtn" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("");
    } else if (type === "listen") {
      head = `<button id="lcSpeak" style="margin-top:0">🔊</button><div class="qSub">听一听，是哪个词？</div>`;
      optHtml = opts.map((o, i) => `<button class="optBtn" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("");
    } else {
      head = `<div class="qEmoji" style="font-size:56px">${w.e}</div><div class="qSub">${w.zh} —— 英文是哪个？</div>`;
      optHtml = opts.map((o, i) => `<button class="optBtn" data-i="${i}">${esc(o.w)}</button>`).join("");
    }
    $("#scr-play").innerHTML = `
      <div id="playHead">
        <div id="playProg">📅 今日复习 ${qi + 1} / ${qs.length}</div>
        <div style="font-size:11px;color:#c0a8d0">记忆等级 ${"🔒".repeat(0)}${"●".repeat(lv)}${"○".repeat(SRS_MAX - lv)}　答对就更牢固一级</div>
      </div>
      <div class="card" id="playQ">${head}</div>
      <div class="optGrid">${optHtml}</div>`;
    if (type !== "zhen") speak(w.w);
    if (type === "listen") setTimeout(() => { const s = $("#lcSpeak"); if (s) s.onclick = () => speak(w.w); }, 0);
    let locked = false;
    document.querySelectorAll("#scr-play .optBtn").forEach(b => {
      b.onclick = () => {
        if (locked) return; locked = true;
        const o = opts[+b.dataset.i];
        const before = (S.srs[w.w] || { lv: 1 }).lv;
        if (o.w === w.w) {
          b.classList.add("right"); sndRight(); right++;
          recordRight(w.w); bumpDaily("r");
          const after = (S.srs[w.w] || { lv: 1 }).lv;
          if (after > before) {
            ups++;
            if (after === SRS_MAX) { confettiSmall(10); toast("🏆 " + w.w + " 已进入长期记忆！", 1600); }
          }
          if (type === "zhen") speak(w.w);
        } else {
          b.classList.add("wrong"); sndWrong(); recordWrong(w.w);
          document.querySelectorAll("#scr-play .optBtn").forEach(x => { if (opts[+x.dataset.i].w === w.w) x.classList.add("right"); });
          speak(w.w, 0.8);
        }
        setTimeout(() => { qi++; q(); }, 950);
      };
    });
    show("play", "📅 今日复习");
  }
  q();
}

/* ================= 错词复习 ================= */
function startReview() {
  const wrongWs = Object.keys(S.wrong).map(w => WORD_INDEX[w]).filter(Boolean);
  if (!wrongWs.length) { toast("错词本空空的，真棒！"); goBack(); return; }
  const qs = sample(wrongWs, Math.min(6, wrongWs.length));
  const pool = unlockedWords();
  let qi = 0, right = 0;
  function q() {
    if (qi >= qs.length) {
      return renderResult({
        stars: right === qs.length ? 3 : right >= qs.length - 1 ? 2 : 1,
        title: "错词大扫除完成！",
        detail: `消灭 ${right}/${qs.length} 个错词，剩余 ${wrongCount()} 个`,
        coins: right * 3,
        replay: () => startReview()
      });
    }
    const w = qs[qi];
    const opts = shuffle([w].concat(distract(pool, w.w)));
    $("#scr-play").innerHTML = `
      <div id="playHead"><div id="playProg">📕 错词 ${qi + 1} / ${qs.length}</div></div>
      <div class="card" id="playQ">
        <div class="qText">${esc(w.w)}</div>
        <div class="qSub">还记得它的意思吗？<button id="lcSpeak" style="width:44px;height:44px;font-size:20px;margin-top:0;vertical-align:middle">🔊</button></div>
      </div>
      <div class="optGrid">${opts.map((o, i) => `<button class="optBtn" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("")}</div>`;
    speak(w.w);
    $("#lcSpeak").onclick = () => speak(w.w);
    let locked = false;
    document.querySelectorAll("#scr-play .optBtn").forEach(b => {
      b.onclick = () => {
        if (locked) return; locked = true;
        const o = opts[+b.dataset.i];
        if (o.w === w.w) { b.classList.add("right"); sndRight(); right++; recordRight(w.w); recordRight(w.w); bumpDaily("r"); }
        else {
          b.classList.add("wrong"); sndWrong(); recordWrong(w.w);
          document.querySelectorAll("#scr-play .optBtn").forEach(x => { if (opts[+x.dataset.i].w === w.w) x.classList.add("right"); });
        }
        setTimeout(() => { qi++; q(); }, 900);
      };
    });
    show("play", "📕 错词本");
  }
  q();
}

/* ================= 游戏厅 ================= */
function renderArcade() {
  const pool = unlockedWords(), sents = unlockedSents();
  const learnedN = UNITS.reduce((a, u) => a + unitS(u.id).learned.length, 0);
  const dc = dueCount();
  const games = [
    { icon: "📅", name: "今日复习", sub: dc ? "有 " + dc + " 个词到期了，趁还记得快复习！" : "今天没有到期的词，很棒！", fn: () => startDueReview() },
    { icon: "🎙️", name: "魔法回声（跟读）", sub: echoMode() === "sr" ? "对着手机大声读，自动给你打分" : echoMode() === "record" ? "录下自己的声音，和标准发音比一比" : "跟着标准发音大声读出来", fn: () => startEcho(unlockedSents().concat(ECHO_EXTRA)) },
    { icon: "🏆", name: "魔法大考", sub: learnedN < 8 ? "学会8个词后解锁" : "跨单元综合复习 · 最高 " + (S.bestExam || 0) + " 分", fn: () => startExam() },
    { icon: "🔗", name: "词语配对", sub: "已解锁单词随机出题", fn: () => startMatch(priorityPick(pool, 20)) },
    { icon: "👂", name: "听音选图", sub: "练出小小顺风耳", fn: () => startListen(priorityPick(pool, 20)) },
    { icon: "🔤", name: "拼写工坊", sub: "字母积木拼拼拼", fn: () => startSpell(priorityPick(pool, 20)) },
    { icon: "🚂", name: "句子小火车", sub: "重点句型排排队", fn: () => startSentence(sents) },
    { icon: "📕", name: "错词大扫除", sub: wrongCount() ? "还有 " + wrongCount() + " 个错词" : "错词本是空的", fn: () => startReview() }
  ];
  $("#scr-arcade").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">🎮 想玩什么随便挑！</div>
      <div style="font-size:12px;color:#b8a8c8;margin-top:2px">题目来自已解锁的 ${UNITS.filter(isUnlocked).length} 个单元，昨天学的词和错词会优先出现</div>
    </div>
    ${games.map((g, i) => `
      <div class="card actRow" data-i="${i}">
        <span class="aIcon">${g.icon}</span>
        <span class="aName">${g.name}<span class="aSub">${g.sub}</span></span>
        <span class="aGo">▶</span>
      </div>`).join("")}`;
  document.querySelectorAll("#scr-arcade .actRow").forEach(c => {
    c.onclick = () => go(() => games[+c.dataset.i].fn());
  });
  show("arcade", "🎮 游戏厅");
}

/* ================= 幸运大转盘（实物奖励） ================= */
const WHEEL_DEFAULT = ["📺 看电视30分钟", "🍦 吃一次小零食", "⚽ 户外玩1小时", "🌠 满足一个小愿望", "🌙 晚睡15分钟", "🎲 亲子游戏半小时", "🪙 50金币", "🔄 再转一次"];
const WHEEL_COLORS = ["#ffd9e8", "#e3dcff", "#d5f0ff", "#ffefd0", "#dcf5dc", "#ffe0d5", "#e8f8ff", "#f5e0ff", "#fff0f5", "#e0ffe8", "#fff5d5", "#e5e8ff"];
function getWheel() { return (S.wheel && S.wheel.length >= 2) ? S.wheel : WHEEL_DEFAULT; }
const WHEEL_STALE_DAYS = 14;
function wheelAgeDays() { return Math.floor((new Date(todayStr()) - new Date(S.wheelTouched)) / 864e5); }
function wheelStale() { return wheelAgeDays() >= WHEEL_STALE_DAYS; }
function touchWheel() { S.wheelTouched = todayStr(); save(); }
let spinning = false;

function renderWheel() {
  const prizes = getWheel(), n = prizes.length, seg = 360 / n;
  const stops = prizes.map((p, i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(",");
  $("#scr-wheel").innerHTML = `
    <div class="card" style="text-align:center;padding:16px 10px">
      <div style="font-size:16px;font-weight:800;color:#9b59b6">🎡 幸运大转盘</div>
      <div style="font-size:12px;color:#b8a8c8;margin-top:2px">转到什么奖什么，爸爸妈妈说话算话！</div>
      <div id="wheelWrap">
        <div id="wheelPtr">🔻</div>
        <div id="wheel" style="background:conic-gradient(${stops})">
          ${prizes.map((p, i) => `<div class="wLabel" style="transform:rotate(${i * seg + seg / 2}deg)"><span>${esc(p)}</span></div>`).join("")}
        </div>
        <div id="wheelHub">🎀</div>
      </div>
      <div id="ticketChip">🎟️ 转盘券：${S.tickets} 张</div>
      <div id="wheelWon"></div>
      <button class="btn" id="spinBtn" ${S.tickets < 1 ? "disabled" : ""}>${S.tickets < 1 ? "先去完成任务赢券吧" : "开始转！（用1张券）"}</button>
    </div>
    <div class="card" style="font-size:12px;color:#b8a8c8;line-height:1.8">
      <b style="color:#9b59b6">怎么获得转盘券？</b><br>
      ① 每日三任务全部完成 +1 张<br>
      ② 当天特别勤奋（金币赚满60）再 +1 张<br>
      ③ 单元挑战第一次拿满3星 +1 张<br>
      ④ 连续学习每满3天 +1 张
    </div>
    ${wheelStale() ? `<div class="card" style="background:#fff3d6;text-align:center;font-size:13px;color:#e8842d;font-weight:700">🎁 转盘奖品已经 ${wheelAgeDays()} 天没换新啦，快让爸爸妈妈上新奖品！</div>` : ""}`;
  $("#spinBtn").onclick = doSpin;
  show("wheel", "🎡 幸运大转盘");
}

let wheelTurns = 0;
function doSpin() {
  if (spinning || S.tickets < 1) return;
  spinning = true;
  S.tickets--; save();
  $("#ticketChip").textContent = "🎟️ 转盘券：" + S.tickets + " 张";
  $("#spinBtn").disabled = true;
  $("#wheelWon").innerHTML = "";
  const prizes = getWheel(), n = prizes.length, seg = 360 / n;
  const pick = Math.floor(Math.random() * n);
  const jitter = (Math.random() * 0.6 - 0.3) * seg;
  wheelTurns += 5;
  const target = wheelTurns * 360 - (pick * seg + seg / 2) - jitter;
  $("#wheel").style.transform = `rotate(${target}deg)`;
  [0, .5, 1, 1.6, 2.3, 3.1].forEach(t => tone(500 + t * 60, .06, "sine", t, .05));
  setTimeout(() => {
    spinning = false;
    const prize = prizes[pick];
    confetti(); sndWin();
    let note = "";
    const coinM = prize.match(/(\d+)\s*金币/);
    if (coinM) { addCoins(+coinM[1]); note = "金币已到账！"; }
    else if (/再转一次/.test(prize)) { S.tickets++; save(); note = "转盘券已返还，再来！"; }
    else {
      S.vouchers.unshift({ n: prize, d: todayStr(), used: false }); save();
      note = "已存入「我的奖励券」，拿给爸爸妈妈兑换～";
    }
    $("#wheelWon").innerHTML = `<div class="wonCard"><div class="we">🎉</div><div class="wn">${esc(prize)}</div><div style="font-size:12px;color:#b08ac0;margin-top:4px">${note}</div></div>`;
    $("#ticketChip").textContent = "🎟️ 转盘券：" + S.tickets + " 张";
    const btn = $("#spinBtn");
    if (btn) { btn.disabled = S.tickets < 1; btn.textContent = S.tickets < 1 ? "先去完成任务赢券吧" : "开始转！（用1张券）"; }
  }, 4300);
}

/* ================= 我的奖励券 ================= */
function renderVoucher() {
  const vs = S.vouchers;
  $("#scr-voucher").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">🎟️ 我的奖励券</div>
      <div style="font-size:12px;color:#b8a8c8;margin-top:2px">拿给爸爸妈妈看，兑换后点「已兑换」</div>
    </div>
    ${vs.length ? `<div class="card">${vs.map((v, i) => `
      <div class="vRow">
        <span style="font-size:22px">${v.used ? "✅" : "🎁"}</span>
        <span class="vName" style="${v.used ? "color:#c0b0d0;text-decoration:line-through" : ""}">${esc(v.n)}<span class="vDate">${v.d}</span></span>
        <button class="vBtn ${v.used ? "used" : "todo"}" data-i="${i}" ${v.used ? "disabled" : ""}>${v.used ? "已兑换" : "去兑换"}</button>
      </div>`).join("")}</div>`
      : `<div class="card" style="text-align:center;color:#b8a8c8;font-size:14px;padding:30px">还没有奖励券<br>去转幸运大转盘吧！🎡</div>`}`;
  document.querySelectorAll("#scr-voucher .vBtn.todo").forEach(b => {
    b.onclick = () => {
      if (b.dataset.confirm) {
        S.vouchers[+b.dataset.i].used = true; save();
        sndCoin(); toast("🎉 兑换成功，说到做到！");
        renderVoucher();
      } else {
        b.dataset.confirm = "1"; b.textContent = "再点确认"; b.classList.add("warn");
        setTimeout(() => { if (b.isConnected && !S.vouchers[+b.dataset.i].used) { delete b.dataset.confirm; b.textContent = "去兑换"; b.classList.remove("warn"); } }, 3000);
      }
    };
  });
  show("voucher", "🎟️ 奖励券");
}

/* ================= 家长设置 ================= */
let parentOK = false;
function renderParent() {
  if (!parentOK) {
    const a = 12 + Math.floor(Math.random() * 78), b = 12 + Math.floor(Math.random() * 78);
    $("#scr-parent").innerHTML = `
      <div class="card" style="text-align:center;padding:24px 16px">
        <div style="font-size:34px">🔐</div>
        <div style="font-size:15px;font-weight:700;color:#9b59b6;margin:8px 0">家长验证</div>
        <div style="font-size:14px;color:#7a5a9a;margin-bottom:12px">请计算：<b style="font-size:18px">${a} × ${b} = ?</b></div>
        <input class="pInput" id="pGate" type="number" inputmode="numeric" placeholder="输入答案" style="text-align:center;max-width:180px">
        <div style="height:12px"></div>
        <button class="btn small" id="pGateBtn">确认</button>
      </div>`;
    $("#pGateBtn").onclick = () => {
      if (+$("#pGate").value === a * b) { parentOK = true; renderParent(); }
      else { sndWrong(); toast("答案不对哦～"); $("#pGate").value = ""; }
    };
    show("parent", "🔐 家长设置");
    return;
  }
  const prizes = getWheel();
  $("#scr-parent").innerHTML = `
    <div class="card" style="${S.testMode ? "background:#fff3d6" : ""}">
      <div class="actRow">
        <span class="aIcon">🧪</span>
        <span class="aName">测试模式<span class="aSub">${S.testMode ? "开启中：全部单元/皮肤已解锁，给孩子用前请关掉" : "打开后可直接试玩全部内容，不受金币和关卡限制"}</span></span>
        <button class="themeBtn ${S.testMode ? "cur" : "lock"}" id="pTest">${S.testMode ? "已开启" : "已关闭"}</button>
      </div>
      ${S.testMode ? `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn small ghost" id="tDaily">🔄 重置今日任务</button>
        <button class="btn small ghost" id="tCoin">🪙 +1000 金币</button>
        <button class="btn small ghost" id="tTicket">🎟️ +5 转盘券</button>
        <button class="btn small ghost" id="tSkin">🎨 解锁全部皮肤</button>
        <button class="btn small ghost" id="tWords">📖 标记全部单词已学</button>
        <button class="btn small ghost" id="tWrong">📕 造 5 个错词</button>
        <button class="btn small ghost" id="tDue">📅 让 10 个词今天到期</button>
        <button class="btn small ghost" id="tCheck">📆 补 6 天打卡（测周期奖励）</button>
        <button class="btn small ghost" id="tReset" style="color:#e05a5a">🗑️ 清空全部进度</button>
      </div>
      <div style="font-size:11px;color:#c0a8d0;margin-top:8px;line-height:1.7">
        「重置今日任务」＝ 今天的三个任务、金币计数、已领的奖励券全部归零，可以反复测试每日流程（连续天数不变）<br>
        试玩完记得：先「清空全部进度」再关掉测试模式，孩子拿到的就是全新的档
      </div>` : ""}
    </div>
    <div class="card">
      <div style="font-size:15px;font-weight:700;color:#9b59b6;margin-bottom:4px">🎚️ 难度</div>
      <div style="font-size:12px;color:#b8a8c8;margin-bottom:8px">
        默认「自动升段」：孩子刚开始题目少、3选1、不倒计时、拼写有提示；掌握 25 个词升到魔法师，60 个词升到大魔法师，难度逐步加上去。<br>
        当前：<b style="color:#9b59b6">${D().rank}</b>（已掌握 ${masteredCount()} 词）${S.diff === "auto" ? "" : " · 已被你锁定"}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${[["auto", "自动升段（推荐）"], ["1", "🌱 一直简单"], ["2", "✨ 中等"], ["3", "🦄 挑战"]].map(([v, n]) =>
          `<button class="themeBtn ${String(S.diff) === v ? "cur" : "lock"}" data-diff="${v}">${n}</button>`).join("")}
      </div>
    </div>
    <div class="card">
      <div style="font-size:15px;font-weight:700;color:#9b59b6;margin-bottom:4px">🎡 转盘奖品（${prizes.length}项）</div>
      <div style="font-size:12px;margin-bottom:4px;font-weight:700;color:${wheelStale() ? "#e8842d" : "#b8a8c8"}">${wheelAgeDays() === 0 ? "✅ 今天刚更换过奖品" : "距上次更换奖品已 " + wheelAgeDays() + " 天" + (wheelStale() ? "，建议换1~2个孩子当下最想要的，保持新鲜感！" : "（建议每14天上新）")}</div>
      <div style="font-size:12px;color:#b8a8c8;margin-bottom:8px">奖品里写「XX金币」会自动发金币，写「再转一次」会返还转盘券，其余都会变成孩子的实物奖励券。建议2~12项，保留「50金币」和「再转一次」两格可以让实物大奖更有期待感。</div>
      ${prizes.map((p, i) => `<div class="pRow"><span class="pName">${esc(p)}</span><button class="pDel" data-i="${i}">✕</button></div>`).join("")}
      <div class="pRow" style="border:none">
        <input class="pInput" id="pNew" placeholder="新奖品，如：🎨 买一支新画笔">
        <button class="btn small" id="pAdd">添加</button>
      </div>
    </div>
    <div class="card" style="display:flex;gap:10px">
      <button class="btn ghost" id="pReset" style="flex:1">恢复默认奖品</button>
      <button class="btn ghost" id="pTicket" style="flex:1">补发1张转盘券</button>
    </div>
    <div class="card actRow" id="pReport">
      <span class="aIcon">📊</span>
      <span class="aName">学习报告<span class="aSub">掌握进度 · 7天趋势 · 高频错词</span></span>
      <span class="aGo">▶</span>
    </div>
    <div class="card actRow" id="pBackup">
      <span class="aIcon">💾</span>
      <span class="aName">备份与恢复进度<span class="aSub">换手机、清缓存前务必备份一次</span></span>
      <span class="aGo">▶</span>
    </div>
    <div class="card actRow" id="pAudio">
      <span class="aIcon">🔊</span>
      <span class="aName">发音自检<span class="aSub">听不到单词发音时点这里</span></span>
      <span class="aGo">▶</span>
    </div>
    <div style="font-size:11px;color:#c0b0d0;text-align:center">改完直接生效，孩子下次打开转盘就是新奖品</div>`;
  document.querySelectorAll("#scr-parent [data-diff]").forEach(b => {
    b.onclick = () => {
      S.diff = b.dataset.diff === "auto" ? "auto" : +b.dataset.diff;
      save(); sndCoin();
      toast(b.dataset.diff === "auto" ? "已设为自动升段" : "难度已锁定为 " + DIFFS[+b.dataset.diff].rank, 2000);
      renderParent();
    };
  });
  $("#pReport").onclick = () => go(renderReport);
  $("#pBackup").onclick = () => go(renderBackup);
  $("#pAudio").onclick = () => go(renderAudioCheck);
  $("#pTest").onclick = () => {
    S.testMode = !S.testMode; save();
    toast(S.testMode ? "🧪 测试模式已开启，全部内容解锁" : "✅ 测试模式已关闭，恢复正常闯关", 2200);
    sndCoin(); renderParent();
  };
  if (S.testMode) {
    $("#tDaily").onclick = () => {
      S.daily = defState().daily; save();
      sndCoin(); toast("🔄 今日任务已重置，可以重新做一遍", 2200);
      renderParent();
    };
    $("#tCoin").onclick = () => { addCoins(1000); toast("已加 1000 金币"); renderParent(); };
    $("#tTicket").onclick = () => { S.tickets += 5; save(); toast("已加 5 张转盘券"); renderParent(); };
    $("#tSkin").onclick = () => { S.themesOwned = THEMES.map(t => t.id); save(); toast("全部皮肤已解锁"); };
    $("#tWrong").onclick = () => {
      sample(unlockedWords(), 5).forEach(w => { S.wrong[w.w] = 2; });
      save(); toast("已造 5 个错词，可以去测错词本了", 2200);
    };
    $("#tCheck").onclick = () => {
      for (let i = 1; i <= 6; i++) S.checkins[dateAdd(-i)] = 1;   // 补前6天
      save();
      toast("已补 6 天打卡，再完成今天的任务就满一个周期了", 3000);
      renderParent();
    };
    $("#tDue").onclick = () => {
      const learned = Object.keys(S.learnedAt);
      if (!learned.length) { toast("先「标记全部单词已学」再用这个"); return; }
      sample(learned, Math.min(10, learned.length)).forEach(w => {
        S.srs[w] = { lv: (S.srs[w] && S.srs[w].lv) || 1, due: todayStr() };
      });
      save(); toast("已让 " + Math.min(10, learned.length) + " 个词今天到期，回首页看「今日复习」", 2600);
    };
    $("#tWords").onclick = () => {
      UNITS.forEach(u => {
        const us = unitS(u.id);
        u.words.forEach(w => {
          if (!us.learned.includes(w.w)) us.learned.push(w.w);
          if (!S.learnedAt[w.w]) S.learnedAt[w.w] = todayStr();
          srsInit(w.w);
        });
      });
      save(); toast("全部单词已标记为学过（大考/游戏厅可直接玩）", 2400);
    };
    let armed = false;
    $("#tReset").onclick = () => {
      if (!armed) { armed = true; $("#tReset").textContent = "⚠️ 再点一次确认清空"; return; }
      const keepTest = true;
      S = defState(); S.testMode = keepTest; save();
      applyTheme(); updateCoinBox();
      toast("已清空全部进度", 2000); sndWin();
      renderParent();
    };
  }
  document.querySelectorAll("#scr-parent .pDel").forEach(b => {
    b.onclick = () => {
      const list = getWheel().slice();
      if (list.length <= 2) { toast("至少保留2个奖品"); return; }
      list.splice(+b.dataset.i, 1); S.wheel = list; touchWheel(); renderParent();
    };
  });
  $("#pAdd").onclick = () => {
    const v = $("#pNew").value.trim();
    if (!v) return;
    const list = getWheel().slice();
    if (list.length >= 12) { toast("最多12个奖品"); return; }
    list.push(v); S.wheel = list; touchWheel(); renderParent();
  };
  $("#pReset").onclick = () => { S.wheel = null; touchWheel(); renderParent(); toast("已恢复默认奖品"); };
  $("#pTicket").onclick = () => { S.tickets++; save(); toast("已补发1张转盘券 🎟️"); };
  show("parent", "🔐 家长设置");
}

/* ================= 自然拼读（Let's spell） ================= */
function phS(id) { if (!S.phonics[id]) S.phonics[id] = { learned: false, stars: 0 }; return S.phonics[id]; }
function blankWord(word, reSrc) {
  return word.toLowerCase().replace(new RegExp(reSrc), (s, g) => typeof g === "string" ? "▢" + g + "▢" : "▢".repeat(s.length));
}
function renderPhonicsList() {
  $("#scr-phonics").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">🔮 拼读魔法学院</div>
      <div style="font-size:12px;color:#b8a8c8;margin-top:2px">学会拼读规则，看到生词也能自己念出来！</div>
    </div>
    ${["四上", "四下"].map(bk => `
      <div class="bookLabel">—— ✨ ${bk}册 · Let's spell ——</div>
      ${PHONICS.filter(p => p.book === bk).map(p => {
        const ps = phS(p.id);
        return `<div class="card actRow" data-pid="${p.id}">
          <span class="aIcon">${p.icon}</span>
          <span class="aName">${esc(p.label)} <span style="color:#b98ff0">${esc(p.ipa)}</span><span class="aSub">${ps.learned ? "已学过" : "还没学"} · ${p.words.length}个例词</span></span>
          <span class="unitStars" style="color:#ffb830">${"★".repeat(ps.stars) + "☆".repeat(3 - ps.stars)}</span>
        </div>`;
      }).join("")}`).join("")}`;
  document.querySelectorAll("#scr-phonics .actRow").forEach(c => {
    c.onclick = () => go(() => renderPhonicRule(PHONICS.find(p => p.id === c.dataset.pid)));
  });
  show("phonics", "🔮 拼读魔法学院");
}

function renderPhonicRule(p) {
  $("#scr-phonic").innerHTML = `
    <div class="card" style="text-align:center">
      <div style="font-size:44px">${p.icon}</div>
      <div style="font-size:30px;font-weight:800;color:#6a4a8a;letter-spacing:2px">${esc(p.label)}</div>
      <div style="font-size:20px;color:#b98ff0;font-weight:700">${esc(p.ipa)}</div>
      <div style="font-size:13px;color:#7a5a9a;margin-top:8px;line-height:1.6;text-align:left;background:#fff6fb;border-radius:14px;padding:10px">💡 ${p.tip}</div>
    </div>
    <div class="sectionTitle">🔊 点一点，听听这些词的共同点</div>
    <div class="optGrid" id="phWords">
      ${p.words.map((w, i) => `<button class="optBtn" data-i="${i}">
        <span class="oEmoji">${w.e}</span>
        <span style="font-size:16px">${esc(blankWord(w.w, p.re)).replace(/▢/g, '<b style="color:#e56ba0">▢</b>')}</span>
        <div style="font-size:13px;color:#b08ac0;font-weight:400">${esc(w.w)} ${w.zh}</div>
      </button>`).join("")}
    </div>
    <div style="height:14px"></div>
    <button class="btn" id="phGo">🎯 挑战拼读关卡</button>`;
  document.querySelectorAll("#phWords .optBtn").forEach(b => {
    b.onclick = () => { speak(p.words[+b.dataset.i].w, 0.75); tone(800, .05); };
  });
  $("#phGo").onclick = () => { phS(p.id).learned = true; save(); go(() => startPhonicGame(p)); };
  show("phonic", esc(p.label) + " 规则");
}

/* 拼读关卡：补全字母组合 + 听音归类 两种题型 */
function startPhonicGame(p) {
  const qs = shuffle(p.words).slice(0, 6);
  const others = PHONICS.filter(x => x.id !== p.id);
  let qi = 0, right = 0;
  function q() {
    if (qi >= qs.length) {
      bumpDaily("g");
      const stars = right === qs.length ? 3 : right >= qs.length - 1 ? 2 : 1;
      const ps = phS(p.id);
      if (stars > ps.stars) { ps.stars = stars; save(); }
      return renderResult({
        stars, title: right === qs.length ? "拼读魔法师！" : "拼读关卡完成！",
        detail: `答对 ${right}/${qs.length}　规则：${p.label} ${p.ipa}`,
        coins: right * 3 + (right === qs.length ? 6 : 0),
        replay: () => startPhonicGame(p)
      });
    }
    const w = qs[qi];
    const isFill = qi % 2 === 0;
    let opts, head;
    if (isFill) {
      /* 补全：这个词缺的字母组合是哪个？ */
      opts = shuffle([p].concat(sample(others, D().opts - 1)));
      head = `<div class="qEmoji" style="font-size:56px">${w.e}</div>
        <div class="qText" style="letter-spacing:3px">${esc(blankWord(w.w, p.re)).replace(/▢/g, '<b style="color:#e56ba0">▢</b>')}</div>
        <div class="qSub">${w.zh} —— 空格里填哪个字母组合？</div>`;
    } else {
      /* 听音归类：这个词属于哪个发音家族？ */
      opts = shuffle([p].concat(sample(others, D().opts - 1)));
      head = `<button id="lcSpeak" style="margin-top:0">🔊</button>
        <div class="qSub">听一听「${esc(w.w)}」，它属于哪个发音家族？</div>`;
    }
    $("#scr-play").innerHTML = `
      <div id="playHead"><div id="playProg">🔮 拼读挑战 ${qi + 1} / ${qs.length}</div></div>
      <div class="card" id="playQ">${head}</div>
      <div class="optGrid">${opts.map((o, i) => `<button class="optBtn" data-i="${i}">
        <span style="font-size:20px;font-weight:800">${esc(o.label)}</span>
        <div style="font-size:13px;color:#b08ac0;font-weight:400">${esc(o.ipa)}</div>
      </button>`).join("")}</div>`;
    speak(w.w, 0.75);
    if (!isFill) $("#lcSpeak").onclick = () => speak(w.w, 0.75);
    let locked = false;
    document.querySelectorAll("#scr-play .optBtn").forEach(b => {
      b.onclick = () => {
        if (locked) return; locked = true;
        const o = opts[+b.dataset.i];
        if (o.id === p.id) { b.classList.add("right"); sndRight(); right++; logAnswer(true); speak(w.w, 0.75); }
        else {
          b.classList.add("wrong"); sndWrong(); logAnswer(false);
          document.querySelectorAll("#scr-play .optBtn").forEach(x => { if (opts[+x.dataset.i].id === p.id) x.classList.add("right"); });
          toast(w.w + " → " + p.label + " " + p.ipa, 1800);
        }
        setTimeout(() => { qi++; q(); }, 1000);
      };
    });
    show("play", "🔮 拼读挑战");
  }
  q();
}

/* ================= 魔法回声（跟读打分） ================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function normTxt(s) { return s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim(); }
function scoreSay(target, heard) {
  const a = normTxt(target).split(" "), b = normTxt(heard).split(" ");
  if (!b.length || !b[0]) return 0;
  let hit = 0;
  const pool = b.slice();
  a.forEach(w => { const i = pool.indexOf(w); if (i >= 0) { hit++; pool.splice(i, 1); } });
  return hit / a.length;
}
/* 三种模式：
 *  sr     —— 浏览器支持语音识别（安卓 Chrome 等）：自动打分
 *  record —— 不支持识别但能录音（iPhone 就是这种）：录下来回放，跟标准音对比后自评
 *  shadow —— 连麦克风都用不了：只做影子跟读，读完自己确认
 * iPhone 的 Safari / Chrome 都不支持 Web 语音识别，所以必须有 record 模式兜底。
 */
const CAN_RECORD = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
function echoMode() { return SR ? "sr" : CAN_RECORD ? "record" : "shadow"; }

let echoCleanup = null;   // 离开页面时要关掉麦克风
function startEcho(items) {
  const mode = echoMode();
  const qs = sample(items, Math.min(6, items.length));
  let qi = 0, total = 0, doneN = 0;
  let listening = false, rec = null;          // sr 模式
  let mediaRec = null, myURL = null, stream = null;   // record 模式

  function cleanup() {
    try { if (rec) rec.stop(); } catch (e) {}
    try { if (mediaRec && mediaRec.state === "recording") mediaRec.stop(); } catch (e) {}
    try { if (stream) stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    if (myURL) { URL.revokeObjectURL(myURL); myURL = null; }
    mediaRec = null; stream = null; listening = false;
  }
  echoCleanup = cleanup;

  function finish() {
    cleanup();
    bumpDaily("g");
    if (mode === "sr") {
      const avg = total / qs.length;
      const stars = avg >= 0.9 ? 3 : avg >= 0.7 ? 2 : avg >= 0.4 ? 1 : 0;
      return renderResult({
        stars, title: stars >= 3 ? "发音超标准！" : stars >= 1 ? "跟读完成，很棒！" : "再多练几遍，加油！",
        detail: `平均得分 ${Math.round(avg * 100)} 分`,
        coins: Math.round(avg * qs.length * 4),
        replay: () => startEcho(items)
      });
    }
    /* 录音 / 影子模式：按完成的句数给奖励，自评只做反馈不换钱，避免乱点刷币 */
    const avg = doneN ? total / doneN : 0;
    return renderResult({
      stars: doneN === qs.length ? 3 : doneN >= qs.length - 2 ? 2 : 1,
      title: "跟读完成，开口就是胜利！",
      detail: `读了 ${doneN}/${qs.length} 句${doneN ? "　自评平均 " + "⭐".repeat(Math.max(1, Math.round(avg))) : ""}`,
      coins: doneN * 4,
      replay: () => startEcho(items)
    });
  }

  function q() {
    cleanup();
    if (qi >= qs.length) return finish();
    const it = qs[qi];
    const tipByMode = {
      sr: "先听标准发音，再点下面的按钮大声读出来，我来给你打分！",
      record: "先听标准发音，再录下自己的声音，回放对比一下像不像～",
      shadow: "先听标准发音，然后大声跟着读一遍～"
    };
    $("#scr-echo").innerHTML = `
      <div id="playHead"><div id="playProg">🎙️ 第 ${qi + 1} / ${qs.length} 句</div></div>
      <div class="card" style="text-align:center;padding:22px 14px">
        <div style="font-size:22px;font-weight:800;color:#6a4a8a;line-height:1.4">${esc(it.en)}</div>
        <div style="font-size:14px;color:#b08ac0;margin-top:4px">${it.zh}</div>
        <button id="echoPlay" style="margin-top:12px;font-size:26px;border:none;background:#fff0f7;border-radius:50%;width:56px;height:56px;box-shadow:0 3px 10px rgba(230,120,180,.25)">🔊</button>
        <div id="echoState" style="font-size:13px;color:#c0a8d0;margin-top:10px">${tipByMode[mode]}</div>
        <div id="echoScore" style="min-height:40px;margin-top:6px"></div>
      </div>
      <div id="echoBtns"></div>
      <div style="height:10px"></div>
      <button class="btn ghost" id="echoSkip">跳过这句 →</button>`;
    speak(it.en, 0.9);
    $("#echoPlay").onclick = () => speak(it.en, 0.9);
    $("#echoSkip").onclick = () => { qi++; q(); };

    if (mode === "sr") renderSR(it);
    else if (mode === "record") renderRecord(it);
    else renderShadow(it);

    show("echo", "🎙️ 魔法回声");
  }

  /* ---- 模式1：自动识别打分 ---- */
  function renderSR(it) {
    $("#echoBtns").innerHTML = `<button class="btn" id="echoMic">🎙️ 点我开始读</button>`;
    $("#echoMic").onclick = () => {
      if (listening) return;
      listening = true;
      $("#echoMic").textContent = "🔴 正在听……大声读！";
      $("#echoState").textContent = "我在听哦～";
      try {
        rec = new SR();
        rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 3;
        rec.onresult = ev => {
          let best = 0, heard = "";
          for (let i = 0; i < ev.results[0].length; i++) {
            const sc = scoreSay(it.en, ev.results[0][i].transcript);
            if (sc > best) { best = sc; heard = ev.results[0][i].transcript; }
          }
          total += best; doneN++; listening = false;
          const pc = Math.round(best * 100);
          const stars = best >= 0.9 ? "⭐⭐⭐" : best >= 0.7 ? "⭐⭐" : best >= 0.4 ? "⭐" : "💪";
          logAnswer(best >= 0.7);
          if (best >= 0.7) { sndRight(); if (best >= 0.9) confetti(); } else sndWrong();
          $("#echoScore").innerHTML = `<div style="font-size:26px">${stars}</div>
            <div style="font-size:15px;font-weight:700;color:${best >= 0.7 ? "#7cc576" : "#e8842d"}">${pc} 分${best >= 0.9 ? "　发音太棒了！" : best >= 0.7 ? "　很不错！" : "　再试一次会更好"}</div>
            <div style="font-size:12px;color:#c0a8d0">我听到的是：${esc(heard || "……")}</div>`;
          $("#echoMic").textContent = "下一句 →";
          $("#echoMic").onclick = () => { qi++; q(); };
        };
        rec.onerror = ev => {
          listening = false;
          $("#echoMic").textContent = "🎙️ 再试一次";
          $("#echoState").textContent = ev.error === "not-allowed"
            ? "需要允许使用麦克风才能玩哦，请在弹窗里点「允许」"
            : "没听清楚，靠近一点再读一遍～";
        };
        rec.onend = () => {
          if (listening) { listening = false; $("#echoMic").textContent = "🎙️ 再读一次"; $("#echoState").textContent = "没听到声音，大声一点～"; }
        };
        rec.start();
      } catch (e) {
        listening = false;
        $("#echoState").textContent = "麦克风打不开，试试下面的「跳过」换一句";
      }
    };
  }

  /* ---- 模式2：录音 + 回放对比 + 自评（iPhone 走这条） ---- */
  function renderRecord(it) {
    $("#echoBtns").innerHTML = `<button class="btn" id="echoMic">🔴 按一下开始录音</button>`;
    const mic = $("#echoMic");
    mic.onclick = async () => {
      if (mediaRec && mediaRec.state === "recording") { mediaRec.stop(); return; }   // 再点一次＝停止
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        $("#echoState").innerHTML = '需要<b>麦克风权限</b>才能录音。请在弹窗里点「允许」；如果没弹窗，去手机设置里给浏览器开麦克风权限。';
        sndWrong();
        return;
      }
      const chunks = [];
      try {
        mediaRec = new MediaRecorder(stream);
      } catch (e) {
        $("#echoState").textContent = "这个浏览器录不了音，直接大声跟读也可以～";
        renderShadow(it);
        return;
      }
      mediaRec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      mediaRec.onstop = () => {
        try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
        stream = null;
        const blob = new Blob(chunks, { type: mediaRec.mimeType || "audio/webm" });
        if (myURL) URL.revokeObjectURL(myURL);
        myURL = URL.createObjectURL(blob);
        sndCoin();
        $("#echoState").textContent = "录好啦！听听自己读的，和标准发音对比一下～";
        $("#echoScore").innerHTML = `
          <div style="display:flex;gap:8px;justify-content:center;margin-top:4px">
            <button class="btn small ghost" id="playMine">▶ 我读的</button>
            <button class="btn small ghost" id="playStd">🔊 标准发音</button>
          </div>
          <div style="font-size:12px;color:#c0a8d0;margin-top:10px">觉得自己读得像吗？</div>
          <div style="display:flex;gap:6px;justify-content:center;margin-top:6px">
            <button class="btn small" data-self="3">⭐⭐⭐ 很像</button>
            <button class="btn small ghost" data-self="2">⭐⭐ 还行</button>
            <button class="btn small ghost" data-self="1">⭐ 再练练</button>
          </div>`;
        const myAudio = new Audio(myURL);
        $("#playMine").onclick = () => { myAudio.currentTime = 0; myAudio.play().catch(() => toast("回放失败，再录一次试试")); };
        $("#playStd").onclick = () => speak(it.en, 0.9);
        myAudio.play().catch(() => {});   // 录完自动回放一次
        document.querySelectorAll("#echoScore [data-self]").forEach(b => {
          b.onclick = () => {
            total += +b.dataset.self; doneN++;
            logAnswer(+b.dataset.self >= 2);
            if (+b.dataset.self === 3) { confettiSmall(8); sndWin(); } else sndCoin();
            qi++; q();
          };
        });
        mic.textContent = "🔴 重录一次";
        mic.disabled = false;
      };
      mediaRec.start();
      mic.textContent = "⏹ 正在录音……再点一下结束";
      $("#echoState").textContent = "🔴 录音中，大声读出来！";
      /* 保险：最长录 10 秒自动停 */
      setTimeout(() => { if (mediaRec && mediaRec.state === "recording") mediaRec.stop(); }, 10000);
    };
  }

  /* ---- 模式3：影子跟读（连录音都不行时） ---- */
  function renderShadow(it) {
    $("#echoBtns").innerHTML = `
      <button class="btn" id="echoAgain">🔊 再听一遍</button>
      <div style="height:10px"></div>
      <button class="btn ghost" id="echoDone">✅ 我大声读完啦，下一句</button>`;
    $("#echoAgain").onclick = () => speak(it.en, 0.9);
    $("#echoDone").onclick = () => { total += 2; doneN++; sndCoin(); qi++; q(); };
  }

  q();
}

/* ================= 魔法大考（跨单元综合复习） ================= */
function startExam() {
  let learned = [];
  UNITS.forEach(u => { const us = unitS(u.id); u.words.forEach(w => { if (us.learned.includes(w.w)) learned.push(w); }); });
  if (S.testMode && learned.length < 8) learned = unlockedWords();   // 测试模式：直接用全部单词
  if (learned.length < 8) { toast("先去学更多单词，学会8个词就能参加大考啦！", 2400); goBack(); return; }
  const n = Math.min(D().examQ, learned.length);
  const qs = priorityPick(learned, n);
  const types = shuffle(qs.map((_, i) => ["enzh", "listen", "zhen"][i % 3]));
  let qi = 0, right = 0;
  function q() {
    if (qi >= qs.length) return finish();
    const w = qs[qi], type = types[qi];
    const opts = shuffle([w].concat(distract(learned, w.w)));
    let head, optHtml;
    if (type === "enzh") {
      head = `<div class="qText">${esc(w.w)}</div><div class="qSub">选出正确的意思</div>`;
      optHtml = opts.map((o, i) => `<button class="optBtn" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("");
    } else if (type === "listen") {
      head = `<button id="lcSpeak" style="margin-top:0">🔊</button><div class="qSub">听一听，选出对的</div>`;
      optHtml = opts.map((o, i) => `<button class="optBtn" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("");
    } else {
      head = `<div class="qEmoji" style="font-size:56px">${w.e}</div><div class="qSub">${w.zh} —— 选出英文</div>`;
      optHtml = opts.map((o, i) => `<button class="optBtn" data-i="${i}">${esc(o.w)}</button>`).join("");
    }
    $("#scr-play").innerHTML = `
      <div id="playHead"><div id="playProg">🏆 魔法大考 ${qi + 1} / ${qs.length}　已答对 ${right}</div></div>
      <div class="card" id="playQ">${head}</div>
      <div class="optGrid">${optHtml}</div>`;
    if (type !== "zhen") speak(w.w);
    if (type === "listen") $("#lcSpeak").onclick = () => speak(w.w);
    let locked = false;
    document.querySelectorAll("#scr-play .optBtn").forEach(b => {
      b.onclick = () => {
        if (locked) return; locked = true;
        const o = opts[+b.dataset.i];
        if (o.w === w.w) { b.classList.add("right"); sndRight(); right++; recordRight(w.w); if (type === "zhen") speak(w.w); }
        else {
          b.classList.add("wrong"); sndWrong(); recordWrong(w.w);
          document.querySelectorAll("#scr-play .optBtn").forEach(x => { if (opts[+x.dataset.i].w === w.w) x.classList.add("right"); });
        }
        setTimeout(() => { qi++; q(); }, 850);
      };
    });
    show("play", "🏆 魔法大考");
  }
  function finish() {
    bumpDaily("g");
    const score = Math.round(right / qs.length * 100);
    const stars = score >= 90 ? 3 : score >= 75 ? 2 : score >= 60 ? 1 : 0;
    let newBest = false;
    if (score > S.bestExam) { S.bestExam = score; newBest = true; save(); }
    renderResult({
      stars, title: score >= 90 ? "综合复习满分学霸！" : score >= 60 ? "大考通过！" : "还需再复习一下",
      detail: `得分 ${score} 分（答对 ${right}/${qs.length}）${newBest ? "　🎉 刷新纪录！" : "　最高纪录 " + S.bestExam + " 分"}`,
      coins: right * 3 + (score >= 90 ? 10 : 0),
      replay: () => startExam()
    });
  }
  q();
}

/* ================= 家长学习报告 ================= */
function last7() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    out.push({ k, label: "日一二三四五六"[d.getDay()], h: S.history[k] || null });
  }
  return out;
}
function renderReport() {
  const days = last7();
  const active = days.filter(d => d.h && d.h.total > 0).length;
  const totalWords = UNITS.reduce((a, u) => a + u.words.length, 0);
  const mastered = UNITS.reduce((a, u) => a + unitS(u.id).learned.length, 0);
  const allR = Object.values(S.history).reduce((a, h) => a + h.right, 0);
  const allT = Object.values(S.history).reduce((a, h) => a + h.total, 0);
  const acc = allT ? Math.round(allR / allT * 100) : 0;
  const top = Object.entries(S.wrong).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxT = Math.max(10, ...days.map(d => d.h ? d.h.total : 0));
  $("#scr-report").innerHTML = `
    <div class="card">
      <div style="display:flex;text-align:center">
        <div style="flex:1"><div style="font-size:24px;font-weight:800;color:#9b59b6">${mastered}<span style="font-size:13px;color:#c0a8d0">/${totalWords}</span></div><div style="font-size:11px;color:#b8a8c8">掌握单词</div></div>
        <div style="flex:1"><div style="font-size:24px;font-weight:800;color:#7cc576">${acc}%</div><div style="font-size:11px;color:#b8a8c8">总正确率</div></div>
        <div style="flex:1"><div style="font-size:24px;font-weight:800;color:#e8a33d">${S.streak}</div><div style="font-size:11px;color:#b8a8c8">连续天数</div></div>
      </div>
    </div>
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 10px">📊 最近7天（学习 ${active}/7 天）</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:110px">
        ${days.map(d => {
          const t = d.h ? d.h.total : 0;
          const r = d.h ? d.h.right : 0;
          const hp = Math.round(t / maxT * 84);
          const rp = t ? Math.round(r / t * 100) : 0;
          return `<div style="flex:1;text-align:center">
            <div style="font-size:10px;color:#b8a8c8;font-variant-numeric:tabular-nums">${t ? rp + "%" : ""}</div>
            <div style="height:${Math.max(hp, 3)}px;border-radius:6px 6px 0 0;background:${t ? "linear-gradient(180deg,#ffd166,#ff9ec6)" : "#f0e8f8"}"></div>
            <div style="font-size:11px;color:#b8a8c8;margin-top:3px">${d.label}</div>
            <div style="font-size:9px;color:#d0c0e0">${t ? t + "题" : "—"}</div>
          </div>`;
        }).join("")}
      </div>
    </div>
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">🧠 记忆保有量（间隔重复）</div>
      <div style="display:flex;height:16px;border-radius:8px;overflow:hidden;background:#f0e8f8">
        ${(() => {
          const t = memoryTiers(), sum = t.fresh + t.familiar + t.solid || 1;
          return `<div style="width:${t.fresh / sum * 100}%;background:#ffd166"></div>
                  <div style="width:${t.familiar / sum * 100}%;background:#b98ff0"></div>
                  <div style="width:${t.solid / sum * 100}%;background:#7cc576"></div>`;
        })()}
      </div>
      <div style="display:flex;text-align:center;margin-top:8px">
        <div style="flex:1"><div style="font-size:18px;font-weight:800;color:#e8a33d">${memoryTiers().fresh}</div><div style="font-size:11px;color:#b8a8c8">刚学会 (1-2级)</div></div>
        <div style="flex:1"><div style="font-size:18px;font-weight:800;color:#b98ff0">${memoryTiers().familiar}</div><div style="font-size:11px;color:#b8a8c8">越来越熟 (3-4级)</div></div>
        <div style="flex:1"><div style="font-size:18px;font-weight:800;color:#7cc576">${memoryTiers().solid}</div><div style="font-size:11px;color:#b8a8c8">长期记忆 (5-6级)</div></div>
      </div>
      <div style="font-size:11px;color:#c0a8d0;margin-top:8px;line-height:1.7">
        每个学会的词按 1→2→4→7→15→30 天的间隔自动安排复习：按时复习答对就升一级、间隔拉长；答错打回1级重练。
        今天到期 <b style="color:#e8842d">${dueCount()}</b> 个词。
      </div>
    </div>
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">📕 最常出错的词（Top 5）</div>
      ${top.length ? top.map(([w, c]) => {
        const info = WORD_INDEX[w];
        return `<div class="vRow"><span style="font-size:20px">${info ? info.e : "❓"}</span>
          <span class="vName">${esc(w)}<span class="vDate">${info ? info.zh : ""}</span></span>
          <span style="font-size:12px;color:#e8842d;font-weight:700">待巩固 ${c}</span></div>`;
      }).join("") : `<div style="font-size:13px;color:#b8a8c8;padding:8px 2px">目前没有错词，很棒！</div>`}
    </div>
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">🏆 综合能力</div>
      <div class="vRow"><span style="font-size:20px">🏆</span><span class="vName">魔法大考最高分<span class="vDate">跨单元综合测试</span></span><span style="font-size:14px;font-weight:700;color:#9b59b6">${S.bestExam || "—"}</span></div>
      <div class="vRow"><span style="font-size:20px">🔮</span><span class="vName">拼读规则<span class="vDate">Let's spell 自然拼读</span></span><span style="font-size:14px;font-weight:700;color:#9b59b6">${Object.values(S.phonics).filter(p => p.stars > 0).length}/${PHONICS.length}</span></div>
      <div class="vRow"><span style="font-size:20px">🎟️</span><span class="vName">已兑现的实物奖励<span class="vDate">转盘奖励券</span></span><span style="font-size:14px;font-weight:700;color:#9b59b6">${S.vouchers.filter(v => v.used).length} 次</span></div>
    </div>`;
  show("report", "📊 学习报告");
}

/* ================= 进度备份码 ================= */
function exportCode() {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); } catch (e) { return ""; }
}
function importCode(code) {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!obj || typeof obj.coins !== "number" || !obj.units) return false;
    S = Object.assign(defState(), obj);
    ensureDaily(); migrateSRS(); save(); applyTheme(); updateCoinBox();
    return true;
  } catch (e) { return false; }
}
function renderBackup() {
  const code = exportCode();
  $("#scr-backup").innerHTML = `
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">💾 备份进度</div>
      <div style="font-size:12px;color:#b8a8c8;margin-bottom:8px">进度只存在这台手机里。清缓存、换手机会全部丢失（包括宠物、贴纸、连续天数）。把下面这串码复制保存到微信收藏或备忘录，随时可以恢复。</div>
      <textarea id="bkOut" readonly style="width:100%;height:90px;border:2px solid #eadcf2;border-radius:12px;padding:8px;font-size:11px;color:#7a5a9a;background:#fff;resize:none">${esc(code)}</textarea>
      <div style="height:8px"></div>
      <button class="btn small" id="bkCopy">📋 复制备份码</button>
      <span style="font-size:11px;color:#c0b0d0;margin-left:8px">${(code.length / 1024).toFixed(1)} KB</span>
    </div>
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">📥 恢复进度</div>
      <div style="font-size:12px;color:#b8a8c8;margin-bottom:8px">粘贴之前保存的备份码，会<b style="color:#e05a5a">覆盖</b>当前手机上的全部进度。</div>
      <textarea id="bkIn" placeholder="在这里粘贴备份码……" style="width:100%;height:90px;border:2px solid #eadcf2;border-radius:12px;padding:8px;font-size:11px;color:#7a5a9a;background:#fff;resize:none"></textarea>
      <div style="height:8px"></div>
      <button class="btn small ghost" id="bkIn2">📥 恢复这份进度</button>
    </div>`;
  $("#bkCopy").onclick = () => {
    const t = $("#bkOut"); t.select(); t.setSelectionRange(0, 99999);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast("✅ 备份码已复制")).catch(() => { if (!ok) toast("请长按上面的文字手动复制"); });
    else toast(ok ? "✅ 备份码已复制" : "请长按上面的文字手动复制");
  };
  let armed = false;
  $("#bkIn2").onclick = () => {
    const v = $("#bkIn").value.trim();
    if (!v) { toast("请先粘贴备份码"); return; }
    if (!armed) { armed = true; $("#bkIn2").textContent = "⚠️ 会覆盖当前进度，再点一次确认"; return; }
    if (importCode(v)) { confetti(); sndWin(); toast("🎉 进度已恢复！", 2400); parentOK = true; navStack = [renderHome]; renderHome(); }
    else { sndWrong(); toast("备份码不对，检查一下有没有复制完整"); armed = false; $("#bkIn2").textContent = "📥 恢复这份进度"; }
  };
  show("backup", "💾 备份与恢复");
}

/* ================= 发音自检 ================= */
function renderAudioCheck() {
  const has = "speechSynthesis" in window;
  const vs = has ? speechSynthesis.getVoices() : [];
  const en = vs.filter(v => /^en(-|_|$)/i.test(v.lang));
  if (!enVoice) pickVoice();
  const acState = AC ? AC.state : "尚未创建";
  const nMp3 = typeof AUDIO_MAP !== "undefined" ? Object.keys(AUDIO_MAP).length : 0;
  const row = (k, v, ok) => `<div class="vRow"><span style="font-size:18px">${ok ? "✅" : "⚠️"}</span><span class="vName">${k}<span class="vDate">${esc(String(v))}</span></span></div>`;
  $("#scr-audio").innerHTML = `
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">🔊 发音自检</div>
      ${row("真人发音包（主通道）", nMp3 ? nMp3 + " 条已就绪" : "未加载 —— 请刷新网页", nMp3 > 0)}
      ${row("音效通道", acState, acState === "running" || acState === "尚未创建")}
      ${row("系统语音合成（备用）", has ? (en.length + " 个英文语音") : "不支持", has)}
      ${row("游戏音效开关", S.sound === false ? "已关闭" : "开着", S.sound !== false)}
    </div>
    <div class="card" style="text-align:center">
      <button class="btn" id="acTest">🔊 测试真人发音（cake）</button>
      <div style="height:10px"></div>
      <button class="btn ghost" id="acTest3">🗣️ 测试整句发音</button>
      <div style="height:10px"></div>
      <button class="btn ghost" id="acTest2">🎵 测试音效（叮）</button>
      <div id="acHint" style="font-size:12px;color:#b8a8c8;margin-top:10px">现在的单词发音是网站内置的真人录音（mp3），不再依赖手机的语音引擎</div>
    </div>
    <div class="card" style="font-size:12px;color:#7a5a9a;line-height:1.9">
      <b style="color:#9b59b6">只听到「叮」但没有人声？按顺序检查：</b><br>
      1️⃣ 先<b>彻底关掉再重开</b>网页/桌面App一次（旧版本缓存里没有真人发音包）<br>
      2️⃣ <b>iPhone</b>：机身左侧<b>静音开关</b>拨到「响铃」那一侧；再按音量上键把媒体音量调大<br>
      3️⃣ 确认没插着耳机 / 没连着蓝牙音箱<br>
      4️⃣ 用 <b>Safari 或 Chrome</b> 打开，微信内置浏览器可能拦截音频<br>
      5️⃣ 第一次进入要先点一下屏幕，浏览器才允许出声（手机的安全限制）
    </div>`;
  $("#acTest").onclick = () => {
    unlockAudio(); speak("cake", 0.95);
    $("#acHint").textContent = "应该听到一个女声在读 cake";
  };
  $("#acTest3").onclick = () => {
    unlockAudio(); speak("Hello! I am your English pet.", 0.95);
    $("#acHint").textContent = "应该听到一整句英文";
  };
  $("#acTest2").onclick = () => { unlockAudio(); sndWin(); };
  show("audio", "🔊 发音自检");
}

/* ================= 主题换装屋 ================= */
const THEMES = [
  { id: "candy", n: "🍭 糖果粉粉", sub: "甜甜的经典配色", cost: 0, g: "linear-gradient(135deg,#ffe5f1,#e8e5ff)" },
  { id: "mint", n: "🌿 薄荷仙子", sub: "清清爽爽的绿色森林", cost: 60, g: "linear-gradient(135deg,#dff7e8,#7db8f0)" },
  { id: "ocean", n: "🧜‍♀️ 美人鱼之海", sub: "潜入蓝色的海底世界", cost: 60, g: "linear-gradient(135deg,#d5f0ff,#8a9af0)" },
  { id: "peach", n: "🍑 蜜桃汽水", sub: "元气满满的橙色泡泡", cost: 60, g: "linear-gradient(135deg,#ffe8d5,#ff8fab)" },
  { id: "night", n: "🌌 星空魔法", sub: "晚上学习不刺眼的夜空", cost: 100, g: "linear-gradient(135deg,#252040,#5a4a8a)" }
];
function applyTheme() {
  document.body.className = S.theme && S.theme !== "candy" ? "th-" + S.theme : "";
}
function renderTheme() {
  $("#scr-theme").innerHTML = `
    ${S.testMode ? `<div class="card" style="background:#fff3d6;text-align:center;padding:10px;font-size:13px;font-weight:700;color:#e8842d">🧪 测试模式：全部皮肤免费，点「免费穿上」即可试装</div>` : ""}
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">🎨 给乐园换新装！</div>
      <div style="font-size:12px;color:#b8a8c8;margin-top:2px">${S.testMode ? "测试模式下不扣金币，随便换着玩" : "用金币解锁新皮肤，解锁后随时切换 · 你有 🪙" + S.coins}</div>
    </div>
    ${THEMES.map((t, i) => {
      const owned = S.themesOwned.includes(t.id), cur = S.theme === t.id;
      const enough = S.coins >= t.cost;
      let label, cls;
      if (cur) { label = "使用中 ✓"; cls = "cur"; }
      else if (owned) { label = "穿上"; cls = ""; }
      else if (S.testMode) { label = "免费穿上"; cls = ""; }
      else if (enough) { label = "🪙" + t.cost + " 解锁"; cls = ""; }
      else { label = "还差 🪙" + (t.cost - S.coins); cls = "lock"; }
      return `<div class="card themeCard">
        <div class="themeSwatch" style="background:${t.g}"></div>
        <span class="themeName">${t.n}<span class="themeSub">${t.sub}${!owned && !S.testMode ? "　·　需要 🪙" + t.cost : ""}</span></span>
        <button class="themeBtn ${cls}" data-i="${i}">${label}</button>
      </div>`;
    }).join("")}
    <div class="card actRow" id="soundRow">
      <span class="aIcon">${S.sound !== false ? "🔊" : "🔇"}</span>
      <span class="aName">游戏音效<span class="aSub">单词发音不受影响</span></span>
      <button class="themeBtn ${S.sound !== false ? "cur" : "lock"}" id="soundBtn">${S.sound !== false ? "开着呢" : "已关闭"}</button>
    </div>`;
  document.querySelectorAll("#scr-theme .themeCard .themeBtn").forEach(b => {
    b.onclick = () => {
      const t = THEMES[+b.dataset.i];
      if (S.theme === t.id) return;
      if (S.testMode && !S.themesOwned.includes(t.id)) S.themesOwned.push(t.id);   // 测试模式：皮肤免费
      if (S.themesOwned.includes(t.id)) {
        S.theme = t.id; save(); applyTheme(); sndCoin();
        toast("换上【" + t.n + "】啦！✨"); renderTheme();
      } else if (S.coins >= t.cost) {
        S.coins -= t.cost; S.themesOwned.push(t.id); S.theme = t.id;
        save(); updateCoinBox(); applyTheme(); confetti(); sndWin();
        toast("🎊 解锁新皮肤【" + t.n + "】！"); renderTheme();
      } else {
        sndWrong(); toast("还差 " + (t.cost - S.coins) + " 金币，去闯关赚吧！💪");
      }
    };
  });
  $("#soundBtn").onclick = () => {
    S.sound = S.sound === false; save();
    if (S.sound) sndCoin();
    toast(S.sound ? "音效已打开 🔊" : "音效已关闭 🔇");
    renderTheme();
  };
  show("theme", "🎨 主题换装屋");
}

/* ================= 奖励屋（扭蛋） ================= */
const GACHA_COST = 20;
function drawSticker() {
  const r = Math.random() * 100;
  const rar = r < 6 ? 3 : r < 32 ? 2 : 1;
  const list = STICKERS.filter(s => s.r === rar);
  return list[Math.floor(Math.random() * list.length)];
}
function renderReward() {
  const got = Object.keys(S.stickers).length;
  const pend = S.vouchers.filter(v => !v.used).length;
  $("#scr-reward").innerHTML = `
    <div class="card actRow" id="toWheel" style="background:linear-gradient(135deg,#fff3d6,#ffe0ef)">
      <span class="aIcon">🎡</span>
      <span class="aName">幸运大转盘<span class="aSub">转出真实奖励！转盘券：${S.tickets} 张${wheelStale() ? " · 🎁该上新奖品啦" : ""}</span></span>
      <span class="aGo">▶</span>
    </div>
    <div class="card actRow" id="toVoucher">
      <span class="aIcon">🎟️</span>
      <span class="aName">我的奖励券<span class="aSub">${pend ? pend + " 张待兑换" : "转到的奖励存在这里"}</span></span>
      <span class="aGo">▶</span>
    </div>
    <div class="card" id="gachaBox">
      <div id="gachaEgg">🥚</div>
      <div style="font-size:15px;font-weight:700;color:#9b59b6;margin-top:6px">魔法扭蛋机</div>
      <div style="font-size:12px;color:#b8a8c8">攒金币扭出可爱贴纸，集齐 ${STICKERS.length} 款！</div>
      <div id="gachaResult"></div>
      <button class="btn" id="gachaBtn">扭一次（🪙${GACHA_COST}）</button>
    </div>
    <div class="card actRow" id="toAlbum">
      <span class="aIcon">📔</span>
      <span class="aName">我的贴纸册<span class="aSub">已收集 ${got}/${STICKERS.length}</span></span>
      <span class="aGo">▶</span>
    </div>
    <div class="card actRow" id="toTheme">
      <span class="aIcon">🎨</span>
      <span class="aName">主题换装屋<span class="aSub">已拥有 ${S.themesOwned.length}/${THEMES.length} 套皮肤</span></span>
      <span class="aGo">▶</span>
    </div>
    <div id="parentLink">家长设置</div>`;
  $("#toTheme").onclick = () => go(renderTheme);
  $("#toWheel").onclick = () => go(renderWheel);
  $("#toVoucher").onclick = () => go(renderVoucher);
  $("#parentLink").onclick = () => go(renderParent);
  $("#toAlbum").onclick = () => go(renderAlbum);
  $("#gachaBtn").onclick = () => {
    if (S.coins < GACHA_COST) { toast("金币不够啦，去闯关赚金币吧！💪"); sndWrong(); return; }
    S.coins -= GACHA_COST; updateCoinBox(); save();
    const egg = $("#gachaEgg"), btn = $("#gachaBtn");
    btn.disabled = true;
    egg.classList.remove("shake"); void egg.offsetWidth; egg.classList.add("shake");
    tone(400, .1); tone(500, .1, "sine", .25); tone(600, .1, "sine", .5);
    setTimeout(() => {
      const st = drawSticker();
      const dup = !!S.stickers[st.n];
      S.stickers[st.n] = (S.stickers[st.n] || 0) + 1; save();
      if (st.r === 3) { confetti(); sndWin(); } else sndCoin();
      const rarTxt = st.r === 3 ? "✨传说✨" : st.r === 2 ? "稀有" : "普通";
      $("#gachaResult").innerHTML = `
        <div class="stickerCard r${st.r}">
          <div class="se">${st.e}</div>
          <div class="sn">${st.n} · ${rarTxt}</div>
          ${dup
            ? '<div style="font-size:11px;margin-top:2px">重复啦，返还5金币</div>'
            : '<div style="font-size:11px;margin-top:2px">🎊 新贴纸！可以去贴纸册给宠物戴上</div>'}
        </div>`;
      if (dup) { S.coins += 5; save(); updateCoinBox(); }
      if (!dup) checkStickerSets();          // 可能刚好集齐某个稀有度 → 送转盘券
      $("#toAlbum .aSub").textContent = `已收集 ${Object.keys(S.stickers).length}/${STICKERS.length}`;
      btn.disabled = false;
    }, 900);
  };
  show("reward", "🎁 奖励屋");
}

/* ================= 贴纸册（可给宠物装扮 + 集齐奖励） ================= */
const RARITY = { 1: "普通", 2: "稀有", 3: "传说" };
/* 某个稀有度是否已集齐 */
function setComplete(r) {
  return STICKERS.filter(s => s.r === r).every(s => S.stickers[s.n]);
}
/* 集齐一个稀有度 → 送转盘券（每档只送一次） */
function checkStickerSets() {
  [1, 2, 3].forEach(r => {
    if (setComplete(r) && !S.setDone["r" + r]) {
      S.setDone["r" + r] = true; save();
      confetti(); sndWin();
      setTimeout(() => toast("🏆 集齐全部【" + RARITY[r] + "】贴纸！", 2600), 300);
      addTicket(r === 3 ? 2 : 1, "集齐" + RARITY[r] + "贴纸");
    }
  });
}

function renderAlbum() {
  const got = Object.keys(S.stickers).length;
  const owned = STICKERS.filter(s => S.stickers[s.n]);
  $("#scr-album").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">📔 已收集 ${got} / ${STICKERS.length}</div>
      <div style="font-size:12px;color:#b8a8c8">点已收集的贴纸，可以给宠物戴上或当小伙伴！</div>
    </div>

    <div class="card" style="text-align:center;padding:14px">
      <div style="font-size:13px;font-weight:700;color:#9b59b6;margin-bottom:8px">✨ 我的宠物搭配</div>
      <div class="petShow">
        <span class="petHat">${S.hat ? stickerOf(S.hat).e : ""}</span>
        <span class="petMain">${petStage(S.xp).e}</span>
        <span class="petBuddy">${S.buddy ? stickerOf(S.buddy).e : ""}</span>
      </div>
      <div style="font-size:11px;color:#c0a8d0;margin-top:6px">
        头顶：${S.hat || "空"}　·　小伙伴：${S.buddy || "空"}
      </div>
      ${(S.hat || S.buddy) ? `<button class="btn small ghost" id="clearDeco" style="margin-top:8px">取下装扮</button>` : ""}
    </div>

    <div class="card" style="padding:12px">
      <div style="font-size:13px;font-weight:700;color:#9b59b6;margin-bottom:6px">🏆 集齐奖励</div>
      ${[1, 2, 3].map(r => {
        const all = STICKERS.filter(s => s.r === r);
        const have = all.filter(s => S.stickers[s.n]).length;
        const done = setComplete(r);
        return `<div class="vRow">
          <span style="font-size:18px">${done ? "🏆" : "🎯"}</span>
          <span class="vName">集齐全部【${RARITY[r]}】贴纸<span class="vDate">${have}/${all.length}　奖励 ${r === 3 ? 2 : 1} 张转盘券</span></span>
          <span style="font-size:12px;font-weight:700;color:${done ? "#7cc576" : "#c0a8d0"}">${done ? "已达成" : "进行中"}</span>
        </div>`;
      }).join("")}
    </div>

    <div class="albumGrid">
      ${STICKERS.map((s, i) => {
        const have = !!S.stickers[s.n];
        const on = S.hat === s.n || S.buddy === s.n;
        return `<div class="albumCell ${have ? "" : "no"} ${s.r === 3 ? "rr3" : ""} ${on ? "using" : ""}" data-i="${i}">
          <div class="ae">${s.e}</div>
          <div class="an">${have ? s.n + (S.stickers[s.n] > 1 ? " ×" + S.stickers[s.n] : "") : "？？？"}</div>
        </div>`;
      }).join("")}
    </div>`;
  document.querySelectorAll("#scr-album .albumCell").forEach(c => {
    c.onclick = () => {
      const s = STICKERS[+c.dataset.i];
      if (!S.stickers[s.n]) { toast("这张还没扭到哦，去扭蛋机试试！"); sndWrong(); return; }
      pickDeco(s);
    };
  });
  if (S.hat || S.buddy) $("#clearDeco").onclick = () => {
    S.hat = null; S.buddy = null; save(); sndCoin(); toast("装扮已取下"); renderAlbum();
  };
  show("album", "📔 贴纸册");
}
function stickerOf(name) { return STICKERS.find(s => s.n === name) || { e: "", n: "" }; }

/* 选择把贴纸戴在头上 / 当小伙伴 */
function pickDeco(s) {
  const box = document.createElement("div");
  box.id = "decoPick";
  box.innerHTML = `
    <div class="decoCard">
      <div style="font-size:44px">${s.e}</div>
      <div style="font-size:15px;font-weight:700;color:#7a5a9a;margin:4px 0 10px">${s.n}　<span style="font-size:12px;color:#b8a8c8">${RARITY[s.r]}</span></div>
      <button class="btn small" id="asHat">👑 戴在头顶</button>
      <div style="height:8px"></div>
      <button class="btn small" id="asBuddy">🫶 当小伙伴</button>
      <div style="height:8px"></div>
      <button class="btn small ghost" id="decoCancel">取消</button>
    </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.onclick = e => { if (e.target === box) close(); };
  $("#asHat").onclick = () => { S.hat = s.n; save(); sndCoin(); confettiSmall(6); close(); toast(s.n + " 戴上啦！"); renderAlbum(); };
  $("#asBuddy").onclick = () => { S.buddy = s.n; save(); sndCoin(); confettiSmall(6); close(); toast(s.n + " 成为小伙伴啦！"); renderAlbum(); };
  $("#decoCancel").onclick = close;
}

/* ================= 启动 ================= */
migrateSRS();
migrateCheckins();
applyTheme();
updateCoinBox();
/* 连续玩30分钟提醒休息眼睛 */
let restAt = Date.now();
setInterval(() => {
  if (Date.now() - restAt >= 30 * 60 * 1000) {
    restAt = Date.now();
    toast("👀 已经玩了30分钟啦，休息一下眼睛，看看远处再回来～", 4000);
  }
}, 60000);
navStack = [renderHome];
renderHome();
if (!localStorage.getItem(LS_KEY + "_hi")) {
  localStorage.setItem(LS_KEY + "_hi", "1");
  setTimeout(() => toast("🌸 欢迎来到魔法英语乐园！先去完成今日任务吧～", 3000), 600);
}
save();

/* 离线缓存 */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

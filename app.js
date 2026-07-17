/* ============================================================
 * 魔法英语乐园 - 主逻辑
 * ============================================================ */

/* ---------------- 工具 ---------------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function sample(a, n) { return shuffle(a).slice(0, n); }
function todayStr() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function yesterdayStr() { const d = new Date(Date.now() - 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

const WORD_INDEX = {};
UNITS.forEach(u => u.words.forEach(w => { WORD_INDEX[w.w] = w; }));

/* ---------------- 存档 ---------------- */
const LS_KEY = "magicEnglish_v1";
/* 跨科目共享钱包：语文《寻宝作文记》和英语在同一个域下，localStorage 互通。
   学英语和学语文赚的是同一份金币和转盘券，喂的是同一只宠物。 */
const WALLET_KEY = "sharedWallet_v1";
/* 白白的最新装扮也跨科目共享：语文只读取展示，不从这里扣钱。 */
const SHARED_PET_KEY = "sharedPet_v1";
function defState() {
  return {
    coins: 0, xp: 0, streak: 0, lastDaily: "",
    daily: { date: todayStr(), w: 0, g: 0, r: 0, ph: 0, earn: 0, t1: false, t2: false, t3: false, t4: false, hard: false, bonus: false, spun: false },
    units: {},    // id -> {learned:[], stars:0, s3:false}
    wrong: {},    // word -> 次数
    stickers: {}, // 贴纸名 -> 数量
    buddy: null,  // 挂在宠物身边的贴纸（小伙伴）
    hat: null,    // 戴在宠物头上的贴纸
    setDone: {},  // 已领过的集齐奖励：r1/r2/r3
    /* 核心伙伴白白：照顾 + 多件自由装扮 */
    pet: {
      id: "baibai",
      name: "白白",
      owned: ["baibai"],
      hunger: 80, clean: 80, mood: 80,   // 三条状态（只会变淡，绝不会「生病/死掉」）
      bond: 0,                // 亲密度：喂养积累
      careDay: todayStr(),    // 上次结算状态的日期
      wear: { hat: "", face: "", item: "" }, // 兼容旧存档，不再用于白白
      worn: [],               // 白白当前穿戴的多件装扮 id
      outfits: ["bb_bow", "bb_flower"], // 两件免费发饰，打开就能玩
      pics: {},               // 家长自己上传的伙伴形象：petId -> dataURI（只存本机，不进仓库、不上传）
      anchors: {},            // 兼容旧存档
      deco: { baibai: {} },   // outfitId -> {x,y,s,r}
      baibaiV1: true
    },
    checkins: {},  // 打卡成功的日期（完成当天全部任务才算）
    cyclesPaid: 0, // 已发过奖励的学习周期数（每满 7 天一个周期）
    tickets: 0,   // 转盘券
    wheel: null,  // 家长自定义转盘奖品，null=用默认
    vouchers: [], // 转盘中的实物奖励券 {n, d, used}
    wheelTouched: todayStr(), // 上次更换转盘奖品的日期，驱动14天上新提醒
    theme: "candy",
    themesOwned: ["candy"],
    sound: true,
    walletMigrated: false, // 首次接入共享钱包时把已有金币/券并进去（只做一次）
    focusBook: "auto",  // 当前学习重点：auto=跟学校进度(四上)，或家长指定某一册（暑假复习用）
    diff: "auto",    // 难度：auto=随掌握词量自动升段，或家长手动锁 1/2/3
    testMode: false, // 家长测试模式：解锁全部内容，给孩子用前记得关掉
    phonics: {},   // 拼读规则id -> {learned:true, stars:0}
    learnedAt: {}, // 单词 -> 首次学会日期
    srs: {},       // 单词 -> {lv:1..6, due:"YYYY-MM-DD"}  间隔重复调度器
    history: {},   // 日期 -> {right, total, w, g, mins}
    bestExam: 0,   // 魔法大考最高分
    stageExams: {}, // 阶段测验：stageKey -> {best, passed, date}
    gachaDup: 0     // 连续重复保护：4次重复后下一颗必出新卡
  };
}
let S = defState();
try { const raw = localStorage.getItem(LS_KEY); if (raw) S = Object.assign(defState(), JSON.parse(raw)); } catch (e) {}
S.daily = Object.assign(defState().daily, S.daily);
S.pet = Object.assign(defState().pet, S.pet || {});
S.stageExams = Object.assign({}, S.stageExams || {});
S.pet.wear = Object.assign(defState().pet.wear, S.pet.wear || {});
/* 老伙伴存档只隐藏不删除学习/金币数据；首次升级时让白白以裸狗形象登场。 */
if (!S.pet.baibaiV1) {
  S.pet.worn = [];
  S.pet.deco = Object.assign({}, S.pet.deco || {}, { baibai: {} });
  S.pet.outfits = (S.pet.outfits || []).filter(id => String(id).startsWith("bb_"));
  S.hat = null;
  S.buddy = null;
  S.pet.baibaiV1 = true;
}
S.pet.id = "baibai";
S.pet.name = "白白";
S.pet.owned = ["baibai"];
S.pet.worn = Array.isArray(S.pet.worn) ? S.pet.worn.filter(id => OUTFITS.some(o => o.id === id)) : [];
S.pet.outfits = Array.isArray(S.pet.outfits) ? S.pet.outfits : [];
["bb_bow", "bb_flower"].forEach(id => { if (!S.pet.outfits.includes(id)) S.pet.outfits.push(id); });
/* v31 修复旧帽子坐标：早期默认中心在脸上，且舞台会裁掉顶部。
   只迁移一次；孩子之后手动保存的位置不再被系统改动。 */
if (!S.pet.hatFitV2) {
  const ds = ((S.pet.deco || {}).baibai || {});
  OUTFITS.filter(o => o.cat === "帽子").forEach(o => {
    const d = ds[o.id];
    if (d && Number(d.y) >= 28) { d.y = o.pos.y; d.s = Math.min(Number(d.s) || 1, 1.15); }
  });
  S.pet.hatFitV2 = true;
}
/* 老贴纸不是白白：升级时按“已有款数 + 总张数”等量换成白白收藏卡，不清空孩子的收集成果。 */
const oldStickerEntries = Object.entries(S.stickers || {}).filter(([name]) => !STICKERS.some(s => s.n === name));
if (oldStickerEntries.length) {
  const oldAll = Object.values(S.stickers || {}).reduce((n, x) => n + Math.max(0, Number(x) || 0), 0);
  const oldKinds = Object.keys(S.stickers || {}).length;
  const next = {};
  for (let i = 0; i < Math.min(oldKinds, STICKERS.length); i++) next[STICKERS[i].n] = 1;
  let extra = Math.max(0, oldAll - Object.keys(next).length), i = 0;
  while (extra--) { const n = STICKERS[i++ % STICKERS.length].n; next[n] = (next[n] || 0) + 1; }
  S.stickers = next;
  S.setDone = {};                 // 新收藏册重新计算三档集齐奖励
}
/* 收藏卡是完整的白白造型，不再把另一只动物贴到白白头上或身边。 */
S.hat = null;
S.buddy = null;
if (!S.wheelTouched) S.wheelTouched = todayStr();
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
  walletOut();     // 金币/转盘券的变化同步到共享钱包，语文App立刻能看到
  sharePetOut();
}

function sharePetOut() {
  try {
    const items = (S.pet.worn || []).map(id => {
      const o = OUTFITS.find(x => x.id === id), d = decoOf(id);
      return o ? { id: o.id, e: o.e, n: o.n, art: o.art ? new URL(o.art, location.href).href : "", base: o.base || .3, hue: Number(o.hue) || 0, x: d.x, y: d.y, s: d.s, r: d.r } : null;
    }).filter(Boolean);
    localStorage.setItem(SHARED_PET_KEY, JSON.stringify({ v: 1, name: "白白", items }));
  } catch (e) {}
}

/* ---------------- 共享钱包 ----------------
 * 金币和转盘券以共享钱包为准，两个 App 都读它、都写它。
 * 首次接入时把英语App已有的金币/券「并」进钱包（walletMigrated 保证只并一次，不会重复计数）。
 */
function walletOut() {
  try { localStorage.setItem(WALLET_KEY, JSON.stringify({ coins: S.coins || 0, tickets: S.tickets || 0 })); } catch (e) {}
}
function loadWallet() {
  try { const w = JSON.parse(localStorage.getItem(WALLET_KEY) || "null"); if (w && typeof w.coins === "number") return w; } catch (e) {}
  return { coins: S.coins || 0, tickets: S.tickets || 0 };
}
function saveWallet(w) {
  S.coins = w.coins || 0; S.tickets = w.tickets || 0;
  try { localStorage.setItem(WALLET_KEY, JSON.stringify({ coins: S.coins, tickets: S.tickets })); } catch (e) {}
}
function walletIn() {
  let w = { coins: 0, tickets: 0 };
  try { const raw = localStorage.getItem(WALLET_KEY); if (raw) w = JSON.parse(raw) || w; } catch (e) {}
  if (!S.walletMigrated) {
    /* 只在第一次接入时把双方已有的加起来，之后钱包就是唯一真相 */
    w.coins = (w.coins || 0) + (S.coins || 0);
    w.tickets = (w.tickets || 0) + (S.tickets || 0);
    S.walletMigrated = true;
  }
  S.coins = w.coins || 0;
  S.tickets = w.tickets || 0;
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
  walletOut();
}
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
    blanks: 2,                               // 进入第二段后一次补两个字母
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
/* 段位应该反映「当前教材的掌握度」。
   低年级（二年级/三上/三下）的词简单得多，暑假刷一遍就把难度顶到最高是错的——
   所以低年级词只按半个计。 */
const CORE_BOOKS = ["四上", "四下"];
function masteredCount() {
  let n = 0;
  UNITS.forEach(u => {
    const c = unitS(u.id).learned.length;
    n += CORE_BOOKS.includes(u.book) ? c : c * 0.5;
  });
  return Math.round(n);
}
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
let enVoice = null, zhPetVoice = null;
function pickVoice() {
  const all = speechSynthesis.getVoices();
  const vs = all.filter(v => /^en/i.test(v.lang));
  enVoice = vs.find(v => /female|samantha|karen|zira|aria|jenny/i.test(v.name)) || vs[0] || null;
  const zh = all.filter(v => /^(zh|cmn)/i.test(v.lang));
  /* 优先挑中文童声/年轻女声；不同手机名称不同，所以保留语言兜底。 */
  zhPetVoice = zh.find(v => /xiaoxiao|xiaoyi|yunxia|tingting|meijia|hanhan|child|kid|童|晓|小艺|婷婷/i.test(v.name))
    || zh.find(v => /female|女/i.test(v.name)) || zh[0] || null;
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
/* 切到后台 / 锁屏时闭嘴，别在口袋里继续念单词 */
document.addEventListener("visibilitychange", () => { if (document.hidden) stopSpeak(); });

/* Chrome 长时间不说话会自己暂停，定时唤醒 */
setInterval(() => {
  try { if (window.speechSynthesis && speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {}
}, 5000);

function ttsFail() {
  if (ttsWarned) return;
  ttsWarned = true;
  toast("🔇 听不到发音？去「白白礼物→家长设置→发音自检」看看", 4000);
}
/* 主通道：播放预合成 mp3。onEnd 在音频真正播完时回调 */
let englishBusyUntil = 0, baibaiVoiceTimer = null, baibaiVoiceGen = 0, baibaiPendingSpeak = null;
function englishEstimate(text) {
  return Math.max(850, Math.min(7000, String(text || "").split(/\s+/).length * 520));
}
function speak(text, rate, onEnd) {
  unlockAudio();
  englishBusyUntil = Date.now() + englishEstimate(text);
  const f = audioFile(text);
  if (AUD && f) {
    try {
      AUD.pause();
      AUD.onended = null;
      AUD.src = "audio/" + f;
      AUD.playbackRate = Math.min(1, Math.max(0.6, rate || 0.95));
      AUD.currentTime = 0;
      AUD.onended = () => {
        AUD.onended = null; englishBusyUntil = 0;
        if (baibaiPendingSpeak) {
          clearTimeout(baibaiVoiceTimer);
          baibaiVoiceTimer = setTimeout(baibaiPendingSpeak, 120);
        }
        if (onEnd) onEnd();
      };
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
    u.onend = () => {
      englishBusyUntil = 0;
      if (baibaiPendingSpeak) {
        clearTimeout(baibaiVoiceTimer);
        baibaiVoiceTimer = setTimeout(baibaiPendingSpeak, 120);
      }
      if (onEnd) onEnd();
    };
    u.onerror = e => {
      englishBusyUntil = 0;
      if (e && e.error !== "interrupted" && e.error !== "canceled") ttsFail();
      if (onEnd) onEnd();
    };
    /* cancel() 之后立刻 speak 在 iOS 上常常不出声，隔一帧更稳 */
    setTimeout(() => {
      try { speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) { ttsFail(); if (onEnd) onEnd(); }
    }, 50);
  } catch (e) { ttsFail(); if (onEnd) onEnd(); }
}

/* 白白专属中文“小奶狗声线”。
 * 英语学习音频是主声道：若正在读单词/句子，白白会乖乖等它读完再说，绝不叠音。
 * 系统没有儿童声时，用中文女声 + 较高音调和轻快语速模拟幼犬般软糯的声音。 */
function baibaiLine(text) {
  const s = String(text || "").trim();
  return (s.includes("：") ? s.slice(s.indexOf("：") + 1) : s.replace(/^白白[：:]?\s*/, "")).trim();
}
function puppyHello() {
  if (S.sound === false) return;
  tone(780, .055, "sine", 0, .025);
  tone(1040, .075, "sine", .055, .022);
}
function baibaiSpeak(text, delay) {
  const line = baibaiLine(text);
  if (!line || !("speechSynthesis" in window)) return;
  const gen = ++baibaiVoiceGen;
  clearTimeout(baibaiVoiceTimer);
  const trySpeak = () => {
    if (gen !== baibaiVoiceGen) return;
    const wait = englishBusyUntil - Date.now();
    if (wait > 0) { baibaiVoiceTimer = setTimeout(trySpeak, wait + 120); return; }
    try {
      baibaiPendingSpeak = null;
      if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
      if (!zhPetVoice) pickVoice();
      puppyHello();
      const u = new SpeechSynthesisUtterance(line);
      u.lang = "zh-CN"; u.rate = 1.08; u.pitch = 1.55; u.volume = 0.92;
      if (zhPetVoice) u.voice = zhPetVoice;
      baibaiVoiceTimer = setTimeout(() => {
        if (gen !== baibaiVoiceGen) return;
        try { speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) {}
      }, 120);
    } catch (e) {}
  };
  baibaiPendingSpeak = trySpeak;
  baibaiVoiceTimer = setTimeout(trySpeak, delay == null ? 120 : delay);
}
/* 立刻闭嘴：停 mp3、停系统TTS，并作废所有等待中的"读完再继续"回调
 * （离开游戏后声音还在读、题目还在后台推进，就是漏了这一步）
 */
let speakGen = 0;
function stopSpeak() {
  speakGen++;
  baibaiVoiceGen++; clearTimeout(baibaiVoiceTimer); baibaiPendingSpeak = null; englishBusyUntil = 0;
  try { if (AUD) { AUD.onended = null; AUD.pause(); } } catch (e) {}
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
}

/* 读完这句再往下走：等音频真正结束（带兜底超时，避免卡死） */
function speakThen(text, rate, cb, pauseMs) {
  const gen = speakGen;
  let fired = false;
  const go = () => {
    if (fired) return;
    fired = true;
    clearTimeout(guard);
    if (gen !== speakGen) return;      // 期间已离开页面 → 不再推进题目
    setTimeout(() => { if (gen === speakGen) cb(); }, pauseMs === undefined ? 500 : pauseMs);
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
function sndRight() { tone(660, .12); tone(880, .18, "sine", .1); showBaibaiReaction("right"); }
function sndWrong() { tone(200, .25, "sawtooth", 0, .08); showBaibaiReaction("try"); }
function sndCoin() { tone(988, .1, "square", 0, .06); tone(1319, .2, "square", .08, .06); }
function sndWin() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, "sine", i * .12)); showBaibaiReaction("win"); }

/* ---------------- 反馈特效 ---------------- */
let toastTimer = null;
function toast(msg, ms) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms || 1600);
}
let baibaiReactionTimer = null;
function showBaibaiReaction(kind, message) {
  if (!document.body || !S || !S.pet) return;
  const old = document.getElementById("baibaiReaction");
  if (old) old.remove();
  const lines = kind === "try"
    ? ["没关系，我们发现了一个新线索！", "再试一次，我陪着你。", "答错也在变聪明，慢慢来～"]
    : kind === "win"
      ? ["完成啦！我们配合得真棒！", "今天又向前走了一步！", "白白一直知道你能做到！"]
      : ["答对啦！", "就是这样！", "好厉害，我都记住了！"];
  const d = document.createElement("div");
  d.id = "baibaiReaction"; d.className = "baibaiReaction " + kind;
  const line = message || lines[Math.floor(Math.random() * lines.length)];
  d.innerHTML = `${petFigure(62)}<span>🔊 ${esc(line)}</span>`;
  document.body.appendChild(d);
  baibaiSpeak(line);
  clearTimeout(baibaiReactionTimer);
  baibaiReactionTimer = setTimeout(() => d.remove(), 1800);
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

/* ---------------- 核心伙伴白白 / 喂养 / 装扮 ----------------
 * 设计红线：状态只会「变淡」，绝不会生病、死掉、扣分。
 * 养宠物是为了让她想回来，不是为了制造愧疚和焦虑。
 */
function petDef() { return PETS[0]; }
function petStages() { return petDef().stages; }
function petStage(xp) { let st = petStages()[0]; petStages().forEach(p => { if (xp >= p.xp) st = p; }); return st; }
function petNext(xp) { return petStages().find(p => p.xp > xp) || null; }
function petName() { return "白白"; }

/* 每天状态自然回落一点（不惩罚，只是"它有点想你了"） */
function decayCare() {
  const p = S.pet;
  if (!p.careDay) p.careDay = todayStr();
  const days = Math.max(0, Math.round((new Date(todayStr()) - new Date(p.careDay)) / 864e5));
  if (days > 0) {
    const d = Math.min(days, 5) * 12;                 // 最多掉 5 天的量，不会归零到"惨"
    p.hunger = Math.max(20, (p.hunger ?? 80) - d);    // 地板 20：永远不会"饿死"
    p.clean = Math.max(20, (p.clean ?? 80) - d);
    p.mood = Math.max(20, (p.mood ?? 80) - d);
    p.careDay = todayStr();
    save();
  }
}
function careAvg() { const p = S.pet; return Math.round(((p.hunger ?? 80) + (p.clean ?? 80) + (p.mood ?? 80)) / 3); }
function careMood() {
  const a = careAvg();
  if (a >= 85) return { e: "🥰", t: "超级开心" };
  if (a >= 65) return { e: "😊", t: "心情不错" };
  if (a >= 45) return { e: "🙂", t: "还行吧" };
  return { e: "🥺", t: "有点想你了" };
}
/* 亲密度等级：1~5 心 */
function bondLv() { const b = S.pet.bond || 0; return Math.min(5, Math.floor(b / 60) + (b > 0 ? 1 : 0)); }
function outfitOf(id) { return OUTFITS.find(x => x.id === id); }
function wornOutfits() { return (S.pet.worn || []).map(outfitOf).filter(Boolean); }

/* 旧版本的本机图片仍留在存档中，但白白上线后不再显示或上传。 */
function petPic(id) { return (S.pet.pics || {})[id || S.pet.id] || ""; }
function petVisual() { return "assets/baibai-base.png"; }

function petCheer() {
  const d = taskDone();
  if (d.t1 && d.t2 && d.t3 && d.t4) return "白白：今天的魔法收集完成！现在放心去玩吧～";
  if (S.daily.ph) return "白白：你已经跨过最难的开头啦，再走一小步！";
  if (S.daily.g) return "白白：刚才那局很有勇气，答错也算发现了线索！";
  if (S.daily.w || S.daily.r) return "白白：我看到你认真试过了，这就很了不起！";
  return "白白：不用一下子全会，我们先玩一小关吧！";
}

/* 每件装扮都拥有独立坐标，不再受「帽子/脸/手」三个固定槽位限制。 */
function decoDefault(id) {
  const o = outfitOf(id);
  return Object.assign({ x: 50, y: 50, s: 1, r: 0 }, o && o.pos || {});
}
function decoOf(id) {
  const d = ((S.pet.deco || {}).baibai || {})[id];
  return Object.assign({}, decoDefault(id), d || {});
}
function setDeco(id, v) {
  if (!S.pet.deco) S.pet.deco = {};
  if (!S.pet.deco.baibai) S.pet.deco.baibai = {};
  S.pet.deco.baibai[id] = v;
  save();
}
function decoSizePx(canvasSize, d, o) { return Math.round(canvasSize * ((o && o.base) || .30) * d.s); }
function outfitVisual(o, cls) {
  const hue = Math.max(0, Math.min(360, Number(o.hue) || 0));
  return o.art
    ? `<img class="${cls || "outfitArt"}" src="${o.art}" alt="${esc(o.n)}"${hue ? ` style="filter:hue-rotate(${hue}deg)"` : ""}>`
    : `<span class="${cls || "outfitEmoji"}">${o.e}</span>`;
}
function stickerVisual(s, cls) {
  return s.art
    ? `<img class="${cls || "stickerArt"}" src="${s.art}" alt="${esc(s.n)}">`
    : `<span>${s.e}</span>`;
}
/* 白白的完整形象：裸狗底图 + 所有已保存装扮；任何页面调用都会得到最新造型。 */
function petFigure(size, withOutfit) {
  const sz = size || 110;
  const body = `<img class="petImg" src="${petVisual()}" alt="白白" style="position:relative;z-index:2">`;
  const deco = withOutfit === false ? "" : wornOutfits().map(o => {
    const d = decoOf(o.id), z = o.group === "body" ? 1 : 3;
    const sizing = o.art ? `width:${decoSizePx(sz, d, o)}px` : `font-size:${decoSizePx(sz, d, o)}px`;
    return `<span class="petDeco deco-${o.cat}" data-outfit="${o.id}" style="z-index:${z};left:${d.x}%;top:${d.y}%;${sizing};transform:translate(-50%,-50%) rotate(${d.r}deg)">${outfitVisual(o)}</span>`;
  }).join("");
  return `<div class="petFig" style="width:${sz}px;height:${sz}px">${body}${deco}</div>`;
}
function addCoins(n) {
  if (n <= 0) return;
  const before = petStage(S.xp).title || petStage(S.xp).n;
  S.coins += n; S.xp += n;
  ensureDaily(); S.daily.earn += n;
  if (S.daily.earn >= 60 && !S.daily.hard) { S.daily.hard = true; addTicket(1, "今日勤奋超额"); }
  save();
  $("#coinNum").textContent = S.coins;
  coinFly(n); sndCoin();
  const after = petStage(S.xp);
  const afterTitle = after.title || after.n;
  if (afterTitle !== before) { confetti(); sndWin(); toast("🎊 白白成为【" + afterTitle + "】啦！", 2600); }
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
/* 每日任务（按正确的先后顺序）：
 *   ① 复习（还债最优先）→ ② 学新词 → ③ 玩游戏 → ④ 自然拼读（每天一个关卡）
 * 拼读是「会拼就会写」的地基，所以设为必做项，不做就没有转盘。
 */
function taskDone() {
  const noReview = dueCount() === 0 && wrongCount() === 0;
  const d = D();
  return {
    /* ① 复习：做掉到期词/错词；今天本来就没有要复习的，玩1局也算完成 */
    t1: S.daily.r >= d.reviews || (noReview && S.daily.g >= 1),
    /* ② 学新词：解锁单元的新词全学完时，改为「复习也算数」，否则任务永远无法完成 */
    t2: S.daily.w >= d.newWords || (noFreshWords() && S.daily.g >= 2),
    /* ③ 玩游戏 */
    t3: S.daily.g >= d.games,
    /* ④ 自然拼读：每天至少完成 1 个拼读关卡 */
    t4: S.daily.ph >= 1
  };
}
function checkTasks() {
  const d = taskDone();
  ["t1", "t2", "t3", "t4"].forEach(k => {
    if (d[k] && !S.daily[k]) { S.daily[k] = true; addCoins(10); toast("✅ 完成每日任务，+10金币！"); }
  });
  if (d.t1 && d.t2 && d.t3 && d.t4 && !S.daily.bonus) {
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
/* 今日复习的词 = ① 昨天刚学的（必复习，遗忘曲线最陡的一天）
 *              ② 到期的（SRS 排程）
 *              ③ 之前学过的随机抽几个（防止老词悄悄流失）
 */
function yesterdayWords() {
  const y = yesterdayStr();
  return Object.keys(S.learnedAt).filter(w => S.learnedAt[w] === y && WORD_INDEX[w]).map(w => WORD_INDEX[w]);
}
function dueOnly() {
  const t = todayStr();
  return Object.keys(S.srs)
    .filter(w => S.srs[w].due <= t && WORD_INDEX[w])
    .sort((a, b) => (S.srs[a].due < S.srs[b].due ? -1 : 1))   // 逾期最久的排前面
    .map(w => WORD_INDEX[w]);
}
/* 随机补的老词：只从「今天以前」学过的里挑。
   刚学 2 分钟的词不该出现在「复习」里——那不是复习，那是重复。 */
function oldRandom(n, exclude) {
  if (n <= 0) return [];
  const t = todayStr();
  const ex = new Set(exclude.map(w => w.w));
  const pool = Object.keys(S.learnedAt)
    .filter(w => !ex.has(w) && WORD_INDEX[w] && S.learnedAt[w] < t)
    .map(w => WORD_INDEX[w]);
  return shuffle(pool).slice(0, n);
}
function dueWords() {
  const yd = yesterdayWords();                                   // ① 昨天刚学的：必复习
  const due = dueOnly().filter(w => !yd.some(y => y.w === w.w)); // ② SRS 到期的
  let list = yd.concat(due);
  if (list.length < 6) list = list.concat(oldRandom(6 - list.length, list));  // ③ 之前学过的随机补
  return list;
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
let navTabs = [];
let activeTab = "home";
const ROOT_TABS = { home: "home", map: "map", phonics: "phonics", arcade: "arcade", reward: "reward" };
function setActiveTab(tab) {
  if (!tab) return;
  activeTab = tab;
  document.querySelectorAll(".tab").forEach(x => x.classList.toggle("on", x.dataset.tab === tab));
}
function show(id, title) {
  if (ROOT_TABS[id]) setActiveTab(ROOT_TABS[id]);
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("on"));
  $("#scr-" + id).classList.add("on");
  $("#barTitle").textContent = title;
  $("#backBtn").style.visibility = navStack.length > 1 ? "visible" : "hidden";
  $("#screens").scrollTop = 0;
  if (navStack.length === 1) navTabs = [activeTab];
}
function go(render, tab) {
  navStack.push(render);
  navTabs.push(tab || activeTab);
  if (tab) setActiveTab(tab);
  render();
}
function goTab(render, tab) {
  navStack = [render];
  navTabs = [tab || activeTab];
  if (tab) setActiveTab(tab);
  render();
}
function goBack() {
  stopSpeak();                                              // 停掉正在播的发音
  clearTimer();
  if (echoCleanup) { echoCleanup(); echoCleanup = null; }   // 关掉麦克风
  if (navStack.length <= 1) return;
  navStack.pop(); navTabs.pop();
  setActiveTab(navTabs[navTabs.length - 1] || "home");
  navStack[navStack.length - 1]();
}
$("#backBtn").onclick = goBack;
document.querySelectorAll(".tab").forEach(t => {
  t.onclick = () => {
    clearTimer();
    if (echoCleanup) { echoCleanup(); echoCleanup = null; }
    stopSpeak();
    ({ home: () => goTab(renderHome, "home"), map: () => goTab(renderMap, "map"), phonics: () => goTab(renderPhonicsList, "phonics"), arcade: () => goTab(renderArcade, "arcade"), reward: () => goTab(renderReward, "reward") })[t.dataset.tab]();
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
/* 「继续闯关」默认跟着当前学期走（四上），而不是从二年级开始。
   低年级那几册是给暑假复习用的，在地图里随时可以点进去。 */
const LEARN_ORDER = ["四上", "四下", "三上", "三下", "二年级"];
function currentUnit() {
  /* 家长指定了学习重点（比如暑假复习三上）就跟着走 */
  const order = (S.focusBook && S.focusBook !== "auto")
    ? [S.focusBook].concat(LEARN_ORDER.filter(b => b !== S.focusBook))
    : LEARN_ORDER;
  for (const bk of order) {
    for (const u of UNITS.filter(x => x.book === bk)) {
      if (isUnlocked(u) && unitS(u.id).stars < 1) return u;
    }
  }
  return UNITS.find(u => isUnlocked(u)) || UNITS[0];
}
function unlockedWords() {
  let ws = [];
  UNITS.forEach(u => { if (isUnlocked(u)) ws = ws.concat(u.words); });
  return ws;
}
/* 她真正学过的词。游戏厅只能考这些——考没学过的词是纯粹的挫败。 */
function learnedWords() {
  const ws = [];
  UNITS.forEach(u => {
    const us = unitS(u.id);
    u.words.forEach(w => { if (us.learned.includes(w.w)) ws.push(w); });
  });
  return ws;
}
/* 游戏厅题库：优先用学过的词；学得太少时才退回本单元词（保证游戏能玩） */
function gamePool() {
  const lw = learnedWords();
  if (lw.length >= 6) return lw;
  const cu = currentUnit();
  return lw.length ? lw.concat(cu.words.filter(w => !lw.some(x => x.w === w.w))) : cu.words;
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
        ${petFigure(112)}
      </div>
      <div id="petStage">${esc(petName())}　${careMood().e}</div>
      <div id="petTip">${"❤️".repeat(bondLv())}${"🤍".repeat(5 - bondLv())}　${careMood().t}</div>
      ${petCheer() ? `<div class="petCheer">🔊 ${esc(petCheer())}</div>` : ""}

      <div class="careBars">
        ${[["hunger", "🍖 饱腹"], ["clean", "🛁 干净"], ["mood", "🎾 心情"]].map(([k, lb]) => {
          const v = S.pet[k] ?? 80;
          return `<div class="careRow"><span class="careLb">${lb}</span>
            <span class="careBarWrap"><span class="careBar ${v < 45 ? "low" : ""}" style="width:${v}%"></span></span></div>`;
        }).join("")}
      </div>
      <button class="btn small" id="goCare" style="margin-top:8px">${careAvg() < 65 ? "🍖 快去照顾它！" : "🏠 伙伴屋（喂食 / 洗澡 / 装扮）"}</button>

      <div class="xpbarWrap" style="margin-top:12px"><div class="xpbar" style="width:${pct}%"></div></div>
      <div id="xpText">${nx ? "距离白白成为【" + (nx.title || nx.n) + "】还差 " + (nx.xp - S.xp) + " 魔法值" : "白白已经是传奇伙伴啦！"}</div>
      <div id="rankChip">${df.rank}　<span style="font-weight:400;color:#c0a8d0">${rankTip}</span></div>
    </div>
    <div class="sectionTitle">📋 今日任务 · 按顺序做（全完成 +20🪙+🎟️）　<span style="font-weight:400;color:#c0a8d0;font-size:12px">点任一行直接开始</span></div>
    <div class="card">
      <div class="taskRow clickable ${d.t1 ? "done" : ""}" data-jump="review">
        <span class="tIcon">1️⃣</span>
        <span class="tName">📅 <b>先做今日复习</b>${dc ? "（有 " + dc + " 个词到期）" : ""}<span class="tHint">还债最优先——到期的词正要被忘掉</span></span>
        <span class="tProg">${(dc === 0 && wc === 0) ? "无需复习" : Math.min(S.daily.r, df.reviews) + "/" + df.reviews}</span>
      </div>
      <div class="taskRow clickable ${d.t2 ? "done" : ""}" data-jump="learn">
        <span class="tIcon">2️⃣</span>
        <span class="tName">📖 ${noFreshWords() ? "复习巩固（新词已学完）" : "学 " + df.newWords + " 个新单词"}<span class="tHint">现在学：${cu.book} ${cu.num}${S.focusBook && S.focusBook !== "auto" ? "（家长已指定）" : ""}</span></span>
        <span class="tProg">${noFreshWords() ? Math.min(S.daily.g, 2) + "/2" : Math.min(S.daily.w, df.newWords) + "/" + df.newWords}</span>
      </div>
      <div class="taskRow clickable ${d.t3 ? "done" : ""}" data-jump="game">
        <span class="tIcon">3️⃣</span>
        <span class="tName">🎮 玩 ${df.games} 局小游戏<span class="tHint">优先配对 / 听音选图</span></span>
        <span class="tProg">${Math.min(S.daily.g, df.games)}/${df.games}</span>
      </div>
      <div class="taskRow clickable ${d.t4 ? "done" : ""}" data-jump="phonics">
        <span class="tIcon">4️⃣</span>
        <span class="tName">🔮 <b>学一条自然拼读</b><span class="tHint">会拼就会写——这是地基，每天一条</span></span>
        <span class="tProg">${Math.min(S.daily.ph, 1)}/1</span>
      </div>
    </div>
    <div style="text-align:center;font-size:11px;color:#c0b0d0;margin:-4px 0 12px">四项全部完成，才能转今天的转盘 🎡</div>
    <button class="btn" id="homeGo">✨ 继续闯关：<b>${cu.book}</b> ${cu.num} ${cu.zh} →</button>
    <div style="height:12px"></div>
    <div class="card" style="display:flex;text-align:center;padding:12px">
      <div style="flex:1"><div style="font-size:19px;font-weight:800;color:#e8a33d">${mt.fresh}</div><div style="font-size:11px;color:#b8a8c8">刚学会</div></div>
      <div style="flex:1"><div style="font-size:19px;font-weight:800;color:#b98ff0">${mt.familiar}</div><div style="font-size:11px;color:#b8a8c8">越来越熟</div></div>
      <div style="flex:1"><div style="font-size:19px;font-weight:800;color:#7cc576">${mt.solid}</div><div style="font-size:11px;color:#b8a8c8">🏆 记牢了</div></div>
    </div>
    <div class="homeGrid">
      <div class="card" id="homeReview"><div class="hIcon">📕</div><div class="hName">错词本</div><div class="hSub">${wc ? wc + " 个词等你消灭" : "干干净净，真棒！"}</div></div>
      <div class="card" id="homeAlbum"><div class="hIcon">🐶</div><div class="hName">白白收藏册</div><div class="hSub">已收集 ${Object.keys(S.stickers).length}/${STICKERS.length}</div></div>
      <div class="card" id="homeWheel"><div class="hIcon">🎡</div><div class="hName">幸运大转盘</div><div class="hSub">${S.tickets ? "有 " + S.tickets + " 张转盘券！" : "完成任务赢转盘券"}</div></div>
      <div class="card" id="homeVoucher"><div class="hIcon">🎟️</div><div class="hName">我的奖励券</div><div class="hSub">${(() => { const p = S.vouchers.filter(v => !v.used).length; return p ? p + " 张待兑换" : "转转盘赢真奖励"; })()}</div></div>
    </div>
    ${renderCalendar()}`;
  /* 点白白：屏幕只显示中文，声音也走白白的中文小奶狗声线。 */
  $("#petShow").onclick = () => {
    const p = PRAISES[Math.floor(Math.random() * PRAISES.length)];
    const el = $("#petShow .petFig") || $("#petEmoji");
    if (el) { el.classList.remove("bounce"); void el.offsetWidth; el.classList.add("bounce"); }
    baibaiSpeak(p.zh); toast("白白：“" + p.zh + "”");
  };
  const cheer = $("#scr-home .petCheer");
  if (cheer) {
    cheer.title = "点一下听白白说";
    cheer.style.cursor = "pointer";
    cheer.onclick = () => baibaiSpeak(cheer.textContent);
  }
  /* 每一行任务都能直接点进对应模块（不用自己找） */
  $$("#scr-home .taskRow.clickable").forEach(r => {
    r.onclick = () => {
      const j = r.dataset.jump;
      if (j === "review") {
        if (dueCount() || wrongCount()) go(() => startDueReview());
        else toast("今天没有要复习的词，直接学新词吧！🌟");
      } else if (j === "learn") {
        go(() => renderUnit(currentUnit()));
      } else if (j === "game") {
        $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.tab === "arcade"));
        goTab(renderArcade);
      } else if (j === "phonics") {
        $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.tab === "phonics"));
        goTab(renderPhonicsList);
      }
    };
  });
  $("#homeGo").onclick = () => go(() => renderUnit(cu), "map");
  $("#homeReview").onclick = () => { if (wrongCount()) go(() => startReview()); else toast("错词本是空的，去玩游戏吧！"); };
  $("#homeAlbum").onclick = () => go(renderAlbum, "reward");
  $("#homeWheel").onclick = () => go(renderWheel, "reward");
  $("#homeVoucher").onclick = () => go(renderVoucher, "reward");
  $("#themeQuick").onclick = () => go(renderTheme, "reward");
  $("#goCare").onclick = () => go(renderCare);
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
const BOOKS = ["二年级", "三上", "三下", "四上", "四下"];
const BOOK_TIP = {
  "二年级": "低年级基础词（暑假复习用）",
  "三上": "三年级上册", "三下": "三年级下册",
  "四上": "四年级上册（现在学的）", "四下": "四年级下册"
};
function renderMap() {
  let html = `<div class="card" style="text-align:center;padding:10px;font-size:12px;color:#b8a8c8">
    共 ${UNITS.length} 个单元 · ${UNITS.reduce((a, u) => a + u.words.length, 0)} 个单词<br>
    <b style="color:#9b59b6">暑假想复习旧词？直接点「二年级 / 三上 / 三下」——每一册都是独立解锁的</b>
  </div>`;
  BOOKS.forEach(bk => {
    const us = UNITS.filter(u => u.book === bk);
    if (!us.length) return;
    const done = us.filter(u => unitS(u.id).stars >= 1).length;
    html += `<div class="bookLabel">—— 🌈 ${bk} ——<span style="display:block;font-size:11px;color:#c0a8d0;font-weight:400">${BOOK_TIP[bk]}　${done}/${us.length} 单元已通关</span></div>`;
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

/* ================= 单元页 =================
 * 只留三步：学 → 练 → 挑战。
 * 原来把 4 个游戏平铺在这里，和游戏厅看起来一模一样，孩子会困惑「该点哪个」。
 * 现在折叠成「本单元练习」：随机混合题型，题目只出本单元（集中练习，刚学完最有效）；
 * 游戏厅则是跨单元混合 + 优先出到期词（交错练习，抗遗忘）。
 */
function renderUnit(u) {
  const us = unitS(u.id);
  const stars = "★".repeat(us.stars) + "☆".repeat(3 - us.stars);
  const fresh = u.words.filter(w => !us.learned.includes(w.w)).length;
  const acts = [
    {
      icon: "📖", name: "学单词",
      sub: fresh ? `还有 ${fresh} 个新词没学（已学 ${us.learned.length}/${u.words.length}）` : `本单元 ${u.words.length} 个词都学过了，可温故知新`,
      fn: () => startLearn(u)
    },
    {
      icon: "🎯", name: "本单元练习",
      sub: "配对 / 听音 / 拼写 / 句子，随机来一局",
      fn: () => startUnitDrill(u)
    },
    {
      icon: "⭐", name: "单元挑战",
      sub: "拿到 ⭐ 解锁下一单元　当前：" + stars,
      fn: () => startBoss(u)
    }
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
      </div>`).join("")}
    <div style="font-size:11px;color:#c0b0d0;text-align:center;line-height:1.7;margin-top:4px">
      这里的题目<b>只出本单元</b>的内容，跟着学校进度走。<br>
      想混着复习学过的所有单元，去 🎮 游戏厅。
    </div>`;
  document.querySelectorAll("#scr-unit .actRow").forEach(c => {
    c.onclick = () => go(() => acts[+c.dataset.i].fn());
  });
  show("unit", u.zh);
}

/* 本单元练习：随机挑一种题型，题目只出本单元。
 * 随机而不是让孩子自己挑，是为了避免她永远只玩最轻松的配对、逃避拼写。 */
function startUnitDrill(u) {
  const us = unitS(u.id);
  const learned = u.words.filter(w => us.learned.includes(w.w));
  const pool = learned.length >= 4 ? learned : u.words;   // 学过的词优先，不够就用整个单元
  const kinds = [
    { n: "🔗 词语配对", f: () => startMatch(pool, u) },
    { n: "👂 听音选图", f: () => startListen(pool, u) },
    { n: "🔤 拼写工坊", f: () => startSpell(pool, u) },
    { n: "🚂 句子小火车", f: () => startSentence(u.sents, u) }
  ];
  const pick = kinds[Math.floor(Math.random() * kinds.length)];
  toast("本轮玩：" + pick.n, 1400);
  pick.f();
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
      /* 新手和4字母以内短词仍只挖1格；第二段起，较长单词同时挖2格。 */
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
  /* 左右交错排进同一个网格：同一行的两个框自动等高，不会左边矮右边高 */
  let cells = "";
  for (let i = 0; i < pairs.length; i++) {
    cells += `<button class="mItem mL" data-w="${esc(left[i].w)}"><span class="mw">${esc(left[i].w)}</span></button>`;
    cells += `<button class="mItem mR" data-w="${esc(rightC[i].w)}"><span class="me">${rightC[i].e}</span><span class="mz">${rightC[i].zh}</span></button>`;
  }
  $("#scr-play").innerHTML = `
    <div id="playHead"><div id="playProg">把单词和图片配成对！</div></div>
    <div class="matchGrid">${cells}</div>`;
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

/* ================= 游戏3：听句子选意思 ================= */
function startSentenceListen(sents) {
  if (!sents.length) { toast("先学一个有句型的单元，再来挑战吧～"); goBack(); return; }
  const qs = sample(sents, Math.min(D().opts === 3 ? 6 : 8, sents.length));
  let qi = 0, right = 0;
  function q() {
    if (qi >= qs.length) {
      bumpDaily("g");
      const stars = right === qs.length ? 3 : right >= qs.length - 2 ? 2 : 1;
      return renderResult({
        stars, title: right === qs.length ? "整句都听懂啦！" : "句子听力完成！",
        detail: `听懂 ${right}/${qs.length} 句`, coins: right * 3 + (right === qs.length ? 5 : 0),
        replay: () => startSentenceListen(sents)
      });
    }
    const sent = qs[qi];
    /* 中文相同的句子不能同时做选项，否则孩子明明听懂了也无法判断。 */
    const others = sample(sents.filter(s => s.en !== sent.en && s.zh !== sent.zh), D().opts - 1);
    const opts = shuffle([sent].concat(others));
    $("#scr-play").innerHTML = `
      <div id="playHead"><div id="playProg">第 ${qi + 1} / ${qs.length} 题</div></div>
      <div class="card" id="playQ">
        <button id="lcSpeak" style="margin-top:0">🔊</button>
        <div class="qSub">听完整句，选出它的中文意思</div>
      </div>
      <div class="optGrid">${opts.map((o, i) => `<button class="optBtn" data-i="${i}">${esc(o.zh)}</button>`).join("")}</div>`;
    speak(sent.en);
    $("#lcSpeak").onclick = () => speak(sent.en);
    let locked = false;
    document.querySelectorAll("#scr-play .optBtn").forEach(b => {
      b.onclick = () => {
        if (locked) return; locked = true;
        const picked = opts[+b.dataset.i];
        if (picked.en === sent.en) { b.classList.add("right"); sndRight(); right++; }
        else {
          b.classList.add("wrong"); sndWrong();
          document.querySelectorAll("#scr-play .optBtn").forEach(x => {
            if (opts[+x.dataset.i].en === sent.en) x.classList.add("right");
          });
        }
        setTimeout(() => { qi++; q(); }, 900);
      };
    });
    show("play", "🎧 听句子");
  }
  q();
}

/* ================= 游戏4：拼写工坊 ================= */
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

/* ================= 游戏5：句子小火车 ================= */
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
  if (!due.length) { toast("今天没有要复习的词，去学新单词吧！🌟", 2200); goBack(); return; }
  const ySet = new Set(yesterdayWords().map(w => w.w));
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
        <div id="playProg">📅 今日复习 ${qi + 1} / ${qs.length}　<span style="font-size:11px;color:${ySet.has(w.w) ? "#e8842d" : "#c0a8d0"}">${ySet.has(w.w) ? "昨天刚学的" : "以前学过的"}</span></div>
        <div style="font-size:11px;color:#c0a8d0">记忆等级 ${"●".repeat(lv)}${"○".repeat(SRS_MAX - lv)}　答对就更牢固一级</div>
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
  const pool = gamePool(), sents = unlockedSents();
  const learnedN = UNITS.reduce((a, u) => a + unitS(u.id).learned.length, 0);
  const stg = stageExamInfo(learnedN);
  const dc = dueCount();
  const games = [
    { icon: "📅", name: "今日复习", sub: dc ? "有 " + dc + " 个词到期了，趁还记得快复习！" : "今天没有到期的词，很棒！", fn: () => startDueReview() },
    { icon: "🎙️", name: "魔法回声（跟读）", sub: echoMode() === "sr" ? "对着手机大声读，自动给你打分" : echoMode() === "record" ? "录下自己的声音，和标准发音比一比" : "跟着标准发音大声读出来", fn: () => startEcho(unlockedSents().concat(ECHO_EXTRA)) },
    { icon: "🏆", name: "魔法大考", sub: learnedN < 8 ? "学会8个词后解锁" : "跨单元综合复习 · 最高 " + (S.bestExam || 0) + " 分", fn: () => startExam() },
    { icon: "🎓", name: "阶段测验", sub: learnedN < 20 ? `再学 ${20 - learnedN} 个词解锁第一阶段` : `第 ${stg.no} 阶段 · 25题综合卷 · 最高 ${stg.best || 0} 分`, fn: () => startStageExam() },
    { icon: "🔗", name: "词语配对", sub: "跨单元混合 · 单词和图片手拉手", fn: () => startMatch(priorityPick(pool, 20)) },
    { icon: "👂", name: "听音选图", sub: "跨单元混合 · 练出小小顺风耳", fn: () => startListen(priorityPick(pool, 20)) },
    { icon: "🎧", name: "听句子", sub: "听完整句 · 选出对应的中文意思", fn: () => startSentenceListen(sents) },
    { icon: "🔤", name: "拼写工坊", sub: "跨单元混合 · 字母积木拼拼拼", fn: () => startSpell(priorityPick(pool, 20)) },
    { icon: "🚂", name: "句子小火车", sub: "跨单元混合 · 重点句型排排队", fn: () => startSentence(sents) },
    { icon: "📕", name: "错词大扫除", sub: wrongCount() ? "还有 " + wrongCount() + " 个错词" : "错词本是空的", fn: () => startReview() }
  ];
  $("#scr-arcade").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">🎮 想玩什么随便挑！</div>
      <div style="font-size:12px;color:#b8a8c8;margin-top:2px">
        这里是<b>混合练习</b>：题目来自已学过的 ${UNITS.filter(isUnlocked).length} 个单元，<b>该复习的词和错词会优先出现</b>
      </div>
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

/* 转盘 = 终极奖励，一天只能转一次，而且必须「学完 + 复习完」才解锁。
 * 之前券的来源太多，转盘变成了随手能转的东西，稀释了它的分量。 */
function spunToday() { return S.daily.spun === true; }
function wheelReady() {
  const d = taskDone();
  return d.t1 && d.t2 && d.t3 && d.t4;   // 复习 + 学新词 + 玩游戏 + 自然拼读，四项全完成
}
function renderWheel() {
  const prizes = getWheel(), n = prizes.length, seg = 360 / n;
  const stops = prizes.map((p, i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(",");
  const d = taskDone();
  const ready = wheelReady(), spun = spunToday();
  const canSpin = ready && !spun && S.tickets >= 1;

  let btnTxt, hint;
  if (spun) { btnTxt = "今天已经转过啦，明天再来 🌙"; hint = "转盘每天只能转 <b>1 次</b>——这样它才珍贵。"; }
  else if (!ready) { btnTxt = "🔒 先完成今天的学习和复习"; hint = "转盘是<b>终极奖励</b>：把今天的三个任务全做完，才能转。"; }
  else if (S.tickets < 1) { btnTxt = "还没有转盘券"; hint = "完成今日任务就会得到转盘券。"; }
  else { btnTxt = "🎡 开始转！（今天的唯一一次）"; hint = "今天的学习和复习都完成了——<b>这一转是你应得的</b>。"; }

  $("#scr-wheel").innerHTML = `
    <div class="card" style="text-align:center;padding:16px 10px">
      <div style="font-size:16px;font-weight:800;color:#9b59b6">🎡 幸运大转盘</div>
      <div style="font-size:12px;color:#b8a8c8;margin-top:2px">每天一次的终极奖励 · 转到什么奖什么，爸爸妈妈说话算话！</div>
      <div id="wheelWrap">
        <div id="wheelPtr">🔻</div>
        <div id="wheel" style="background:conic-gradient(${stops})">
          ${prizes.map((p, i) => `<div class="wLabel" style="transform:rotate(${i * seg + seg / 2}deg)"><span>${esc(p)}</span></div>`).join("")}
        </div>
        <div id="wheelHub">🎀</div>
      </div>
      <div id="ticketChip">🎟️ 转盘券：${S.tickets} 张${spun ? "　（今天已转过）" : ""}</div>

      <div class="card" style="margin:8px 0;padding:10px;background:${ready ? "#eefae8" : "#fff6fb"}">
        <div style="font-size:12px;font-weight:700;color:${ready ? "#5a9a4a" : "#b08ac0"};margin-bottom:4px">
          ${ready ? "✅ 今天的任务全部完成，可以转啦！" : "🔒 完成下面三件事才能转："}
        </div>
        <div style="font-size:12px;color:#8a7a9a;text-align:left;line-height:1.9">
          ${d.t1 ? "✅" : "⬜"} <b>做完今天的复习</b><br>
          ${d.t2 ? "✅" : "⬜"} 学会今天的新单词<br>
          ${d.t3 ? "✅" : "⬜"} 完成今天的小游戏<br>
          ${d.t4 ? "✅" : "⬜"} <b>学一条自然拼读</b>
        </div>
      </div>

      <div id="wheelWon"></div>
      <button class="btn" id="spinBtn" ${canSpin ? "" : "disabled"}>${btnTxt}</button>
      <div style="font-size:11px;color:#c0b0d0;margin-top:8px;line-height:1.6">${hint}</div>
    </div>
    ${wheelStale() ? `<div class="card" style="background:#fff3d6;text-align:center;font-size:13px;color:#e8842d;font-weight:700">🎁 转盘奖品已经 ${wheelAgeDays()} 天没换新啦，快让爸爸妈妈上新奖品！</div>` : ""}`;
  if (canSpin) $("#spinBtn").onclick = doSpin;
  show("wheel", "🎡 幸运大转盘");
}

let wheelTurns = 0;
function doSpin() {
  if (spinning || S.tickets < 1 || !wheelReady() || spunToday()) return;
  spinning = true;
  S.tickets--;
  S.daily.spun = true;          // 每天只能转一次
  save();
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
    $("#ticketChip").textContent = "🎟️ 转盘券：" + S.tickets + " 张　（今天已转过）";
    const btn = $("#spinBtn");
    if (btn) { btn.disabled = true; btn.textContent = "今天已经转过啦，明天再来 🌙"; }
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
const PARENT_PIN = "223826";
let parentOK = false;
function renderParent() {
  if (!parentOK) {
    $("#scr-parent").innerHTML = `
      <div class="card" style="text-align:center;padding:24px 16px">
        <div style="font-size:34px">🔐</div>
        <div style="font-size:15px;font-weight:700;color:#9b59b6;margin:8px 0">家长验证</div>
        <div style="font-size:13px;color:#b8a8c8;margin-bottom:12px">请输入家长密码</div>
        <input class="pInput" id="pGate" type="password" inputmode="numeric" autocomplete="off"
               placeholder="● ● ● ● ● ●" maxlength="12"
               style="text-align:center;max-width:200px;letter-spacing:4px;font-size:18px">
        <div style="height:12px"></div>
        <button class="btn small" id="pGateBtn">进入</button>
        <div id="pGateMsg" style="font-size:12px;color:#c0a8d0;margin-top:10px">这里是爸爸妈妈的设置，小朋友先去玩吧～</div>
      </div>`;
    const tryIn = () => {
      if ($("#pGate").value.trim() === PARENT_PIN) { parentOK = true; sndCoin(); renderParent(); }
      else {
        sndWrong();
        $("#pGateMsg").textContent = "密码不对哦～";
        $("#pGate").value = "";
      }
    };
    $("#pGateBtn").onclick = tryIn;
    $("#pGate").onkeydown = e => { if (e.key === "Enter") tryIn(); };
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
      <div style="font-size:15px;font-weight:700;color:#9b59b6;margin-bottom:4px">📚 学习重点</div>
      <div style="font-size:12px;color:#b8a8c8;margin-bottom:8px">
        「学新词」任务会跳到这一册。<b>暑假想复习三年级，就选「三上」</b>；开学跟学校进度就用「自动」。<br>
        当前：<b style="color:#9b59b6">${currentUnit().book} ${currentUnit().num}</b>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${[["auto", "自动（跟学校）"], ["二年级", "二年级"], ["三上", "三上"], ["三下", "三下"], ["四上", "四上"], ["四下", "四下"]].map(([v, n]) =>
          `<button class="themeBtn ${String(S.focusBook || "auto") === v ? "cur" : "lock"}" data-focus="${v}">${n}</button>`).join("")}
      </div>
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
    <div class="card actRow" id="pMic">
      <span class="aIcon">🎙️</span>
      <span class="aName">跟读自检<span class="aSub">「魔法回声」用不了时点这里</span></span>
      <span class="aGo">▶</span>
    </div>
    <div style="font-size:11px;color:#c0b0d0;text-align:center">改完直接生效，孩子下次打开转盘就是新奖品</div>`;
  document.querySelectorAll("#scr-parent [data-focus]").forEach(b => {
    b.onclick = () => {
      S.focusBook = b.dataset.focus; save(); sndCoin();
      toast(b.dataset.focus === "auto" ? "已设为跟学校进度" : "学习重点已设为「" + b.dataset.focus + "」", 2200);
      renderParent();
    };
  });
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
  $("#pMic").onclick = () => go(renderMicCheck);
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
/* 拼读大挑战：从「学过的规则」里混合出题。
   8 条规则学完后，每天的拼读任务不至于空转——混合复习才是真本事。 */
function startPhonicMix() {
  const learned = PHONICS.filter(p => phS(p.id).learned);
  if (learned.length < 2) { toast("先学 2 条拼读规则，才能玩混合挑战～", 2200); goBack(); return; }
  const items = [];
  learned.forEach(p => p.words.forEach(w => items.push({ p, w })));
  const qs = sample(items, Math.min(8, items.length));
  let qi = 0, right = 0;
  function q() {
    if (qi >= qs.length) {
      bumpDaily("ph");
      const stars = right === qs.length ? 3 : right >= qs.length - 2 ? 2 : 1;
      return renderResult({
        stars,
        title: right === qs.length ? "拼读全对，真正的拼读魔法师！" : "拼读大挑战完成！",
        detail: `答对 ${right}/${qs.length}　混合了 ${learned.length} 条规则`,
        coins: right * 3 + (right === qs.length ? 8 : 0),
        replay: () => startPhonicMix()
      });
    }
    const { p, w } = qs[qi];
    const others = sample(PHONICS.filter(x => x.id !== p.id), D().opts - 1);
    const opts = shuffle([p].concat(others));
    $("#scr-play").innerHTML = `
      <div id="playHead"><div id="playProg">🔮 拼读大挑战 ${qi + 1} / ${qs.length}　已答对 ${right}</div></div>
      <div class="card" id="playQ">
        <button id="lcSpeak" style="margin-top:0">🔊</button>
        <div class="qText" style="letter-spacing:2px;font-size:22px">${esc(w.w)}</div>
        <div class="qSub">这个词属于哪个发音家族？</div>
      </div>
      <div class="optGrid">${opts.map((o, i) => `<button class="optBtn" data-i="${i}">
        <span style="font-size:20px;font-weight:800">${esc(o.label)}</span>
        <div style="font-size:13px;color:#b08ac0;font-weight:400">${esc(o.ipa)}</div>
      </button>`).join("")}</div>`;
    speak(w.w, 0.75);
    $("#lcSpeak").onclick = () => speak(w.w, 0.75);
    let locked = false;
    $$("#scr-play .optBtn").forEach(b => {
      b.onclick = () => {
        if (locked) return; locked = true;
        const o = opts[+b.dataset.i];
        if (o.id === p.id) { b.classList.add("right"); sndRight(); right++; logAnswer(true); speak(w.w, 0.75); }
        else {
          b.classList.add("wrong"); sndWrong(); logAnswer(false);
          $$("#scr-play .optBtn").forEach(x => { if (opts[+x.dataset.i].id === p.id) x.classList.add("right"); });
          toast(w.w + " → " + p.label + " " + p.ipa, 1800);
        }
        setTimeout(() => { qi++; q(); }, 1000);
      };
    });
    show("play", "🔮 拼读大挑战");
  }
  q();
}

function renderPhonicsList() {
  const learnedN = PHONICS.filter(p => phS(p.id).learned).length;
  const doneToday = S.daily.ph >= 1;
  $("#scr-phonics").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">🔮 拼读魔法学院</div>
      <div style="font-size:12px;color:#b8a8c8;margin-top:2px">学会拼读规则，看到生词也能自己念出来！</div>
      <div style="font-size:12px;margin-top:6px;color:${doneToday ? "#7cc576" : "#e8842d"};font-weight:700">
        ${doneToday ? "✅ 今天的拼读任务已完成" : "⬜ 今天还没做拼读（每天 1 条，转盘要用）"}
      </div>
    </div>
    ${learnedN >= 2 ? `<div class="card actRow" id="phMix" style="background:linear-gradient(135deg,#fff3d6,#ffe0ef)">
      <span class="aIcon">🎯</span>
      <span class="aName">拼读大挑战<span class="aSub">把学过的 ${learnedN} 条规则混在一起考 · 也算每日拼读任务</span></span>
      <span class="aGo">▶</span>
    </div>` : ""}
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
  const mix = $("#phMix");
  if (mix) mix.onclick = () => go(startPhonicMix);
  document.querySelectorAll("#scr-phonics .actRow[data-pid]").forEach(c => {
    c.onclick = () => go(() => renderPhonicRule(PHONICS.find(p => p.id === c.dataset.pid)));
  });
  show("phonics", "🔮 拼读魔法学院");
}

/* 把单词按「音节」切块，并给规则字母上色：
 *   规则字母（如 a-e 里的 a）→ 红色加粗（这就是发音的关键）
 *   魔法 e（不发音的那个 e）→ 灰色 + 删除线（一眼看出它不发音）
 *   其余字母 → 普通色
 */
function colorWord(w, p) {
  const word = w.w;
  const low = word.toLowerCase();
  const re = new RegExp(p.re);
  const m = low.match(re);
  const marks = new Array(word.length).fill(0);   // 0普通 1规则字母 2不发音的e
  if (m) {
    const start = m.index, whole = m[0], keep = typeof m[1] === "string" ? m[1] : "";
    for (let i = start; i < start + whole.length; i++) marks[i] = 1;
    if (keep) {   // 魔法e规则：中间的辅音不是规则字母
      const kStart = low.indexOf(keep, start);
      for (let i = kStart; i < kStart + keep.length; i++) marks[i] = 0;
      marks[start + whole.length - 1] = 2;        // 结尾那个 e 不发音
    }
  }
  const syl = w.syl && w.syl.length ? w.syl : [word];
  let idx = 0;
  return syl.map(s => {
    let html = "";
    for (const ch of s) {
      const cls = marks[idx] === 1 ? "phKey" : marks[idx] === 2 ? "phMute" : "";
      html += `<span class="${cls}">${esc(ch)}</span>`;
      idx++;
    }
    return `<span class="sylBlock">${html}</span>`;
  }).join('<span class="sylDot">·</span>');
}

function renderPhonicRule(p) {
  $("#scr-phonic").innerHTML = `
    <div class="card" style="text-align:center">
      <div style="font-size:44px">${p.icon}</div>
      <div style="font-size:30px;font-weight:800;color:#6a4a8a;letter-spacing:2px">${esc(p.label)}</div>
      <div style="font-size:20px;color:#b98ff0;font-weight:700">${esc(p.ipa)}</div>
      <div style="font-size:13px;color:#7a5a9a;margin-top:8px;line-height:1.6;text-align:left;background:#fff6fb;border-radius:14px;padding:10px">💡 ${p.tip}</div>
      <div class="phLegend">
        <span><b class="phKey">红色</b> = 发这个音的字母</span>
        <span><b class="phMute">灰色</b> = 不发音</span>
        <span><b style="color:#b98ff0">·</b> = 音节分界</span>
      </div>
    </div>
    <div class="sectionTitle">🔊 点一点，听听这些词的共同点</div>
    <div id="phWords">
      ${p.words.map((w, i) => `
        <div class="phRow" data-i="${i}">
          <span class="phEmoji">${w.e}</span>
          <span class="phMid">
            <span class="phWord">${colorWord(w, p)}</span>
            <span class="phIpa">${esc(w.ipa || "")}</span>
            <span class="phZh">${w.zh}</span>
          </span>
          <span class="phSpeak">🔊</span>
        </div>`).join("")}
    </div>
    <div style="height:14px"></div>
    <button class="btn" id="phGo">🎯 挑战拼读关卡</button>`;
  document.querySelectorAll("#phWords .phRow").forEach(b => {
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
      /* 拼读只计入「拼读」任务，不计入「玩游戏」——
         否则做3次拼读就凑满了游戏任务，单词游戏可以完全不碰 */
      bumpDaily("ph");
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
/* iPhone「添加到主屏幕」后从桌面图标打开时，苹果常常不给麦克风权限 */
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const IS_STANDALONE = !!(window.navigator.standalone || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches));
const IS_WECHAT = /MicroMessenger/i.test(navigator.userAgent);
function echoMode() { return SR ? "sr" : CAN_RECORD ? "record" : "shadow"; }
/* 麦克风失败的原因翻译成人话 */
function micWhy(err) {
  const n = err && (err.name || err.message) || "";
  if (/NotAllowed|Permission|SecurityError/i.test(n)) {
    return IS_STANDALONE
      ? "从桌面图标打开时，手机不允许用麦克风。<b>请改用 Safari / Chrome 打开网址</b>再玩跟读。"
      : "麦克风权限被拒绝了。请在弹窗里点「允许」；如果没弹窗，去手机<b>设置 → 浏览器 → 麦克风</b>里打开权限。";
  }
  if (/NotFound|DevicesNotFound/i.test(n)) return "没找到麦克风设备。";
  if (/NotReadable|TrackStart/i.test(n)) return "麦克风被别的 App 占用了，先关掉微信语音、录音机之类的再试。";
  if (IS_WECHAT) return "微信内置浏览器通常不给麦克风权限，<b>请点右上角「···」→「在浏览器中打开」</b>。";
  return "麦克风打不开（" + esc(String(n) || "未知原因") + "）。";
}

let echoCleanup = null;   // 离开页面时要关掉麦克风
function startEcho(items) {
  let mode = echoMode();   // 可降级：麦克风一旦失败就切到 shadow，绝不让孩子卡死
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
    /* 录音/识别不可用时，明确告诉孩子还能怎么练，而不是一句"不支持"了事 */
    if (mode === "shadow" && !CAN_RECORD) {
      $("#echoState").innerHTML = IS_WECHAT
        ? '微信里用不了麦克风。<b>可以先听完大声跟读</b>；想要录音对比，点右上角「···」→「在浏览器中打开」。'
        : '这台设备用不了麦克风。<b>听完大声跟读一样有效！</b>';
    }

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
        /* 录不了音就立刻降级成影子跟读，保证还能继续练，绝不卡死在这一屏 */
        sndWrong();
        mode = "shadow";
        $("#echoState").innerHTML = micWhy(e) + '<br><b style="color:#7cc576">没关系，先用「听 → 大声跟读」的方式练也一样有效！</b>';
        renderShadow(it);
        return;
      }
      const chunks = [];
      try {
        mediaRec = new MediaRecorder(stream);
      } catch (e) {
        try { stream.getTracks().forEach(t => t.stop()); } catch (e2) {}
        stream = null;
        mode = "shadow";
        $("#echoState").innerHTML = '这个浏览器录不了音。<b style="color:#7cc576">直接听完大声跟读，一样有效！</b>';
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

/* ================= 阶段测验（25题、无倒计时、首次通过大奖励） ================= */
const STAGE_MARKS = [20, 50, 90, 140, 200];
function stageExamInfo(n) {
  const learned = n == null ? learnedWords().length : n;
  let no = 0;
  STAGE_MARKS.forEach((m, i) => { if (learned >= m) no = i + 1; });
  const key = "s" + no, rec = S.stageExams[key] || {};
  return { no, key, learned, next: STAGE_MARKS[no] || 0, best: rec.best || 0, passed: !!rec.passed };
}
function stageExamItems(pool, n) {
  const out = [];
  while (out.length < n) out.push(...shuffle(pool));
  return out.slice(0, n);
}
function awardStageCard() {
  const fresh = STICKERS.filter(s => !S.stickers[s.n]);
  if (!fresh.length) return "";
  const st = fresh[Math.floor(Math.random() * fresh.length)];
  S.stickers[st.n] = 1;
  checkStickerSets();
  return st.n;
}
function startStageExam() {
  const learned = learnedWords(), info = stageExamInfo(learned.length);
  if (!info.no) { toast("学会20个词，就能参加第一阶段测验啦！", 2400); goBack(); return; }
  const sents = unlockedSents();
  const wordQs = stageExamItems(learned, sents.length ? 20 : 25);
  const types = ["listen", "enzh", "zhen", "holes"];
  let qs = wordQs.map((w, i) => ({ kind: types[i % types.length], w }));
  if (sents.length) qs = qs.concat(stageExamItems(sents, 5).map(s => ({ kind: "sent", s })));
  qs = shuffle(qs);
  let qi = 0, right = 0;
  function q() {
    if (qi >= qs.length) return finish();
    const cur = qs[qi];
    let head = "", opts = [], answer = "", speakText = "";
    if (cur.kind === "sent") {
      const s = cur.s;
      opts = shuffle([s].concat(sample(sents.filter(x => x.en !== s.en), D().opts - 1)));
      answer = s.en; speakText = s.en;
      head = '<button id="lcSpeak" style="margin-top:0">🔊</button><div class="qSub">听完整句子，选出正确意思</div>';
    } else {
      const w = cur.w;
      opts = shuffle([w].concat(distract(learned, w.w)));
      answer = w.w;
      if (cur.kind === "listen") {
        speakText = w.w;
        head = '<button id="lcSpeak" style="margin-top:0">🔊</button><div class="qSub">听单词，选出正确意思</div>';
      } else if (cur.kind === "enzh") {
        head = '<div class="qText">' + esc(w.w) + '</div><div class="qSub">选出正确意思</div>';
      } else if (cur.kind === "zhen") {
        head = '<div class="qEmoji" style="font-size:56px">' + w.e + '</div><div class="qSub">' + w.zh + ' —— 选出英文</div>';
      } else {
        const letters = [...w.w].map((c, i) => /[a-z]/i.test(c) ? i : -1).filter(i => i >= 0);
        /* 阶段卷明确升级为双空；日常新手孵化仍按段位保留单空保护。 */
        const holes = sample(letters, Math.min(2, letters.length));
        const shown = [...w.w].map((c, i) => holes.includes(i) ? "▢" : c).join("");
        head = '<div class="qText stageHoles">' + esc(shown) + '</div><div class="qSub">双字母补空：选出完整拼写</div>';
      }
    }
    const labels = opts.map(o => cur.kind === "sent" ? esc(o.zh) : (cur.kind === "zhen" || cur.kind === "holes" ? esc(o.w) : '<span class="oEmoji">' + o.e + '</span>' + o.zh));
    $("#scr-play").innerHTML =
      '<div id="playHead"><div id="playProg">🎓 第 ' + info.no + ' 阶段 ' + (qi + 1) + ' / ' + qs.length + '　答对 ' + right + '</div></div>' +
      '<div class="card" id="playQ">' + head + '</div>' +
      '<div class="optGrid">' + labels.map((x, i) => '<button class="optBtn" data-i="' + i + '">' + x + '</button>').join("") + '</div>';
    if (speakText) { speak(speakText); $("#lcSpeak").onclick = () => speak(speakText); }
    let locked = false;
    $$("#scr-play .optBtn").forEach(b => b.onclick = () => {
      if (locked) return; locked = true;
      const o = opts[+b.dataset.i], got = cur.kind === "sent" ? o.en : o.w;
      if (got === answer) {
        b.classList.add("right"); right++; sndRight();
        if (cur.w) recordRight(cur.w.w);
      } else {
        b.classList.add("wrong"); sndWrong();
        if (cur.w) recordWrong(cur.w.w);
        $$("#scr-play .optBtn").forEach(x => {
          const z = opts[+x.dataset.i], v = cur.kind === "sent" ? z.en : z.w;
          if (v === answer) x.classList.add("right");
        });
      }
      setTimeout(() => { qi++; q(); }, 650);
    });
    show("play", "🎓 第 " + info.no + " 阶段测验");
  }
  function finish() {
    bumpDaily("g");
    const score = Math.round(right / qs.length * 100), passed = score >= 80;
    const rec = S.stageExams[info.key] || (S.stageExams[info.key] = {});
    const firstPass = passed && !rec.passed;
    rec.best = Math.max(rec.best || 0, score);
    if (firstPass) { rec.passed = true; rec.date = todayStr(); }
    let gift = "";
    if (firstPass) { addTicket(2, "第" + info.no + "阶段首次通过"); gift = awardStageCard(); }
    save();
    renderResult({
      stars: score >= 95 ? 3 : passed ? 2 : score >= 60 ? 1 : 0,
      title: passed ? "第 " + info.no + " 阶段通过！" : "已经完成整张卷子！",
      detail: "得分 " + score + " 分（" + right + "/" + qs.length + "）" + (firstPass ? "　🎁 首次通过：2张转盘券" + (gift ? " + 「" + gift + "」" : "") : ""),
      coins: right * 4 + (passed ? 25 : 10),
      replay: () => startStageExam()
    });
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
  try {
    /* 备份码里不放伙伴的图片：图片很大，会把备份码撑成几百KB无法复制。
       图片本来就是本机私有的，换手机重新选一次即可。 */
    const lite = JSON.parse(JSON.stringify(S));
    if (lite.pet) { lite.pet.pics = {}; }
    return btoa(unescape(encodeURIComponent(JSON.stringify(lite))));
  } catch (e) { return ""; }
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

/* ================= 跟读自检（麦克风） ================= */
function renderMicCheck() {
  const mode = echoMode();
  const modeName = { sr: "自动打分（最完整）", record: "录音对比", shadow: "影子跟读（无麦克风）" }[mode];
  const row = (k, v, ok) => `<div class="vRow"><span style="font-size:18px">${ok ? "✅" : "⚠️"}</span><span class="vName">${k}<span class="vDate">${v}</span></span></div>`;
  $("#scr-mic").innerHTML = `
    <div class="card">
      <div class="sectionTitle" style="margin:0 0 6px">🎙️ 跟读功能自检</div>
      ${row("当前模式", modeName, mode !== "shadow")}
      ${row("安全连接 (HTTPS)", location.protocol === "https:" ? "是" : "否 —— 麦克风只能在 https 下用", location.protocol === "https:")}
      ${row("浏览器能调用麦克风", (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ? "支持" : "不支持", !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia))}
      ${row("能录音 (MediaRecorder)", window.MediaRecorder ? "支持" : "不支持", !!window.MediaRecorder)}
      ${row("语音识别（自动打分）", SR ? "支持" : "不支持（iPhone 一律不支持，属正常）", !!SR)}
      ${row("打开方式", IS_WECHAT ? "微信内置浏览器（麦克风通常被禁）" : IS_STANDALONE ? "桌面图标 / 独立窗口（iPhone 常禁麦克风）" : "普通浏览器（最好）", !IS_WECHAT && !IS_STANDALONE)}
    </div>
    <div class="card" style="text-align:center">
      <button class="btn" id="micTest">🎙️ 点我测试麦克风</button>
      <div id="micMsg" style="font-size:12.5px;color:#b8a8c8;margin-top:10px;line-height:1.7">点一下，看看能不能拿到麦克风权限</div>
    </div>
    <div class="card" style="font-size:12px;color:#7a5a9a;line-height:1.9">
      <b style="color:#9b59b6">跟读用不了？按这个顺序试：</b><br>
      1️⃣ <b>不要从桌面图标打开</b>——iPhone 在"添加到主屏幕"的独立窗口里<b>不给麦克风权限</b>。请用 <b>Safari</b> 直接打开网址再玩跟读。<br>
      2️⃣ <b>不要在微信里打开</b>——微信内置浏览器禁麦克风。点右上角「···」→「在浏览器中打开」。<br>
      3️⃣ 弹出"是否允许使用麦克风"时点<b>「允许」</b>（如果之前点了"不允许"，去 设置 → Safari → 麦克风 里改回来）。<br>
      4️⃣ 关掉正在占用麦克风的 App（微信语音、录音机等）。<br><br>
      <b style="color:#9b59b6">实在不行也没关系：</b>影子跟读模式（听标准音 → 大声跟读 → 点"我读完啦"）<b>照样能练发音</b>，只是没有录音回放而已。
    </div>
    <div class="card" style="font-size:10px;color:#c0b0d0;word-break:break-all">
      设备信息（反馈问题时可以截图给开发者）：<br>${esc(navigator.userAgent)}
    </div>`;
  $("#micTest").onclick = async () => {
    const msg = $("#micMsg");
    msg.innerHTML = "正在请求麦克风权限……";
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      msg.innerHTML = '<b style="color:#e05a5a">这个浏览器不支持麦克风</b><br>' + micWhy({ name: "NotSupported" });
      sndWrong(); return;
    }
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      st.getTracks().forEach(t => t.stop());
      sndWin(); confettiSmall(8);
      msg.innerHTML = '<b style="color:#7cc576">✅ 麦克风可以用！跟读功能没问题。</b><br>如果游戏里还是不行，把 App 彻底关掉重开一次。';
    } catch (e) {
      sndWrong();
      msg.innerHTML = '<b style="color:#e05a5a">❌ 拿不到麦克风</b><br>' + micWhy(e) +
        '<br><span style="color:#c0b0d0;font-size:11px">错误码：' + esc(String(e && e.name || e)) + '</span>';
    }
  };
  show("mic", "🎙️ 跟读自检");
}

/* ================= 伙伴屋：喂养 / 装扮 / 换伙伴 =================
 * 三个作用：① 金币的日常出口（不然金币会通胀成废数字）
 *          ② 每天回来看它的理由
 *          ③ 装扮＝她自己的审美表达
 * 红线：绝不惩罚。状态只会变淡，不会生病、不会死、不扣任何东西。
 */
function renderCare() {
  decayCare();
  const st = petStage(S.xp), w = loadWallet();
  $("#scr-care").innerHTML = `
    <div class="card baibaiCareCard" style="text-align:center">
      <div class="petShow" id="carePet" style="margin-bottom:6px">${petFigure(150)}</div>
      <div style="font-size:19px;font-weight:800;color:#9b59b6">白白</div>
      <div style="font-size:12px;color:#b8a8c8">陪伴五年的伙伴 · ${st.title || "暖心伙伴"}　${careMood().e} ${careMood().t}</div>
      <div style="font-size:13px;margin-top:4px">${"❤️".repeat(bondLv())}${"🤍".repeat(5 - bondLv())}　<span style="font-size:11px;color:#c0a8d0">亲密度 ${S.pet.bond || 0}</span></div>
      <div id="careSay" class="careSay">🔊 白白歪着脑袋看你：今天想一起做什么？</div>
    </div>

    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">和白白互动 · 每次都会回应你</div>
      ${[["hunger", "🍖 饱腹"], ["clean", "🛁 干净"], ["mood", "🎾 心情"]].map(([k, lb]) => {
        const v = S.pet[k] ?? 80;
        return `<div class="careRow"><span class="careLb">${lb}</span>
          <span class="careBarWrap"><span class="careBar ${v < 45 ? "low" : ""}" style="width:${v}%"></span></span>
          <span style="font-size:11px;color:#c0a8d0;width:30px;text-align:right">${v}</span></div>`;
      }).join("")}
      <div class="careActions">
        ${CARE.map(c => `<button class="careAction careBtn" data-c="${c.id}" ${w.coins < c.cost ? "disabled" : ""}>
          <span>${c.e}</span><b>${c.n}</b><small>🪙${c.cost}</small>
        </button>`).join("")}
      </div>
      <div class="noPressure">白白不会生病、不会离开、不会扣分。照顾是你们的开心互动，不是任务。</div>
    </div>

    <div class="card actRow" id="toOutfit">
      <span class="aIcon">👗</span>
      <span class="aName">白白的梦幻衣橱<span class="aSub">宠物披风 / 帽子 / 发夹 / 项圈 / 耳饰 · 已有 ${(S.pet.outfits || []).filter(id => outfitOf(id)).length}/${OUTFITS.length}</span></span>
      <span class="aGo">▶</span>
    </div>`;

  $$("#scr-care .careBtn").forEach(b => {
    b.onclick = () => {
      const c = CARE.find(x => x.id === b.dataset.c);
      const wal = loadWallet();
      if (wal.coins < c.cost) { toast("金币不够啦，去学习赚金币！💪"); sndWrong(); return; }
      wal.coins -= c.cost; saveWallet(wal); S.coins = wal.coins;
      S.pet[c.up] = Math.min(100, (S.pet[c.up] ?? 80) + 25);
      S.pet.bond = (S.pet.bond || 0) + c.bond;
      save(); updateCoinBox();
      sndCoin(); confettiSmall(6);
      const p = $("#carePet");
      if (p) { p.classList.remove("bounce"); void p.offsetWidth; p.classList.add("bounce"); }
      $("#careSay").innerHTML = `<b>${c.fx}</b> ${esc(c.say)}`;
      showBaibaiReaction("right", c.say);
      setTimeout(() => renderCare(), 1800);
    };
  });
  $("#carePet").onclick = () => {
    const line = "今天想一起做什么呀？";
    baibaiSpeak(line); toast("白白：“" + line + "”");
  };
  $("#toOutfit").onclick = () => go(renderOutfit);
  show("care", "🏠 白白的小屋");
}

/* 装扮衣橱 */
function renderOutfit() {
  const owned = S.pet.outfits || [];
  const cats = [...new Set(OUTFITS.map(o => o.cat))];
  $("#scr-outfit").innerHTML = `
    <div class="card outfitHero" style="text-align:center">
      <div class="petShow">${petFigure(155)}</div>
      <div style="font-size:13px;color:#7a5a9a;margin-top:5px"><b>白白今天这样出发</b></div>
      <div style="font-size:11px;color:#b8a8c8;margin-top:3px">点装扮即可穿上/取下；穿好后每一件都能单独拖动</div>
      <div style="font-size:11px;color:#a27b45;margin-top:4px">🪙 在语文寻宝赚到的金币，也能在这里给白白买新衣服</div>
      <button class="btn small" id="toDecoEdit" style="margin-top:9px">🎯 调整每件装扮并保存</button>
    </div>
    ${cats.map(cat => `
      <div class="sectionTitle">${cat}</div>
      <div class="outfitGrid">
        ${OUTFITS.filter(o => o.cat === cat).map(o => {
          const has = owned.includes(o.id);
          const on = (S.pet.worn || []).includes(o.id);
          return `<div class="outfitCell ${has ? "" : "lock"} ${on ? "on" : ""}" data-o="${o.id}">
            <div class="oe">${outfitVisual(o)}</div>
            <div class="on2">${o.n}</div>
            <div class="oc">${has ? (on ? "已穿上 · 点此取下" : "点一下穿上") : o.cost ? "🪙" + o.cost : "免费"}</div>
          </div>`;
        }).join("")}
      </div>`).join("")}`;
  const dEdit = $("#toDecoEdit");
  if (dEdit) dEdit.onclick = () => go(renderDecoEdit);
  $$("#scr-outfit .outfitCell").forEach(c => {
    c.onclick = () => {
      const o = OUTFITS.find(x => x.id === c.dataset.o);
      const owned2 = S.pet.outfits || (S.pet.outfits = []);
      if (!owned2.includes(o.id)) {
        const wal = loadWallet();
        if (wal.coins < o.cost) { toast("还差 " + (o.cost - wal.coins) + " 金币～"); sndWrong(); return; }
        wal.coins -= o.cost; saveWallet(wal); S.coins = wal.coins;
        owned2.push(o.id); updateCoinBox(); confetti(); sndWin();
      }
      const worn = S.pet.worn || (S.pet.worn = []), on = worn.includes(o.id);
      if (on) S.pet.worn = worn.filter(id => id !== o.id);
      else {
        if (o.group) S.pet.worn = worn.filter(id => !outfitOf(id) || outfitOf(id).group !== o.group);
        S.pet.worn.push(o.id);
      }
      save(); sndCoin();
      toast(on ? "白白把「" + o.n + "」收回衣橱啦" : "✨ 白白穿上「" + o.n + "」啦！", 1800);
      renderOutfit();
    };
  });
  show("outfit", "👗 白白的衣橱");
}

/* 换伙伴 */
function renderSwapPet() {
  const owned = S.pet.owned || ["classic"];
  $("#scr-swap").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">🔄 选一个伙伴</div>
      <div style="font-size:12px;color:#b8a8c8;margin-top:2px">魔法值是共用的——换伙伴不会让你的进度倒退</div>
    </div>
    ${PETS.map(p => {
      const has = owned.includes(p.id);
      const cur = S.pet.id === p.id;
      const st = p.stages.reduce((a, x) => (S.xp >= x.xp ? x : a), p.stages[0]);
      return `<div class="card actRow" data-p="${p.id}">
        <span class="aIcon">${has && p.art ? `<img class="petChoiceImg" src="${p.art}" alt="">` : has ? st.e : "❓"}</span>
        <span class="aName">${p.n}<span class="aSub">${p.tag}${has ? "　·　现在是：" + st.n : ""}</span></span>
        <button class="themeBtn ${cur ? "cur" : has ? "" : "lock"}">${cur ? "使用中 ✓" : has ? "选它" : "🪙" + p.cost}</button>
      </div>`;
    }).join("")}
    <div style="font-size:11px;color:#c0b0d0;text-align:center;line-height:1.7;padding:6px">
      名字不喜欢？在伙伴屋点「✏️ 起名字」，想叫什么都行。
    </div>`;
  $$("#scr-swap .actRow").forEach(c => {
    c.onclick = () => {
      const p = PETS.find(x => x.id === c.dataset.p);
      const owned2 = S.pet.owned || (S.pet.owned = ["classic"]);
      if (S.pet.id === p.id) return;
      if (!owned2.includes(p.id)) {
        const wal = loadWallet();
        if (wal.coins < p.cost) { toast("还差 " + (p.cost - wal.coins) + " 金币～"); sndWrong(); return; }
        wal.coins -= p.cost; saveWallet(wal); S.coins = wal.coins;
        owned2.push(p.id);
        confetti(); sndWin(); updateCoinBox();
      }
      S.pet.id = p.id; S.pet.name = "";
      save(); sndCoin();
      toast("🎉 新伙伴上任！去给它起个名字吧～", 2400);
      renderSwapPet();
    };
  });
  show("swap", "🔄 换伙伴");
}

/* ================= 伙伴形象：家长上传自己的图 =================
 * 图片只存在这台手机的本地存储（localStorage），
 * 不会进 git 仓库、不会上传任何服务器、不会出现在备份码里。
 * 上传后点三下（头顶 / 脸 / 手），饰品就能精准贴在对的位置。
 */
const PIC_MAX = 360;          // 压到 360px，避免撑爆本地存储
function compressImage(file, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, PIC_MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const cx = cv.getContext("2d");
      cx.drawImage(img, 0, 0, w, h);
      let out = "";
      try { out = cv.toDataURL("image/png"); } catch (e) {}
      /* PNG 太大就退回 JPEG（会丢透明背景，但能存下） */
      if (!out || out.length > 500000) {
        const cv2 = document.createElement("canvas");
        cv2.width = w; cv2.height = h;
        const c2 = cv2.getContext("2d");
        c2.fillStyle = "#fff"; c2.fillRect(0, 0, w, h);
        c2.drawImage(img, 0, 0, w, h);
        out = cv2.toDataURL("image/jpeg", 0.85);
      }
      cb(out);
    };
    img.onerror = () => cb("");
    img.src = fr.result;
  };
  fr.onerror = () => cb("");
  fr.readAsDataURL(file);
}

function renderPetPics() {
  const pics = S.pet.pics || (S.pet.pics = {});
  $("#scr-pics").innerHTML = `
    <div class="card" style="font-size:12.5px;color:#7a5a9a;line-height:1.9">
      <b style="color:#9b59b6">🖼️ 给伙伴换成孩子喜欢的形象</b><br>
      从手机相册里选图（<b>你自己的图</b>），孩子看到的就是她认识的那个角色。<br>
      <span style="color:#b8a8c8">图片<b>只存在这台手机里</b>，不会上传到网上、不会进代码仓库、也不会出现在备份码里。换手机需要重新选一次。</span>
    </div>
    ${PETS.map(p => {
      const has = !!pics[p.id];
      const builtIn = p.art || "";
      return `<div class="card" style="padding:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="picPrev">${has ? `<img src="${pics[p.id]}" alt="">` : builtIn ? `<img src="${builtIn}" alt="">` : `<span style="font-size:30px">${p.stages[0].e}</span>`}</div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:700;color:#7a5a9a">${p.n}</div>
            <div style="font-size:11px;color:#b8a8c8">${has ? "已设置自定义形象" : builtIn ? "现在用的是内置原创形象" : "现在用的是默认表情"}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <label class="btn small ghost" style="cursor:pointer">
            📷 ${has ? "换一张" : "选图片"}
            <input type="file" accept="image/*" data-up="${p.id}" style="display:none">
          </label>
          ${has ? `<button class="btn small ghost" data-use="${p.id}">👀 用它并调装扮</button>
                   <button class="btn small ghost" data-del="${p.id}" style="color:#e05a5a">🗑️ 删除</button>` : ""}
        </div>
      </div>`;
    }).join("")}`;

  $$("#scr-pics [data-up]").forEach(inp => {
    inp.onchange = e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      toast("正在处理图片……");
      compressImage(f, dataUri => {
        if (!dataUri) { toast("这张图读不出来，换一张试试"); return; }
        try {
          S.pet.pics[inp.dataset.up] = dataUri;
          save();
        } catch (err) {
          delete S.pet.pics[inp.dataset.up];
          toast("图片太大了，本地存不下，换一张小一点的", 3000);
          return;
        }
        sndWin(); confetti(10);
        S.pet.id = inp.dataset.up;          // 换成这个伙伴，方便立刻看效果
        save();
        toast("🎉 形象已换好！戴上装扮后可以直接拖动调整位置", 3000);
        renderPetPics();
      });
    };
  });
  $$("#scr-pics [data-use]").forEach(b => b.onclick = () => {
    S.pet.id = b.dataset.use; save();
    go(renderDecoEdit);
  });
  $$("#scr-pics [data-del]").forEach(b => b.onclick = () => {
    delete S.pet.pics[b.dataset.del];
    if (S.pet.anchors) delete S.pet.anchors[b.dataset.del];
    save(); sndCoin(); toast("已删除，恢复默认表情");
    renderPetPics();
  });
  show("pics", "🖼️ 伙伴形象");
}

/* ================= 装扮编辑：直接拖 =================
 * 原来那套「点三下定坐标」太难点了（用户实测点不准），弃用。
 * 现在：手指按住饰品直接拖，选中后可以放大/缩小/旋转。所见即所得。
 */
function renderDecoEdit() {
  let worn = (S.pet.worn || []).filter(id => outfitOf(id));
  if (!worn.length) {
    $("#scr-anchor").innerHTML = `
      <div class="card" style="text-align:center;padding:26px 16px">
        <div class="petShow">${petFigure(150, false)}</div>
        <div style="font-size:15px;font-weight:700;color:#9b59b6;margin:8px 0">白白现在是清清爽爽的裸狗</div>
        <div style="font-size:13px;color:#b8a8c8;line-height:1.7">先去衣橱选一件宠物披风、帽子、发夹或项圈，<br>再回来把每一件拖到最合适的位置。</div>
        <div style="height:14px"></div>
        <button class="btn" id="deGo">👗 去白白的衣橱</button>
      </div>`;
    $("#deGo").onclick = () => { navStack = [renderOutfit]; renderOutfit(); };
    show("anchor", "🎯 调整装扮");
    return;
  }
  let sel = worn[0];
  const draft = {};
  worn.forEach(id => { draft[id] = Object.assign({}, decoOf(id)); });

  function draw() {
    const selected = outfitOf(sel);
    $("#scr-anchor").innerHTML = `
      <div class="card" style="text-align:center;padding:10px">
        <div style="font-size:13px;color:#7a5a9a;line-height:1.6">
          <b>按住任意装扮直接拖</b> · 每一件都能放大、缩小、旋转<br>
          <span style="font-size:11px;color:#b8a8c8">调整满意后点“保存造型”，首页和语文会一起换成最新的白白</span>
        </div>
      </div>
      <div class="card" style="padding:12px">
        <div class="decoStage" id="decoStage">
          <img src="${petVisual()}" alt="白白" draggable="false">
          ${worn.map(id => {
            const d = draft[id], o = outfitOf(id), z = o.group === "body" ? 1 : 3;
            return `<span class="decoItem ${id === sel ? "sel" : ""}" data-outfit="${id}"
              style="z-index:${z};left:${d.x}%;top:${d.y}%;transform:translate(-50%,-50%) rotate(${d.r}deg)">${outfitVisual(o)}</span>`;
          }).join("")}
        </div>
      </div>

      <div class="card" style="padding:12px">
        <div class="decoPickList">
          ${worn.map(id => `<button class="btn small ${id === sel ? "" : "ghost"}" data-pick="${id}">
            ${outfitVisual(outfitOf(id), "pickArt")} ${outfitOf(id).n}
          </button>`).join("")}
        </div>
        <div class="decoCtrl">
          <button class="decoBtn" data-act="small">➖<span>缩小</span></button>
          <button class="decoBtn" data-act="big">➕<span>放大</span></button>
          <button class="decoBtn" data-act="ccw">↺<span>左转</span></button>
          <button class="decoBtn" data-act="cw">↻<span>右转</span></button>
          <button class="decoBtn" data-act="reset">🔄<span>复位</span></button>
        </div>
        <div style="font-size:11px;color:#c0b0d0;text-align:center;margin-top:8px">
          当前：${selected.n}　大小 ${Math.round(draft[sel].s * 100)}%　角度 ${draft[sel].r}°
        </div>
        <button class="btn small ghost" id="deRemove" style="display:block;margin:10px auto 0;color:#d75f72">🧺 取下「${selected.n}」</button>
      </div>
      <button class="btn" id="deDone">✅ 保存造型，让白白这样陪我</button>`;

    /* 选中哪件饰品 */
    $$("#scr-anchor [data-pick]").forEach(b => b.onclick = () => { sel = b.dataset.pick; tone(700, .05); draw(); });

    /* 直接拖动 */
    const stage = $("#decoStage");
    /* 与首页共用同一套尺寸公式；编辑舞台和首页也都是正方形坐标系。 */
    const stageSize = stage.getBoundingClientRect().width || 300;
    $$("#scr-anchor .decoItem").forEach(el => {
      const o = outfitOf(el.dataset.outfit), px = decoSizePx(stageSize, draft[el.dataset.outfit], o) + "px";
      if (o.art) el.style.width = px; else el.style.fontSize = px;
    });
    $$("#scr-anchor .decoItem").forEach(el => {
      const id = el.dataset.outfit;
      let dragging = false;

      const moveTo = (cx, cy) => {
        const r = stage.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((cx - r.left) / r.width) * 100));
        const y = Math.max(0, Math.min(100, ((cy - r.top) / r.height) * 100));
        const d = draft[id];
        d.x = Math.round(x); d.y = Math.round(y);
        el.style.left = d.x + "%";
        el.style.top = d.y + "%";
      };
      const start = ev => {
        dragging = true; sel = id;
        $$("#scr-anchor .decoItem").forEach(x => x.classList.toggle("sel", x === el));
        ev.preventDefault();
      };
      const move = ev => {
        if (!dragging) return;
        const t = ev.touches ? ev.touches[0] : ev;
        moveTo(t.clientX, t.clientY);
        ev.preventDefault();
      };
      const end = () => { if (dragging) { dragging = false; tone(760, .05); draw(); } };

      el.onmousedown = start;
      el.ontouchstart = start;
      /* 监听整个舞台，手指拖出饰品范围也不会断 */
      stage.addEventListener("mousemove", move);
      stage.addEventListener("touchmove", move, { passive: false });
      stage.addEventListener("mouseup", end);
      stage.addEventListener("touchend", end);
      stage.addEventListener("mouseleave", end);
    });

    /* 放大 / 缩小 / 旋转 / 复位 */
    $$("#scr-anchor .decoBtn").forEach(b => {
      b.onclick = () => {
        const d = draft[sel];
        const a = b.dataset.act;
        if (a === "big") d.s = Math.min(3, +(d.s + 0.15).toFixed(2));
        else if (a === "small") d.s = Math.max(0.4, +(d.s - 0.15).toFixed(2));
        else if (a === "cw") d.r = (d.r + 15) % 360;
        else if (a === "ccw") d.r = (d.r - 15 + 360) % 360;
        else if (a === "reset") Object.assign(d, decoDefault(sel));
        tone(a === "reset" ? 500 : 800, .05);
        draw();
      };
    });

    /* 编辑页也能直接取下，不必返回衣橱寻找同一件。当前预览位置一起保存。 */
    $("#deRemove").onclick = () => {
      const removed = outfitOf(sel);
      if (!S.pet.deco) S.pet.deco = {};
      if (!S.pet.deco.baibai) S.pet.deco.baibai = {};
      worn.filter(id => id !== sel).forEach(id => { S.pet.deco.baibai[id] = Object.assign({}, draft[id]); });
      S.pet.worn = (S.pet.worn || []).filter(id => id !== sel);
      worn = worn.filter(id => id !== sel);
      save(); sndCoin();
      toast("白白把「" + removed.n + "」收回衣橱啦", 1800);
      if (!worn.length) { renderDecoEdit(); return; }
      sel = worn[0];
      draw();
    };

    $("#deDone").onclick = () => {
      if (!S.pet.deco) S.pet.deco = {};
      if (!S.pet.deco.baibai) S.pet.deco.baibai = {};
      worn.forEach(id => { S.pet.deco.baibai[id] = Object.assign({}, draft[id]); });
      save();
      sndWin(); confettiSmall(8);
      toast("🎉 白白的新造型保存好啦！语文那边也会同步", 2400);
      navStack = [renderOutfit]; renderOutfit();
    };
    show("anchor", "🎯 打扮白白");
  }
  draw();
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
  const fresh = STICKERS.filter(s => !S.stickers[s.n]);
  if ((S.gachaDup || 0) >= 4 && fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
  const r = Math.random() * 100;
  const rar = r < 6 ? 3 : r < 32 ? 2 : 1;
  const list = STICKERS.filter(s => s.r === rar);
  return list[Math.floor(Math.random() * list.length)];
}
function renderReward() {
  const got = Object.keys(S.stickers).length;
  const pend = S.vouchers.filter(v => !v.used).length;
  $("#scr-reward").innerHTML = `
    <div class="card" style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:linear-gradient(135deg,#fff7ef,#f6efff)">
      ${petFigure(78)}
      <div><div style="font-size:16px;font-weight:800;color:#8b5d9f">白白的礼物屋</div>
      <div style="font-size:12px;color:#a994bd;line-height:1.6">学习得到的每一份惊喜，都由白白陪你收好。</div></div>
    </div>
    <div class="card actRow" id="toWheel" style="background:linear-gradient(135deg,#fff3d6,#ffe0ef)">
      <span class="aIcon">🎡</span>
      <span class="aName">白白幸运大转盘<span class="aSub">转出真实奖励！转盘券：${S.tickets} 张${wheelStale() ? " · 🎁该上新奖品啦" : ""}</span></span>
      <span class="aGo">▶</span>
    </div>
    <div class="card actRow" id="toVoucher">
      <span class="aIcon">🎟️</span>
      <span class="aName">白白保管的奖励券<span class="aSub">${pend ? pend + " 张待兑换" : "转到的奖励由白白替你收好"}</span></span>
      <span class="aGo">▶</span>
    </div>
    <div class="card" id="gachaBox">
      <div id="gachaEgg">🥚</div>
      <div style="font-size:15px;font-weight:700;color:#9b59b6;margin-top:6px">白白百变扭蛋机</div>
      <div style="font-size:12px;color:#b8a8c8">每一颗都是白白的新姿势、新故事，集齐 ${STICKERS.length} 款！</div>
      <div id="gachaResult"></div>
      <button class="btn" id="gachaBtn">扭一次（🪙${GACHA_COST}）</button>
    </div>
    <div class="card actRow" id="toAlbum">
      <span class="aIcon">📔</span>
      <span class="aName">白白收藏册<span class="aSub">已收集 ${got}/${STICKERS.length}</span></span>
      <span class="aGo">▶</span>
    </div>
    <div class="card actRow" id="toTheme">
      <span class="aIcon">🎨</span>
      <span class="aName">白白的魔法背景<span class="aSub">已拥有 ${S.themesOwned.length}/${THEMES.length} 套乐园皮肤</span></span>
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
      S.gachaDup = dup ? (S.gachaDup || 0) + 1 : 0;
      S.stickers[st.n] = (S.stickers[st.n] || 0) + 1; save();
      if (st.r === 3) { confetti(); sndWin(); } else sndCoin();
      const rarTxt = st.r === 3 ? "✨传说✨" : st.r === 2 ? "稀有" : "普通";
      $("#gachaResult").innerHTML = `
        <div class="stickerCard r${st.r}">
          <div class="se">${stickerVisual(st)}</div>
          <div class="sn">${st.n} · ${rarTxt}</div>
          ${dup
            ? '<div style="font-size:11px;margin-top:2px">重复啦，返还5金币' + (S.gachaDup >= 4 ? ' · 下一颗保证新卡' : '') + '</div>'
            : '<div style="font-size:11px;margin-top:2px">🎊 新的白白收藏卡！去收藏册看大图吧</div>'}
        </div>`;
      if (dup) { S.coins += 5; save(); updateCoinBox(); }
      if (!dup) checkStickerSets();          // 可能刚好集齐某个稀有度 → 送转盘券
      $("#toAlbum .aSub").textContent = `已收集 ${Object.keys(S.stickers).length}/${STICKERS.length}`;
      btn.disabled = false;
    }, 900);
  };
  show("reward", "🎁 白白的礼物屋");
}

/* ================= 白白收藏册（每张都是同一只白白的不同造型） ================= */
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
  $("#scr-album").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">🐶 白白收藏册　${got} / ${STICKERS.length}</div>
      <div style="font-size:12px;color:#b8a8c8;line-height:1.6">这里只有白白，没有别的小狗。点亮的卡片可以打开看大图。</div>
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
        return `<div class="albumCell ${have ? "" : "no"} ${s.r === 3 ? "rr3" : ""}" data-i="${i}">
          <div class="ae">${stickerVisual(s)}</div>
          <div class="an">${have ? s.n + (S.stickers[s.n] > 1 ? " ×" + S.stickers[s.n] : "") : "？？？"}</div>
        </div>`;
      }).join("")}
    </div>`;
  document.querySelectorAll("#scr-album .albumCell").forEach(c => {
    c.onclick = () => {
      const s = STICKERS[+c.dataset.i];
      if (!S.stickers[s.n]) { toast("这张白白还没出现，去扭蛋机找找它吧！"); sndWrong(); return; }
      viewStickerCard(s);
    };
  });
  show("album", "🐶 白白收藏册");
}
function stickerOf(name) { return STICKERS.find(s => s.n === name) || { e: "", n: "" }; }

/* 收藏卡是完整造型，只负责欣赏与收集；可穿戴物统一去白白衣橱，避免身体上叠另一只狗。 */
function viewStickerCard(s) {
  const box = document.createElement("div");
  box.id = "decoPick";
  box.innerHTML = `
    <div class="decoCard">
      ${stickerVisual(s, "stickerPreview")}
      <div style="font-size:15px;font-weight:700;color:#7a5a9a;margin:4px 0 10px">${s.n}　<span style="font-size:12px;color:#b8a8c8">${RARITY[s.r]}</span></div>
      <div style="font-size:12px;color:#a994bd;margin:-3px 0 10px">这是陪你学习的白白，也是你的专属收藏。</div>
      <div style="height:8px"></div>
      <button class="btn small ghost" id="decoCancel">收好卡片</button>
    </div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.onclick = e => { if (e.target === box) close(); };
  $("#decoCancel").onclick = close;
}

/* ================= 启动 ================= */
migrateSRS();
migrateCheckins();
/* 老存档迁移：学习进度原样保留，伙伴统一切换为白白。 */
if (!S.pet || !S.pet.stages && !S.pet.id) S.pet = defState().pet;
if (!S.pet.wear) S.pet.wear = { hat: "", face: "", item: "" };
S.pet.id = "baibai"; S.pet.name = "白白"; S.pet.owned = ["baibai"];
if (!S.pet.outfits) S.pet.outfits = [];
if (!S.pet.worn) S.pet.worn = [];
decayCare();         // 状态随天数自然回落（只会变淡，绝不惩罚）
walletIn();          // 接入共享钱包（语文App赚的金币在这里也能花）
applyTheme();
updateCoinBox();
/* 从后台回到前台时重新读钱包：她可能刚在语文App里赚了金币 */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    const before = S.coins;
    walletIn();
    updateCoinBox();
    if (S.coins > before) {
      toast("🪙 语文那边赚的 " + (S.coins - before) + " 金币到账啦！", 2600);
      if ($("#scr-home").classList.contains("on")) renderHome();
    }
  }
});
/* 连续玩30分钟提醒休息眼睛 */
let restAt = Date.now();
setInterval(() => {
  if (Date.now() - restAt >= 30 * 60 * 1000) {
    restAt = Date.now();
    toast("👀 已经玩了30分钟啦，休息一下眼睛，看看远处再回来～", 4000);
  }
}, 60000);
navStack = [renderHome]; navTabs = ["home"];
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

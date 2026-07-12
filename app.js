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
    tickets: 0,   // 转盘券
    wheel: null,  // 家长自定义转盘奖品，null=用默认
    vouchers: [], // 转盘中的实物奖励券 {n, d, used}
    wheelTouched: todayStr() // 上次更换转盘奖品的日期，驱动14天上新提醒
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

/* ---------------- 语音 ---------------- */
let enVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  enVoice = vs.find(v => /female|samantha|karen|zira|aria|jenny/i.test(v.name)) || vs[0] || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, rate) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = rate || 0.8;
  if (enVoice) u.voice = enVoice;
  speechSynthesis.speak(u);
}

/* ---------------- 音效 ---------------- */
let AC = null;
function tone(freq, dur, type, when, vol) {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
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
  checkTasks();
}
function taskDone() {
  return {
    t1: S.daily.w >= 5,
    t2: S.daily.g >= 2,
    t3: S.daily.r >= 3 || (wrongCount() === 0 && S.daily.g >= 1)
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
    addCoins(20); confetti(); sndWin();
    setTimeout(() => toast("🔥 今日全部任务完成！奖励20金币，连续 " + S.streak + " 天！", 2800), 400);
    addTicket(1, "完成今日全部任务");
    if (S.streak > 0 && S.streak % 3 === 0) setTimeout(() => addTicket(1, "连续学习" + S.streak + "天"), 1600);
  }
  save();
}

/* ---------------- 错词本 ---------------- */
function recordWrong(w) { S.wrong[w] = (S.wrong[w] || 0) + 2; save(); }
function recordRight(w) {
  if (S.wrong[w]) { S.wrong[w]--; if (S.wrong[w] <= 0) delete S.wrong[w]; save(); }
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
  if (navStack.length > 1) navStack.pop();
  navStack[navStack.length - 1]();
}
$("#backBtn").onclick = goBack;
document.querySelectorAll(".tab").forEach(t => {
  t.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("on"));
    t.classList.add("on");
    ({ home: () => goTab(renderHome), map: () => goTab(renderMap), arcade: () => goTab(renderArcade), reward: () => goTab(renderReward) })[t.dataset.tab]();
  };
});

/* ---------------- 解锁逻辑 ---------------- */
function bookUnits(book) { return UNITS.filter(u => u.book === book); }
function isUnlocked(u) {
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
  $("#scr-home").innerHTML = `
    <div class="card" id="petCard">
      <div id="streakChip">🔥 连续 ${S.streak} 天</div>
      <div id="petEmoji">${st.e}</div>
      <div id="petStage">${st.n}</div>
      <div id="petTip">点我一下，给你惊喜～</div>
      <div class="xpbarWrap"><div class="xpbar" style="width:${pct}%"></div></div>
      <div id="xpText">${nx ? "距离进化【" + nx.n + "】还差 " + (nx.xp - S.xp) + " 魔法值" : "已经是最终形态啦！"}</div>
    </div>
    <div class="sectionTitle">📋 今日任务（全部完成 +20🪙）</div>
    <div class="card">
      <div class="taskRow ${d.t1 ? "done" : ""}"><span class="tIcon">📖</span><span class="tName">学会 5 个新单词</span><span class="tProg">${Math.min(S.daily.w, 5)}/5</span></div>
      <div class="taskRow ${d.t2 ? "done" : ""}"><span class="tIcon">🎮</span><span class="tName">完成 2 局小游戏</span><span class="tProg">${Math.min(S.daily.g, 2)}/2</span></div>
      <div class="taskRow ${d.t3 ? "done" : ""}"><span class="tIcon">📕</span><span class="tName">消灭 3 个错词</span><span class="tProg">${wc === 0 ? "无错词" : Math.min(S.daily.r, 3) + "/3"}</span></div>
    </div>
    <button class="btn" id="homeGo">✨ 继续闯关：${cu.num} ${cu.zh} →</button>
    <div style="height:12px"></div>
    <div class="homeGrid">
      <div class="card" id="homeReview"><div class="hIcon">📕</div><div class="hName">错词本</div><div class="hSub">${wc ? wc + " 个词等你消灭" : "干干净净，真棒！"}</div></div>
      <div class="card" id="homeAlbum"><div class="hIcon">📔</div><div class="hName">贴纸册</div><div class="hSub">已收集 ${Object.keys(S.stickers).length}/${STICKERS.length}</div></div>
      <div class="card" id="homeWheel"><div class="hIcon">🎡</div><div class="hName">幸运大转盘</div><div class="hSub">${S.tickets ? "有 " + S.tickets + " 张转盘券！" : "完成任务赢转盘券"}</div></div>
      <div class="card" id="homeVoucher"><div class="hIcon">🎟️</div><div class="hName">我的奖励券</div><div class="hSub">${(() => { const p = S.vouchers.filter(v => !v.used).length; return p ? p + " 张待兑换" : "转转盘赢真奖励"; })()}</div></div>
    </div>`;
  $("#petEmoji").onclick = () => {
    const p = PRAISES[Math.floor(Math.random() * PRAISES.length)];
    const el = $("#petEmoji"); el.classList.remove("bounce"); void el.offsetWidth; el.classList.add("bounce");
    speak(p.en, 0.9); toast(p.en + "  " + p.zh);
  };
  $("#homeGo").onclick = () => go(() => renderUnit(cu));
  $("#homeReview").onclick = () => { if (wrongCount()) go(() => startReview()); else toast("错词本是空的，去玩游戏吧！"); };
  $("#homeAlbum").onclick = () => go(renderAlbum);
  $("#homeWheel").onclick = () => go(renderWheel);
  $("#homeVoucher").onclick = () => go(renderVoucher);
  show("home", "魔法英语乐园");
  updateCoinBox();
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

/* ================= 学单词 ================= */
function startLearn(u) {
  const us = unitS(u.id);
  const fresh = u.words.filter(w => !us.learned.includes(w.w));
  const reviewMode = fresh.length === 0;
  const batch = reviewMode ? sample(u.words, 5) : fresh.slice(0, 5);
  let idx = 0;

  function card() {
    const w = batch[idx];
    $("#scr-learn").innerHTML = `
      <div id="learnProg">${reviewMode ? "🌟 温故知新" : "✨ 新单词"} ${idx + 1} / ${batch.length}</div>
      <div class="card" id="learnCard">
        <div id="lcEmoji">${w.e}</div>
        <div id="lcWord">${esc(w.w)}</div>
        <div id="lcZh">${w.zh}</div>
        <button id="lcSpeak">🔊</button>
      </div>
      <button class="btn" id="lcNext">${idx < batch.length - 1 ? "记住啦，下一个 →" : "都记住了，小测验！🎯"}</button>`;
    speak(w.w);
    $("#lcSpeak").onclick = () => speak(w.w);
    $("#lcNext").onclick = () => { idx++; idx < batch.length ? card() : quiz(); };
    show("learn", "📖 学单词");
  }

  function quiz() {
    let qi = 0, right = 0;
    function q() {
      if (qi >= batch.length) {
        batch.forEach(w => { if (!reviewMode && right > 0 && !us.learned.includes(w.w)) {} });
        return finishLearn();
      }
      const w = batch[qi];
      const opts = shuffle([w].concat(sample(u.words.filter(x => x.w !== w.w), 3)));
      $("#scr-learn").innerHTML = `
        <div id="learnProg">🎯 小测验 ${qi + 1} / ${batch.length}</div>
        <div class="card" id="playQ">
          <div class="qText">${esc(w.w)}</div>
          <div class="qSub">是什么意思呢？</div>
        </div>
        <div class="optGrid">${opts.map((o, i) => `<button class="optBtn" data-i="${i}"><span class="oEmoji">${o.e}</span>${o.zh}</button>`).join("")}</div>`;
      speak(w.w);
      let locked = false;
      document.querySelectorAll("#scr-learn .optBtn").forEach(b => {
        b.onclick = () => {
          if (locked) return; locked = true;
          const o = opts[+b.dataset.i];
          if (o.w === w.w) {
            b.classList.add("right"); sndRight(); right++;
            recordRight(w.w);
            if (!us.learned.includes(w.w)) { us.learned.push(w.w); bumpDaily("w"); }
            else if (reviewMode) bumpDaily("w");
            save();
          } else {
            b.classList.add("wrong"); sndWrong(); recordWrong(w.w);
            document.querySelectorAll("#scr-learn .optBtn").forEach(x => { if (opts[+x.dataset.i].w === w.w) x.classList.add("right"); });
          }
          setTimeout(() => { qi++; q(); }, 900);
        };
      });
      show("learn", "📖 学单词");
    }
    q();
    function finishLearn() {
      const coins = right * 2 + (right === batch.length ? 5 : 0);
      renderResult({
        stars: right === batch.length ? 3 : right >= 3 ? 2 : 1,
        title: right === batch.length ? "太厉害了，全对！" : "学完 " + batch.length + " 个单词！",
        detail: `答对 ${right}/${batch.length}`,
        coins, replay: () => startLearn(u)
      });
    }
  }
  card();
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
  const pairs = sample(pool, Math.min(5, pool.length));
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
  const qs = sample(pool, Math.min(8, pool.length));
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
    const opts = shuffle([w].concat(sample(pool.filter(x => x.w !== w.w), 3)));
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
  const cands = pool.filter(w => /^[a-zA-Z]+$/.test(w.w) && w.w.length >= 3 && w.w.length <= 9);
  const qs = sample(cands.length >= 5 ? cands : pool.filter(w => /^[a-zA-Z]+$/.test(w.w)), Math.min(5, cands.length || 3));
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
    const keys = shuffle(target.split("").concat(sample(extra, 3)));
    let typed = [];
    $("#scr-play").innerHTML = `
      <div id="playHead"><div id="playProg">第 ${qi + 1} / ${qs.length} 题</div></div>
      <div class="card" id="playQ" style="padding:14px">
        <div class="qEmoji" style="font-size:56px">${w.e}</div>
        <div class="qSub">${w.zh}　<button id="lcSpeak" style="width:44px;height:44px;font-size:20px;margin-top:0;vertical-align:middle">🔊</button></div>
        <div id="spellSlots">${target.split("").map(() => `<div class="slot"></div>`).join("")}</div>
      </div>
      <div id="spellKeys">
        ${keys.map((k, i) => `<button class="key" data-i="${i}">${k}</button>`).join("")}
        <button class="key" id="spellDel">⌫</button>
      </div>`;
    speak(w.w);
    $("#lcSpeak").onclick = () => speak(w.w);
    const slots = document.querySelectorAll("#scr-play .slot");
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
  const qs = sample(sents, Math.min(5, sents.length));
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
      if (built === s.en) {
        ansBox.classList.add("good"); sndRight(); right++; speak(s.en, 0.85);
        setTimeout(() => { qi++; q(); }, 1400);
      } else {
        ansBox.classList.add("bad"); sndWrong();
        toast("再想想～正确是：" + s.en, 2200); speak(s.en, 0.85);
        setTimeout(() => ansBox.classList.remove("bad"), 500);
        checkBtn.disabled = true;
        setTimeout(() => { qi++; q(); }, 2400);
      }
    };
    show("play", "🚂 句子小火车");
  }
  q();
}

/* ================= 单元挑战（Boss战） ================= */
function startBoss(u) {
  const n = 10;
  const types = shuffle(["enzh", "listen", "zhen", "enzh", "listen", "zhen", "enzh", "listen", "zhen", "enzh"]);
  const ws = shuffle(u.words);
  let qi = 0, right = 0;
  function q() {
    if (qi >= n) return finish();
    const w = ws[qi % ws.length], type = types[qi];
    const others = sample(u.words.filter(x => x.w !== w.w), 3);
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
    const stars = right >= 9 ? 3 : right >= 7 ? 2 : right >= 5 ? 1 : 0;
    const us = unitS(u.id);
    let bonus = 0;
    if (stars > us.stars) { bonus = (stars - us.stars) * 15; us.stars = stars; save(); }
    if (stars === 3 && !us.s3) { us.s3 = true; save(); addTicket(1, u.num + " 首次满星"); }
    const nextTip = stars >= 1 ? "🎉 下一单元已解锁！" : "答对5题以上才能拿星星，再试一次！";
    renderResult({
      stars, title: stars >= 3 ? "满星通关，超级学霸！" : stars >= 1 ? "挑战成功！" : "差一点点，别放弃！",
      detail: `答对 ${right}/${n}　${nextTip}`,
      coins: right * 2 + bonus,
      replay: () => startBoss(u)
    });
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
    const opts = shuffle([w].concat(sample(pool.filter(x => x.w !== w.w), 3)));
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
  const games = [
    { icon: "🔗", name: "词语配对", sub: "已解锁单词随机出题", fn: () => startMatch(pool) },
    { icon: "👂", name: "听音选图", sub: "练出小小顺风耳", fn: () => startListen(pool) },
    { icon: "🔤", name: "拼写工坊", sub: "字母积木拼拼拼", fn: () => startSpell(pool) },
    { icon: "🚂", name: "句子小火车", sub: "重点句型排排队", fn: () => startSentence(sents) },
    { icon: "📕", name: "错词大扫除", sub: wrongCount() ? "还有 " + wrongCount() + " 个错词" : "错词本是空的", fn: () => startReview() }
  ];
  $("#scr-arcade").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">🎮 想玩什么随便挑！</div>
      <div style="font-size:12px;color:#b8a8c8;margin-top:2px">题目来自已解锁的 ${UNITS.filter(isUnlocked).length} 个单元</div>
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
    <div style="font-size:11px;color:#c0b0d0;text-align:center">改完直接生效，孩子下次打开转盘就是新奖品</div>`;
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
    <div id="parentLink">家长设置</div>`;
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
          ${dup ? '<div style="font-size:11px;margin-top:2px">重复啦，返还5金币</div>' : '<div style="font-size:11px;margin-top:2px">🎊 新贴纸！</div>'}
        </div>`;
      if (dup) { S.coins += 5; save(); updateCoinBox(); }
      $("#toAlbum .aSub").textContent = `已收集 ${Object.keys(S.stickers).length}/${STICKERS.length}`;
      btn.disabled = false;
    }, 900);
  };
  show("reward", "🎁 奖励屋");
}

/* ================= 贴纸册 ================= */
function renderAlbum() {
  const got = Object.keys(S.stickers).length;
  $("#scr-album").innerHTML = `
    <div class="card" style="text-align:center;padding:12px">
      <div style="font-size:15px;font-weight:700;color:#9b59b6">📔 已收集 ${got} / ${STICKERS.length}</div>
      <div style="font-size:12px;color:#b8a8c8">灰色的还没扭到，继续加油！</div>
    </div>
    <div class="albumGrid">
      ${STICKERS.map(s => {
        const have = !!S.stickers[s.n];
        return `<div class="albumCell ${have ? "" : "no"} ${s.r === 3 ? "rr3" : ""}">
          <div class="ae">${s.e}</div>
          <div class="an">${have ? s.n + (S.stickers[s.n] > 1 ? " ×" + S.stickers[s.n] : "") : "？？？"}</div>
        </div>`;
      }).join("")}
    </div>`;
  show("album", "📔 贴纸册");
}

/* ================= 启动 ================= */
updateCoinBox();
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

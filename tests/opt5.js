/* 四项优化：任务顺序+可点击 / 拼读必做 / 二三年级词库 / 复习=昨天学的+之前随机 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };

const dom = new JSDOM(fs.readFileSync(DIR + "/index.html", "utf8").replace(/<script src="[^"]+"><\/script>/g, ""),
  { runScripts: "dangerously", url: "https://nevergiveup0618.github.io/English/", pretendToBeVisual: true });
const w = dom.window;
w.SpeechSynthesisUtterance = function (t) { this.text = t; };
w.speechSynthesis = { speaking: 0, pending: 0, paused: 0, cancel() {}, resume() {}, speak() {}, getVoices: () => [] };
w.AudioContext = function () { return { state: "running", resume() {}, currentTime: 0, destination: {}, createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }) }; };
w.Audio = function () { return { play: () => Promise.resolve(), pause() {}, onended: null }; };
for (const f of ["audio/manifest.js", "data.js", "app.js"]) {
  const sc = w.document.createElement("script");
  sc.textContent = fs.readFileSync(DIR + "/" + f, "utf8");
  w.document.body.appendChild(sc);
}
const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];
const S = () => w.eval("S");

(async () => {
  console.log("③ 二年级 / 三年级单词（暑假复习）");
  const UNITS = w.eval("UNITS");
  const books = {};
  UNITS.forEach(u => books[u.book] = (books[u.book] || 0) + u.words.length);
  ok(!!books["二年级"] && !!books["三上"] && !!books["三下"], "★ 新增 二年级 / 三上 / 三下");
  ok(UNITS.reduce((a, u) => a + u.words.length, 0) === 417, "★ 二至六年级共417个课内词条");
  console.log("     各册单词数:", JSON.stringify(books));
  const AM = w.eval("AUDIO_MAP");
  const noAudio = UNITS.flatMap(u => u.words).filter(x => !AM[x.w]);
  ok(noAudio.length === 0, "★ 417 个单词全部有真人发音（新词已重新合成）");
  w.eval("navStack=[renderMap];renderMap();");
  ok($("#scr-map").innerHTML.includes("二年级") && $("#scr-map").innerHTML.includes("三上"), "★ 地图上能看到低年级各册");
  ok($("#scr-map").innerHTML.includes("暑假想复习旧词"), "★ 提示可以直接点低年级复习");
  ok($$("#scr-map .unitCard").length === 50, "50 个单元（含五、六年级上下册）");
  // 每册第一个单元都默认解锁 → 暑假可以直接进去
  const cards = $$("#scr-map .unitCard");
  const firstOfBooks = ["b1", "t1", "x1", "u1", "d1"];
  ok(firstOfBooks.every(id => {
    const c = cards.find(x => x.dataset.uid === id);
    return c && !c.classList.contains("locked");
  }), "★ 每一册的第一单元都可直接进入（暑假想复习哪册就点哪册）");
  ok(w.eval("currentUnit().book") === "四上", "★ 「继续闯关」仍然跟着四上走（不会跳回二年级）");

  console.log("\n① 每日任务顺序：复习 → 学新词 → 玩游戏 → 拼读");
  w.eval("navStack=[renderHome];renderHome();");
  const rows = $$("#scr-home .taskRow");
  ok(rows.length === 4, "★ 4 个任务（新增拼读）");
  ok(rows[0].textContent.includes("先做今日复习"), "★ 第1项：复习");
  ok(rows[1].textContent.includes("学") && rows[1].textContent.includes("新单词"), "★ 第2项：学新词");
  ok(rows[2].textContent.includes("小游戏"), "★ 第3项：玩游戏");
  ok(rows[3].textContent.includes("自然拼读"), "★ 第4项：自然拼读");
  ok($("#scr-home").innerHTML.includes("四项全部完成，才能转今天的转盘"), "★ 说明转盘要四项全做完");

  console.log("\n① 首页任务行可点击跳转");
  ok($$("#scr-home .taskRow.clickable").length === 4, "★ 四行都可点击");
  // 点「学新词」→ 进单元页
  rows[1].click();
  ok($("#scr-unit").classList.contains("on"), "★ 点第2行 → 直接进入学单词的单元页");
  w.eval("navStack=[renderHome];renderHome();");
  // 点「玩游戏」→ 游戏厅
  $$("#scr-home .taskRow")[2].click();
  ok($("#scr-arcade").classList.contains("on"), "★ 点第3行 → 直接进入游戏厅");
  w.eval("navStack=[renderHome];renderHome();");
  // 点「拼读」→ 拼读学院
  $$("#scr-home .taskRow")[3].click();
  ok($("#scr-phonics").classList.contains("on"), "★ 点第4行 → 直接进入拼读学院");

  console.log("\n② 自然拼读设为每日必做");
  w.eval("S.daily={date:todayStr(),w:99,g:99,r:99,ph:0,earn:0,t1:false,t2:false,t3:false,t4:false,hard:false,bonus:false,spun:false};S.tickets=3;save();");
  ok(w.eval("taskDone().t4") === false, "没做拼读 → 任务4 未完成");
  ok(w.eval("wheelReady()") === false, "★ 没学拼读 → 转盘锁定");
  w.eval("navStack=[renderWheel];renderWheel();");
  ok($("#scr-wheel").innerHTML.includes("完成3条自然拼读"), "★ 转盘清单里列出「完成3条自然拼读」");
  ok($("#spinBtn").disabled === true, "转盘按钮锁定");
  // 做三个拼读关卡
  w.eval("bumpDaily('ph',3)");
  ok(w.eval("taskDone().t4") === true, "★ 完成 3 个拼读关卡 → 任务4 完成");
  ok(w.eval("wheelReady()") === true, "★ 四项齐了 → 转盘解锁");

  console.log("\n④ 复习选词 = 昨天学的 + 之前的随机");
  w.eval(`
    S.units={}; S.learnedAt={}; S.srs={};
    const u = UNITS.find(x=>x.id==='u1');
    // 昨天学了 3 个词
    ['classroom','window','light'].forEach(x=>{ S.learnedAt[x]=yesterdayStr(); S.srs[x]={lv:1,due:dateAdd(5)}; });
    // 更早学过 8 个词（都没到期）
    ['door','computer','fan','wall','floor','TV','clean','help'].forEach(x=>{ S.learnedAt[x]=dateAdd(-10); S.srs[x]={lv:3,due:dateAdd(9)}; });
    unitS('u1').learned = Object.keys(S.learnedAt);
    save();
  `);
  const due = w.eval("dueWords().map(x=>x.w)");
  const yd = w.eval("yesterdayWords().map(x=>x.w)");
  ok(yd.length === 3, "昨天学了 3 个词");
  ok(["classroom", "window", "light"].every(x => due.includes(x)), "★ 昨天学的词全部进入今日复习（遗忘曲线最陡的一天）");
  ok(due.length >= 6, "★ 不足时从学过的老词里随机补足: 共 " + due.length + " 个 → " + due.join(","));
  const older = due.filter(x => !yd.includes(x));
  ok(older.length >= 3, "★ 确实混进了「之前学过的」随机老词: " + older.join(","));

  // 复习页要标出每个词的来源
  w.eval("navStack=[startDueReview];startDueReview();");
  await sleep(60);
  const head = $("#playHead").innerHTML;
  ok(/昨天刚学的|以前学过的/.test(head), "★ 复习时标注这个词是「昨天刚学的」还是「以前学过的」");

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("异常:", e); process.exit(1); });

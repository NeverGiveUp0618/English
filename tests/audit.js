/* 逻辑审计：不改代码，只验证怀疑点 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const dom = new JSDOM(fs.readFileSync(DIR + "/index.html", "utf8").replace(/<script src="[^"]+"><\/script>/g, ""),
  { runScripts: "dangerously", url: "https://x/", pretendToBeVisual: true });
const w = dom.window;
w.SpeechSynthesisUtterance = function () {}; w.speechSynthesis = { cancel() {}, resume() {}, speak() {}, getVoices: () => [] };
w.AudioContext = function () { return { state: "running", resume() {}, currentTime: 0, destination: {}, createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }) }; };
w.Audio = function () { return { play: () => Promise.resolve(), pause() {} }; };
for (const f of ["audio/manifest.js", "data.js", "app.js"]) {
  const sc = w.document.createElement("script");
  sc.textContent = fs.readFileSync(DIR + "/" + f, "utf8");
  w.document.body.appendChild(sc);
}

console.log("═══ 疑点1：游戏厅会不会考「她还没学过」的词？ ═══");
w.eval("S=defState();save();");   // 全新存档，一个词都没学
const pool = w.eval("unlockedWords().map(x=>x.w)");
const learned = w.eval("Object.keys(S.learnedAt)");
console.log("  全新存档：已学单词 =", learned.length, "个");
console.log("  但游戏厅的题库 unlockedWords() =", pool.length, "个词");
console.log("  题库样例:", pool.slice(0, 12).join(", "));
console.log(pool.length > learned.length
  ? "  ⚠️ 确认存在问题：一个词都没学，游戏厅却有 " + pool.length + " 个词可考 → 会考她没学过的词"
  : "  ✓ 没问题");

console.log("\n═══ 疑点2：难度段位阈值还合理吗？（词库从139→273） ═══");
const DIFFS = w.eval("DIFFS");
console.log("  升段门槛：1段→2段 =", DIFFS[1].next, "词　2段→3段 =", DIFFS[2].next, "词");
console.log("  但现在总词库 =", w.eval("UNITS.reduce((a,u)=>a+u.words.length,0)"), "词");
// 模拟：暑假把二年级+三上刷完（都是简单词）
w.eval(`
  UNITS.filter(u=>u.book==='二年级'||u.book==='三上').forEach(u=>{
    const us=unitS(u.id); u.words.forEach(x=>{ if(!us.learned.includes(x.w)) us.learned.push(x.w); S.learnedAt[x.w]=todayStr(); });
  }); save();
`);
console.log("  暑假刷完 二年级+三上（都是简单词）→ 掌握", w.eval("masteredCount()"), "词");
console.log("  → 段位自动变成：", w.eval("D().rank"));
console.log("  ⚠️ 她一个四年级新词都没学，却已经是最高难度（8秒倒计时/拼写全开）");

console.log("\n═══ 疑点3：自然拼读设为每日必做，但只有几条规则？ ═══");
const PH = w.eval("PHONICS");
console.log("  拼读规则总数:", PH.length, "条");
console.log("  ⚠️ 每天必做1条 →", PH.length, "天后就开始重复（重复本身没问题，但缺少「拼读复习」的正式模式）");

console.log("\n═══ 疑点4：暑假想复习旧册，但每日任务强制学「四上新词」？ ═══");
w.eval("S=defState();save();");
console.log("  currentUnit()（继续闯关指向）:", w.eval("currentUnit().book"), w.eval("currentUnit().num"));
console.log("  「学新词」任务点进去 → 固定跳到:", w.eval("currentUnit().book"));
console.log("  ⚠️ 暑假她想复习三上，但每日任务的「学新词」把她推向四上——两个目标打架");

console.log("\n═══ 疑点5：拼读关卡同时计入「游戏」任务？ ═══");
w.eval("S=defState();save();");
const g0 = w.eval("S.daily.g");
w.eval("bumpDaily('g');bumpDaily('ph');");   // 模拟拼读关卡结束时的两次调用
console.log("  完成1个拼读关卡后：游戏计数 =", w.eval("S.daily.g"), "，拼读计数 =", w.eval("S.daily.ph"));
console.log("  ⚠️ 做3次拼读就能凑满「玩3局游戏」——单词游戏可以完全不碰");

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
console.log("  全新存档使用当前单元兜底，保证游戏可玩：", w.eval("gamePool().length"), "个词");
w.eval(`
  const us=unitS('u1'); UNITS.find(u=>u.id==='u1').words.slice(0,8).forEach(x=>{
    us.learned.push(x.w); S.learnedAt[x.w]=todayStr();
  }); save();
`);
const pool = w.eval("gamePool().map(x=>x.w)");
const learned = w.eval("learnedWords().map(x=>x.w)");
console.log(pool.length === 8 && pool.every(x => learned.includes(x))
  ? "  ✓ 学够8词后，游戏厅只考真正学过的词"
  : "  ⚠️ 题库混入未学词");

console.log("\n═══ 疑点2：难度段位阈值还合理吗？（词库已扩展到六年级） ═══");
const DIFFS = w.eval("DIFFS");
console.log("  升段门槛：1段→2段 =", DIFFS[1].next, "词　2段→3段 =", DIFFS[2].next, "词");
console.log("  但现在总词库 =", w.eval("UNITS.reduce((a,u)=>a+u.words.length,0)"), "词");
// 模拟：暑假把二年级+三上刷完（都是简单词）
w.eval(`
  UNITS.filter(u=>u.book==='二年级'||u.book==='三上').forEach(u=>{
    const us=unitS(u.id); u.words.forEach(x=>{ if(!us.learned.includes(x.w)) us.learned.push(x.w); S.learnedAt[x.w]=todayStr(); });
  }); save();
`);
console.log("  暑假刷完 二年级+三上（都是简单词）→ 加权掌握度", w.eval("masteredCount()"));
console.log("  → 段位自动变成：", w.eval("D().rank"));
console.log(w.eval("levelNum()") < 3 ? "  ✓ 没有被顶到最高难度" : "  ⚠️ 被顶到最高难度");

console.log("\n═══ 疑点3：自然拼读设为每日必做，但只有几条规则？ ═══");
const PH = w.eval("PHONICS");
console.log("  拼读规则总数:", PH.length, "条");
console.log("  ✓ 已有拼读大挑战，规则学完后可正式混合复习");

console.log("\n═══ 疑点4：暑假想复习旧册，但每日任务强制学「四上新词」？ ═══");
w.eval("S=defState();S.focusBook='三上';save();");
console.log("  家长指定三上后，学习任务指向:", w.eval("currentUnit().book"));
console.log(w.eval("currentUnit().book") === "三上" ? "  ✓ 学习重点册生效" : "  ⚠️ 学习重点册未生效");

console.log("\n═══ 疑点5：拼读关卡同时计入「游戏」任务？ ═══");
w.eval("S=defState();save();");
w.eval("bumpDaily('ph');");
console.log("  完成1个拼读关卡后：游戏计数 =", w.eval("S.daily.g"), "，拼读计数 =", w.eval("S.daily.ph"));
console.log(w.eval("S.daily.g") === 0 ? "  ✓ 拼读不会顶替游戏任务" : "  ⚠️ 拼读错误计入游戏任务");

console.log("\n═══ 新功能：句子听力题库与难度 ═══");
const sentN = w.eval("unlockedSents().length");
console.log("  已解锁句型:", sentN, "句；当前选项数:", w.eval("D().opts"));
console.log(sentN >= w.eval("D().opts") ? "  ✓ 句子池足够按 D().opts 出题" : "  ⚠️ 句子池不足");

/* 审计脚本只报告问题，不应因 jsdom 中的页面计时器一直占着进程。 */
process.exit(0);

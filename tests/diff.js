/* 难度曲线验证：模拟孩子从 0 词长到 139 词，看各项参数怎么变 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");

const dom = new JSDOM(fs.readFileSync(DIR + "/index.html", "utf8")
  .replace('<script src="data.js"></script>', "").replace('<script src="app.js"></script>', ""),
  { runScripts: "dangerously", url: "https://example.com/", pretendToBeVisual: true });
const w = dom.window;
w.SpeechSynthesisUtterance = function (t) { this.text = t; };
w.speechSynthesis = { speaking: 0, pending: 0, paused: 0, cancel() {}, resume() {}, speak() {}, getVoices: () => [] };
w.AudioContext = function () { return { state: "running", resume() {}, currentTime: 0, destination: {}, createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }) }; };
w.Audio = function () { return { play: () => Promise.resolve(), pause() {} }; };
for (const f of ["audio/manifest.js", "data.js", "app.js"]) {
  const sc = w.document.createElement("script");
  sc.textContent = fs.readFileSync(DIR + "/" + f, "utf8");
  w.document.body.appendChild(sc);
}

const UNITS = w.eval("UNITS");
let learned = 0, fail = 0;
const rows = [];
const allWords = [];
UNITS.forEach(u => u.words.forEach(x => allWords.push([u.id, x.w])));

function setLearned(n) {
  w.eval("S.units={};save();");
  allWords.slice(0, n).forEach(([uid, word]) => {
    w.eval(`unitS(${JSON.stringify(uid)}).learned.push(${JSON.stringify(word)})`);
  });
}

console.log("掌握词数 → 段位与各项难度参数\n");
console.log("词数  段位              新词/日 选项  闪电轮   补字母 拼写上限 提示 句长 挑战 大考 配对");
[0, 5, 10, 24, 25, 40, 59, 60, 80, 139].forEach(n => {
  setLearned(n);
  const d = w.eval("D()"), lv = w.eval("levelNum()");
  rows.push({ n, lv, mastered: w.eval("masteredCount()") });
  console.log(
    String(n).padEnd(5),
    d.rank.padEnd(16),
    String(d.newWords).padEnd(7),
    (d.opts + "选1").padEnd(5),
    (d.timer ? d.timer / 1000 + "秒" : "不限时").padEnd(8),
    String(d.blanks).padEnd(6),
    String(d.spellMax === 99 ? "全部" : d.spellMax + "字母").padEnd(8),
    (d.spellHint ? "有" : "无").padEnd(4),
    String(d.sentMax === 99 ? "全部" : d.sentMax + "词").padEnd(4),
    String(d.bossQ).padEnd(4),
    String(d.examQ).padEnd(4),
    String(d.pairs)
  );
});

console.log("\n检查：");
const t = (c, m) => { if (c) console.log("  ✓", m); else { fail++; console.log("  ✗ FAIL:", m); } };
t(rows.every(r => r.lv === (r.mastered < 25 ? 1 : r.mastered < 60 ? 2 : 3)),
  "段位按加权掌握度升段（低年级词只算半个）");
// 家长锁定
w.eval('S.diff=1;save();'); setLearned(139);
t(w.eval("levelNum()") === 1, "家长锁「一直简单」后，139词也保持1段");
w.eval('S.diff=3;save();'); setLearned(0);
t(w.eval("levelNum()") === 3, "家长锁「挑战」后，0词也是3段");
w.eval('S.diff="auto";save();');
t(w.eval("levelNum()") === 1, "改回自动后按词数回到1段");

// 新手拼写只出短词
setLearned(139);
w.eval('S.diff=1;save();');
const pool = w.eval("unlockedWords()");
const spellSrc = pool.filter(x => /^[a-zA-Z]+$/.test(x.w) && x.w.length >= 3 && x.w.length <= 6);
t(spellSrc.length >= 3, "新手段位拼写候选词（≤6字母）有 " + spellSrc.length + " 个，够出题");
const longWords = pool.filter(x => x.w.length > 6).map(x => x.w);
t(longWords.length > 0, "长词（如 " + longWords.slice(0, 3).join("/") + "）留到升段后才出现");

process.exit(fail ? 1 : 0);

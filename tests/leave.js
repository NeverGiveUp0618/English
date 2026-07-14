/* 中途退出游戏时：必须立刻闭嘴，且不能在后台继续推进题目 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => { console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m); if (!c) fail++; };

const dom = new JSDOM(fs.readFileSync(DIR + "/index.html", "utf8")
  .replace('<script src="data.js"></script>', "").replace('<script src="app.js"></script>', ""),
  { runScripts: "dangerously", url: "https://example.com/", pretendToBeVisual: true });
const w = dom.window;
let ttsCancels = 0;
w.SpeechSynthesisUtterance = function (t) { this.text = t; };
w.speechSynthesis = { speaking: 0, pending: 0, paused: 0, cancel() { ttsCancels++; }, resume() {}, speak() {}, getVoices: () => [] };
w.AudioContext = function () { return { state: "running", resume() {}, currentTime: 0, destination: {}, createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }) }; };

// 记录 mp3 的播放/暂停
const log = { played: [], paused: 0 };
w.Audio = function () {
  return {
    preload: "", crossOrigin: "", src: "", playbackRate: 1, currentTime: 0, onended: null,
    _playing: false,
    pause() { if (this._playing) { this._playing = false; log.paused++; } },
    play() { this._playing = true; if (this.src && !this.src.startsWith("data:")) log.played.push(this.src); return Promise.resolve(); }
  };
};
w.URL.createObjectURL = () => "blob:x"; w.URL.revokeObjectURL = () => {};
for (const f of ["audio/manifest.js", "data.js", "app.js"]) {
  const sc = w.document.createElement("script");
  sc.textContent = fs.readFileSync(DIR + "/" + f, "utf8");
  w.document.body.appendChild(sc);
}
const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];
const AUD = () => w.eval("AUD");

(async () => {
  console.log("① 听音选图玩到一半，按返回键退出");
  w.eval("S.units.u1={learned:UNITS[0].words.map(x=>x.w),stars:1};save();");
  w.eval("navStack=[renderArcade];renderArcade();");
  $$("#scr-arcade .actRow").find(r => r.textContent.includes("听音选图")).click();
  await sleep(120);
  ok($("#scr-play").classList.contains("on"), "进入听音选图");
  ok(AUD()._playing === true, "正在播放单词发音: " + AUD().src.split("/").pop());

  const pausedBefore = log.paused;
  w.eval("goBack()");                         // 模拟点返回
  ok(AUD()._playing === false, "★ 退出后 mp3 已停止（原 bug：还在读）");
  ok(log.paused > pausedBefore, "★ 调用了 pause()");
  ok(ttsCancels > 0, "系统TTS 也已取消");
  ok(!$("#scr-play").classList.contains("on"), "已离开游戏页");

  console.log("② 切换底部 Tab 也要闭嘴");
  w.eval("navStack=[renderArcade];renderArcade();");
  $$("#scr-arcade .actRow").find(r => r.textContent.includes("听音选图")).click();
  await sleep(120);
  ok(AUD()._playing === true, "又在播了");
  $$(".tab").find(t => t.dataset.tab === "home").click();
  ok(AUD()._playing === false, "★ 切 Tab 后立刻停止");

  console.log("③ 句子小火车：读到一半退出，不能在后台继续翻页");
  w.eval("navStack=[renderArcade];renderArcade();");
  $$("#scr-arcade .actRow").find(r => r.textContent.includes("句子小火车")).click();
  await sleep(60);
  const SENTS = [];
  w.eval("UNITS").forEach(u => u.sents.forEach(s => SENTS.push(s)));
  const zh = $("#scr-play .card").textContent;
  const target = SENTS.find(s => zh.includes(s.zh));
  for (const word of target.en.split(" ")) {
    const chip = $$("#sentPool .chip").find(c => c.textContent === word && !c.dataset.used);
    chip.dataset.used = "1"; chip.click(); await sleep(20);
  }
  $("#sentCheck").click();          // 答对 → 开始朗读整句，读完才翻页
  await sleep(100);
  ok(AUD()._playing === true, "正在朗读整句: " + target.en);
  const progBefore = $("#scr-play #playProg").textContent;

  w.eval("goBack()");               // 读到一半退出
  ok(AUD()._playing === false, "★ 朗读立刻停止");

  // 就算音频的 onended 迟到触发，也不能推进题目
  const gen = w.eval("speakGen");
  w.eval("if (AUD.onended) AUD.onended();");
  await sleep(700);
  ok(w.eval("speakGen") === gen, "speakGen 已递增，旧回调作废");
  ok(!$("#scr-play").classList.contains("on"), "★ 没有在后台偷偷翻到下一句");
  ok($("#scr-play #playProg").textContent === progBefore, "★ 题目进度停在原地");

  console.log("④ 手机锁屏 / 切到别的 App");
  w.eval("navStack=[renderArcade];renderArcade();");
  $$("#scr-arcade .actRow").find(r => r.textContent.includes("听音选图")).click();
  await sleep(120);
  ok(AUD()._playing === true, "正在播放");
  Object.defineProperty(w.document, "hidden", { value: true, configurable: true });
  w.document.dispatchEvent(new w.Event("visibilitychange"));
  ok(AUD()._playing === false, "★ 切后台/锁屏后自动闭嘴（不在口袋里念单词）");

  console.log(fail ? "\n✗ " + fail + " 项失败" : "\n✓ 退出、切Tab、切后台都会立刻停止发音，且不会在后台推进题目");
  process.exit(fail ? 1 : 0);
})();

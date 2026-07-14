/* 句子听力：入口、整句发音、难度选项数、即时反馈、每日任务 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };

const html = fs.readFileSync(DIR + "/index.html", "utf8").replace(/<script src="[^"]+"><\/script>/g, "");
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.com/", pretendToBeVisual: true });
const w = dom.window;
w.SpeechSynthesisUtterance = function () {};
w.speechSynthesis = { cancel() {}, resume() {}, speak() {}, getVoices: () => [] };
w.AudioContext = function () { return { state: "running", resume() {}, currentTime: 0, destination: {}, createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }) }; };
w.Audio = function () { return { src: "", play: () => Promise.resolve(), pause() {} }; };
for (const f of ["audio/manifest.js", "data.js", "app.js"]) {
  const sc = w.document.createElement("script");
  sc.textContent = fs.readFileSync(DIR + "/" + f, "utf8");
  w.document.body.appendChild(sc);
}
const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];
const S = () => w.eval("S");

(async () => {
  console.log("句子听力游戏");
  w.eval("S=defState();save();navStack=[renderArcade];renderArcade();");
  const entry = $$("#scr-arcade .actRow").find(x => x.textContent.includes("听句子"));
  ok(!!entry, "游戏厅有「听句子」入口");
  entry.click();
  ok($("#scr-play").classList.contains("on"), "点击后进入句子听力");
  ok($("#barTitle").textContent.includes("听句子"), "页面标题正确");
  ok($$("#scr-play .optBtn").length === 3, "新手难度走 D().opts：3选1");

  let rounds = 0;
  while ($("#scr-play").classList.contains("on") && rounds++ < 10) {
    const sent = w.eval("AUD && Object.keys(AUDIO_MAP).find(k => 'audio/' + AUDIO_MAP[k] === AUD.src)");
    ok(!!sent && w.eval(`unlockedSents().some(s => s.en === ${JSON.stringify(sent)})`), "播放的是题库中的完整英文句子");
    const zh = w.eval(`unlockedSents().find(s => s.en === ${JSON.stringify(sent)}).zh`);
    const answer = $$("#scr-play .optBtn").find(b => b.textContent === zh);
    ok(!!answer, "正确中文意思出现在选项中");
    answer.click();
    ok(answer.classList.contains("right"), "点击后立即给出正确反馈");
    await sleep(930);
  }
  ok($("#scr-result").classList.contains("on"), "完成后进入结算页");
  ok(rounds === 6, "新手共答6句");
  ok(S().daily.g === 1, "完成后 bumpDaily('g') 计入玩游戏任务");
  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

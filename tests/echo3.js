/* 三种设备环境下，魔法回声都必须可用 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => { console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m); if (!c) fail++; };

function boot({ withSR, withRec }) {
  const dom = new JSDOM(fs.readFileSync(DIR + "/index.html", "utf8")
    .replace('<script src="data.js"></script>', "").replace('<script src="app.js"></script>', ""),
    { runScripts: "dangerously", url: "https://example.com/", pretendToBeVisual: true });
  const w = dom.window;
  w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  w.speechSynthesis = { speaking: 0, pending: 0, paused: 0, cancel() {}, resume() {}, speak() {}, getVoices: () => [] };
  w.AudioContext = function () { return { state: "running", resume() {}, currentTime: 0, destination: {}, createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }) }; };
  w.Audio = function () { return { play: () => Promise.resolve(), pause() {}, onended: null }; };
  w.URL.createObjectURL = () => "blob:x"; w.URL.revokeObjectURL = () => {};

  if (withSR) {
    w.webkitSpeechRecognition = function () {
      this.start = () => setTimeout(() => this.onresult && this.onresult({
        results: [Object.assign([{ transcript: this._say || "" }], { length: 1 })]
      }), 10);
      this.stop = () => {};
      w.__rec = this;
    };
  }
  if (withRec) {
    w.navigator.mediaDevices = { getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop() {} }] }) };
    w.MediaRecorder = function () {
      this.state = "inactive"; this.mimeType = "audio/webm";
      this.start = () => { this.state = "recording"; };
      this.stop = () => { this.state = "inactive"; this.ondataavailable && this.ondataavailable({ data: { size: 9 } }); this.onstop && this.onstop(); };
    };
  }
  for (const f of ["audio/manifest.js", "data.js", "app.js"]) {
    const sc = w.document.createElement("script");
    sc.textContent = fs.readFileSync(DIR + "/" + f, "utf8");
    w.document.body.appendChild(sc);
  }
  return w;
}

(async () => {
  console.log("场景A：安卓 Chrome（支持语音识别）");
  {
    const w = boot({ withSR: true, withRec: true });
    const $ = s => w.document.querySelector(s);
    ok(w.eval("echoMode()") === "sr", "走 sr 模式（自动打分）");
    w.eval("navStack=[renderArcade];renderArcade();");
    [...w.document.querySelectorAll("#scr-arcade .actRow")].find(r => r.textContent.includes("魔法回声")).click();
    ok($("#scr-echo").classList.contains("on"), "进入跟读页");
    ok(!!$("#echoMic") && $("#echoMic").textContent.includes("开始读"), "显示「点我开始读」");
    // 模拟孩子读对
    const target = $("#scr-echo .card div").textContent;
    $("#echoMic").click();
    await sleep(20);
    w.__rec._say = target;
    w.__rec.onresult({ results: [Object.assign([{ transcript: target }], { length: 1 })] });
    await sleep(50);
    ok($("#echoScore").innerHTML.includes("⭐⭐⭐"), "读对 → 自动判 3 星: " + target);
    ok($("#echoScore").innerHTML.includes("100 分"), "显示 100 分");
  }

  console.log("场景B：iPhone Safari（不支持语音识别，但能录音）");
  {
    const w = boot({ withSR: false, withRec: true });
    const $ = s => w.document.querySelector(s);
    ok(w.eval("echoMode()") === "record", "走 record 模式（录音对比）");
    w.eval("navStack=[renderArcade];renderArcade();");
    [...w.document.querySelectorAll("#scr-arcade .actRow")].find(r => r.textContent.includes("魔法回声")).click();
    ok(!$("#scr-echo").innerHTML.includes("不支持"), "★ 不再是死胡同");
    ok($("#echoMic").textContent.includes("录音"), "显示录音按钮");
    $("#echoMic").click(); await sleep(50);
    $("#echoMic").click(); await sleep(50);
    ok(!!$("#playMine"), "★ 可回放自己的录音");
    ok(!!$("#playStd"), "★ 可对比标准发音");
    ok([...w.document.querySelectorAll("#echoScore [data-self]")].length === 3, "★ 三档自评可继续");
  }

  console.log("场景C：连麦克风都没有（影子跟读）");
  {
    const w = boot({ withSR: false, withRec: false });
    const $ = s => w.document.querySelector(s);
    ok(w.eval("echoMode()") === "shadow", "走 shadow 模式");
    w.eval("navStack=[renderArcade];renderArcade();");
    [...w.document.querySelectorAll("#scr-arcade .actRow")].find(r => r.textContent.includes("魔法回声")).click();
    ok(!$("#scr-echo").innerHTML.includes("不支持"), "★ 仍然可用，不是死胡同");
    ok(!!$("#echoDone"), "有「我大声读完啦」按钮");
    ok(!!$("#echoAgain"), "有「再听一遍」按钮");
    const p1 = $("#scr-echo #playProg").textContent;
    $("#echoDone").click(); await sleep(30);
    ok($("#scr-echo #playProg").textContent !== p1, "点完进入下一句");
  }

  console.log(fail ? "\n✗ " + fail + " 项失败" : "\n✓ 三种设备环境下跟读功能都可用");
  process.exit(fail ? 1 : 0);
})();

/* 麦克风各种失败情形下，跟读都必须还能继续练（不能卡死） */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => { console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m); if (!c) fail++; };

function boot({ ua, standalone, mediaDevices, mediaRecorder, gumError }) {
  const dom = new JSDOM(fs.readFileSync(DIR + "/index.html", "utf8")
    .replace('<script src="data.js"></script>', "").replace('<script src="app.js"></script>', ""),
    { runScripts: "dangerously", url: "https://nevergiveup0618.github.io/English/", pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w.navigator, "userAgent", { value: ua, configurable: true });
  if (standalone) w.navigator.standalone = true;
  w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  w.speechSynthesis = { speaking: 0, pending: 0, paused: 0, cancel() {}, resume() {}, speak() {}, getVoices: () => [] };
  w.AudioContext = function () { return { state: "running", resume() {}, currentTime: 0, destination: {}, createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }) }; };
  w.Audio = function () { return { play: () => Promise.resolve(), pause() {}, onended: null }; };
  w.URL.createObjectURL = () => "blob:x"; w.URL.revokeObjectURL = () => {};
  if (mediaDevices) {
    w.navigator.mediaDevices = {
      getUserMedia: () => gumError
        ? Promise.reject(Object.assign(new Error("denied"), { name: gumError }))
        : Promise.resolve({ getTracks: () => [{ stop() {} }] })
    };
  }
  if (mediaRecorder) {
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
const openEcho = w => {
  w.eval("navStack=[renderArcade];renderArcade();");
  [...w.document.querySelectorAll("#scr-arcade .actRow")].find(r => r.textContent.includes("魔法回声")).click();
};

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
const WECHAT = IPHONE + " MicroMessenger/8.0.40";

(async () => {
  console.log("① iPhone Safari，用户拒绝麦克风权限");
  {
    const w = boot({ ua: IPHONE, mediaDevices: true, mediaRecorder: true, gumError: "NotAllowedError" });
    const $ = s => w.document.querySelector(s);
    openEcho(w);
    ok($("#echoMic").textContent.includes("录音"), "初始是录音模式");
    $("#echoMic").click();
    await sleep(80);
    ok($("#echoState").innerHTML.includes("权限被拒绝") || $("#echoState").innerHTML.includes("允许"), "说清了原因: 权限被拒");
    ok(!!$("#echoDone"), "★ 自动降级到影子跟读，还能继续练（不卡死）");
    const p1 = $("#scr-echo #playProg").textContent;
    $("#echoDone").click(); await sleep(40);
    ok($("#scr-echo #playProg").textContent !== p1, "★ 点「我读完啦」能进下一句");
  }

  console.log("② iPhone 从桌面图标打开（standalone，苹果禁麦克风）");
  {
    const w = boot({ ua: IPHONE, standalone: true, mediaDevices: true, mediaRecorder: true, gumError: "NotAllowedError" });
    const $ = s => w.document.querySelector(s);
    ok(w.eval("IS_STANDALONE") === true, "识别出是桌面图标打开");
    openEcho(w);
    $("#echoMic").click();
    await sleep(80);
    ok($("#echoState").innerHTML.includes("Safari"), "★ 提示改用 Safari 打开（这是 iPhone 的真实限制）");
    ok(!!$("#echoDone"), "仍降级为影子跟读，可继续");
  }

  console.log("③ 微信内置浏览器（没有 mediaDevices）");
  {
    const w = boot({ ua: WECHAT, mediaDevices: false, mediaRecorder: false });
    const $ = s => w.document.querySelector(s);
    ok(w.eval("IS_WECHAT") === true, "识别出微信");
    ok(w.eval("echoMode()") === "shadow", "直接走影子跟读");
    openEcho(w);
    ok(!$("#scr-echo").innerHTML.includes("不支持语音识别"), "★ 不再是死胡同");
    ok($("#echoState").innerHTML.includes("在浏览器中打开"), "★ 告诉家长怎么解决（微信→浏览器）");
    ok(!!$("#echoDone") && !!$("#echoAgain"), "可以听 + 跟读 + 继续");
  }

  console.log("④ 麦克风被别的 App 占用");
  {
    const w = boot({ ua: IPHONE, mediaDevices: true, mediaRecorder: true, gumError: "NotReadableError" });
    const $ = s => w.document.querySelector(s);
    openEcho(w);
    $("#echoMic").click(); await sleep(80);
    ok($("#echoState").innerHTML.includes("占用"), "★ 提示麦克风被占用");
    ok(!!$("#echoDone"), "仍可继续练");
  }

  console.log("⑤ 跟读自检页");
  {
    const w = boot({ ua: IPHONE, mediaDevices: true, mediaRecorder: true, gumError: "NotAllowedError" });
    const $ = s => w.document.querySelector(s);
    w.eval("parentOK=true;navStack=[renderMicCheck];renderMicCheck();");
    const h = $("#scr-mic").innerHTML;
    ok(h.includes("当前模式"), "显示当前模式");
    ok(h.includes("安全连接"), "检查 HTTPS");
    ok(h.includes("语音识别"), "检查语音识别");
    ok(h.includes("打开方式"), "检查打开方式（微信/桌面图标）");
    ok(h.includes("iPhone"), "有 iPhone 专项排查指引");
    ok(h.includes(w.navigator.userAgent.slice(0, 20)), "附带设备信息便于反馈");
    $("#micTest").click(); await sleep(80);
    ok($("#micMsg").innerHTML.includes("拿不到麦克风"), "★ 测试按钮能报出真实失败原因");
    ok($("#micMsg").innerHTML.includes("NotAllowedError"), "★ 显示具体错误码（便于我远程定位）");
  }

  console.log("⑥ 一切正常的安卓 Chrome（不能因为修 iPhone 把它弄坏）");
  {
    const w = boot({ ua: "Mozilla/5.0 (Linux; Android 13) Chrome/120", mediaDevices: true, mediaRecorder: true });
    const $ = s => w.document.querySelector(s);
    w.eval("parentOK=true;navStack=[renderMicCheck];renderMicCheck();");
    $("#micTest").click(); await sleep(80);
    ok($("#micMsg").innerHTML.includes("麦克风可以用"), "★ 麦克风正常时明确告知");
    openEcho(w);
    $("#echoMic").click(); await sleep(60);
    ok($("#echoMic").textContent.includes("再点一下结束"), "录音正常开始");
    $("#echoMic").click(); await sleep(60);
    ok(!!$("#playMine"), "录完可回放对比");
  }

  console.log(fail ? "\n✗ " + fail + " 项失败" : "\n✓ 所有失败情形下跟读都不会卡死，且都能说清原因");
  process.exit(fail ? 1 : 0);
})();

/* 阶段测验：解锁门槛、25题、双空、首次通过大奖励与每日游戏计数 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };
const html = fs.readFileSync(DIR + "/index.html", "utf8").replace(/<script src="[^"]+"><\/script>/g, "");
const dom = new JSDOM(html, { runScripts:"dangerously", url:"https://example.com/", pretendToBeVisual:true });
const w = dom.window;
w.SpeechSynthesisUtterance = function(t) { this.text = t; };
w.speechSynthesis = { cancel(){}, resume(){}, speak(){}, getVoices:()=>[] };
w.AudioContext = function(){ return { state:"running",resume(){},currentTime:0,destination:{},createOscillator:()=>({frequency:{},connect(){},start(){},stop(){}}),createGain:()=>({connect(){},gain:{exponentialRampToValueAtTime(){}}}) }; };
w.Audio = function(src){ return { src:src || "",play:()=>Promise.resolve(),pause(){} }; };
for (const f of ["audio/manifest.js","data.js","app.js"]) {
  const sc = w.document.createElement("script"); sc.textContent = fs.readFileSync(DIR + "/" + f, "utf8"); w.document.body.appendChild(sc);
}
const $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
const E = x => w.eval(x);

console.log("阶段测验");
E("S=defState();save();navStack=[renderArcade];renderArcade();");
const entry = () => $$("#scr-arcade .actRow").find(x => x.textContent.includes("阶段测验"));
ok(!!entry() && entry().textContent.includes("再学 20 个词"), "不足20词时明确显示解锁距离");
entry().click();
ok(!$("#scr-play").classList.contains("on"), "不足20词不能提前参加");

E("UNITS.slice(0,2).forEach(u=>{const us=unitS(u.id);us.learned=u.words.map(x=>x.w);u.words.forEach(x=>{S.learnedAt[x.w]=todayStr();srsInit(x.w);});});save();navStack=[renderArcade];renderArcade();");
ok(E("learnedWords().length") >= 20, "准备好第一阶段的已学词");
entry().click();
ok($("#playProg").textContent.includes("1 / 25"), "阶段测验固定25题");

let sawHoles = false, rounds = 0;
/* 本测试把定时器改成立即执行以快速点完25题；白白声线另有专项测试，
   此处关闭角色语音，避免“等待英语结束”的真实延时被测试桩无限递归。 */
w.eval("baibaiSpeak=()=>{}");
w.setTimeout = fn => { fn(); return 1; };
while ($("#scr-play").classList.contains("on") && rounds++ < 30) {
  let answer = null;
  const qtext = $("#scr-play .qText"), sub = $("#scr-play .qSub");
  if (qtext && qtext.textContent.includes("▢")) {
    sawHoles = (qtext.textContent.match(/▢/g) || []).length === 2 || sawHoles;
    const re = new RegExp("^" + qtext.textContent.replace(/▢/g, ".") + "$", "i");
    answer = $$("#scr-play .optBtn").find(b => re.test(b.textContent.trim()));
  } else if (qtext) {
    const word = qtext.textContent.trim();
    const item = E(`learnedWords().find(x=>x.w===${JSON.stringify(word)})`);
    answer = $$("#scr-play .optBtn").find(b => b.textContent.trim() === item.e + item.zh);
  } else if (sub && sub.textContent.includes("选出英文")) {
    const zh = sub.textContent.split(" ——")[0].trim();
    const word = E(`learnedWords().find(x=>x.zh===${JSON.stringify(zh)}).w`);
    answer = $$("#scr-play .optBtn").find(b => b.textContent.trim() === word);
  } else {
    const src = E("AUD.src");
    const spoken = E(`Object.keys(AUDIO_MAP).find(k=>'audio/'+AUDIO_MAP[k]===${JSON.stringify(src)})`);
    const item = E(`unlockedSents().find(x=>x.en===${JSON.stringify(spoken)})||learnedWords().find(x=>x.w===${JSON.stringify(spoken)})`);
    const label = item.en ? item.zh : item.e + item.zh;
    answer = $$("#scr-play .optBtn").find(b => b.textContent.trim() === label);
  }
  if (!answer) throw new Error("找不到阶段测验正确答案：" + (sub ? sub.textContent : ""));
  answer.click();
}
ok(sawHoles, "综合卷包含一次挖两个字母的拼写题");
ok($("#scr-result").classList.contains("on") && $("#resDetail").textContent.includes("25/25"), "25题全部完成并正确结算");
ok(E("S.stageExams.s1.passed") && E("S.stageExams.s1.best") === 100, "第一阶段通过记录已保存");
ok(E("S.tickets") >= 2 && Object.keys(E("S.stickers")).length === 1, "首次通过奖励2张转盘券和1张新白白卡");
ok(E("S.coins") >= 125, "满分至少获得100答题金币+25通过奖励（每日任务奖励另计）");
ok(E("S.daily.g") === 1, "完成阶段测验计入每日玩游戏");

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);

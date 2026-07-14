/* 验证 5 个问题是否真的修好了 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };

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
const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];
const S = () => w.eval("S");

(async () => {
  console.log("① 游戏厅不再考没学过的词");
  w.eval("S=defState();save();");
  ok(w.eval("learnedWords().length") === 0, "全新存档：0 个已学词");
  // 学 8 个词
  w.eval(`
    const U=UNITS.find(u=>u.id==='u1'); const us=unitS('u1');
    U.words.slice(0,8).forEach(x=>{ us.learned.push(x.w); S.learnedAt[x.w]=todayStr(); srsInit(x.w); });
    save();
  `);
  const gp = w.eval("gamePool().map(x=>x.w)");
  const lw = w.eval("learnedWords().map(x=>x.w)");
  ok(gp.length === 8 && gp.every(x => lw.includes(x)), "★ 学了8个词 → 游戏厅题库正好是这8个（不再考没学过的）: " + gp.join(","));
  ok(!gp.includes("one") && !gp.includes("red"), "★ 二年级那些没学过的词不会出现在题库里");
  // 学得太少时的兜底
  w.eval("S=defState();save();");
  ok(w.eval("gamePool().length") > 0, "★ 一个词没学时仍有题可玩（退回本单元词，不会空题库）");

  console.log("\n② 暑假刷低年级不再把难度顶满");
  w.eval(`
    S=defState();
    UNITS.filter(u=>u.book==='二年级'||u.book==='三上').forEach(u=>{
      const us=unitS(u.id); u.words.forEach(x=>{ us.learned.push(x.w); S.learnedAt[x.w]=todayStr(); });
    }); save();
  `);
  const m1 = w.eval("masteredCount()"), r1 = w.eval("D().rank");
  ok(r1 !== "🦄 大魔法师", "★ 刷完二年级+三上（86个简单词）→ 段位是「" + r1 + "」，不再直接顶到最高");
  console.log("     加权掌握度 =", m1, "（低年级词按半个计）");
  // 四年级词才是硬通货
  w.eval(`
    UNITS.filter(u=>u.book==='四上').forEach(u=>{
      const us=unitS(u.id); u.words.forEach(x=>{ if(!us.learned.includes(x.w)){us.learned.push(x.w); S.learnedAt[x.w]=todayStr();} });
    }); save();
  `);
  ok(w.eval("masteredCount()") > m1, "★ 学四年级词，段位权重才是满的: " + m1 + " → " + w.eval("masteredCount()"));

  console.log("\n③ 拼读不再顶替「玩游戏」任务");
  w.eval("S=defState();save();");
  w.eval("bumpDaily('ph');bumpDaily('ph');bumpDaily('ph');");
  ok(S().daily.ph === 3 && S().daily.g === 0, "★ 做 3 次拼读 → 游戏计数仍是 0（必须真的玩单词游戏）");
  ok(w.eval("taskDone().t3") === false, "★ 光做拼读凑不满「玩游戏」任务");

  console.log("\n④ 拼读大挑战（8条规则学完后不空转）");
  w.eval("S=defState();PHONICS.slice(0,4).forEach(p=>{phS(p.id).learned=true;});save();");
  w.eval("navStack=[renderPhonicsList];renderPhonicsList();");
  ok(!!$("#phMix"), "★ 学过2条以上规则 → 出现「拼读大挑战」");
  ok($("#scr-phonics").innerHTML.includes("混在一起考"), "说明是混合复习");
  ok($("#scr-phonics").innerHTML.includes("今天还没做拼读"), "★ 提示今天的拼读任务状态");
  $("#phMix").click();
  await sleep(50);
  ok($("#scr-play").innerHTML.includes("拼读大挑战"), "★ 可以进入混合挑战");
  ok($$("#scr-play .optBtn").length >= 3, "混合出题（从学过的规则里选）");
  // 只学1条规则时不给玩
  w.eval("S=defState();phS('ph1').learned=true;save();navStack=[renderPhonicsList];renderPhonicsList();");
  ok(!$("#phMix"), "只学1条规则时不显示混合挑战");

  console.log("\n⑤ 家长可指定「学习重点册」（暑假复习）");
  w.eval("S=defState();save();");
  ok(w.eval("currentUnit().book") === "四上", "默认跟学校进度（四上）");
  w.eval("S.focusBook='三上';save();");
  ok(w.eval("currentUnit().book") === "三上", "★ 设为「三上」→ 学新词任务跳到三上（暑假复习）");
  w.eval("navStack=[renderHome];renderHome();");
  ok($("#scr-home").innerHTML.includes("三上"), "★ 首页「继续闯关」也指向三上");
  $$("#scr-home .taskRow")[1].click();
  ok($("#scr-unit").innerHTML.includes("三上"), "★ 点「学新词」直接进三上的单元");
  // 家长设置里能改
  w.eval("parentOK=true;S.focusBook='auto';save();navStack=[renderParent];renderParent();");
  ok($("#scr-parent").innerHTML.includes("学习重点"), "★ 家长设置里有「学习重点」");
  ok($$("#scr-parent [data-focus]").length === 6, "可选：自动/二年级/三上/三下/四上/四下");
  $$("#scr-parent [data-focus]").find(b => b.dataset.focus === "三下").click();
  ok(S().focusBook === "三下", "★ 家长可切换学习重点");

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("异常:", e); process.exit(1); });

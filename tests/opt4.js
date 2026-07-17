/* 四项优化专项测试：宠物喂养 / 拼读音标 / 多角色装扮 / 转盘每日一次 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };

function boot() {
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
  return w;
}

(async () => {
  const w = boot();
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  const S = () => w.eval("S");

  console.log("① 电子宠物：喂养 / 洗澡 / 陪玩");
  ok($("#scr-home").innerHTML.includes("饱腹") && $("#scr-home").innerHTML.includes("干净") && $("#scr-home").innerHTML.includes("心情"), "首页显示三条状态");
  ok(!!$("#goCare"), "有「伙伴屋」入口");
  w.eval("S.coins=500;saveWallet({coins:500,tickets:0});updateCoinBox();");
  $("#goCare").click();
  ok($("#scr-care").classList.contains("on"), "进入伙伴屋");
  ok($$(".careBtn").length === 4, "4 种照顾方式（喂食/洗澡/陪玩/零食）");
  w.eval("S.pet.hunger=40;save();navStack=[renderCare];renderCare();");
  const c0 = w.eval("loadWallet().coins"), b0 = S().pet.bond;
  $$(".careBtn")[0].click();     // 喂食
  await sleep(50);
  ok(S().pet.hunger === 65, "★ 喂食后饱腹 40 → 65");
  ok(w.eval("loadWallet().coins") === c0 - 5, "扣了 5 金币（金币的日常出口）");
  ok(S().pet.bond > b0, "★ 亲密度上涨: " + b0 + " → " + S().pet.bond);

  console.log("  —— 红线：绝不惩罚 ——");
  w.eval("S.pet.careDay='2026-06-01';S.pet.hunger=100;S.pet.clean=100;S.pet.mood=100;save();decayCare();");
  ok(S().pet.hunger >= 20 && S().pet.clean >= 20, "★ 一个多月不管它，状态也只掉到 20（地板），不会归零");
  ok(w.eval("careMood().t") !== undefined && !/病|死|跑掉/.test(JSON.stringify(w.eval("careMood()"))), "★ 最差也只是「有点想你了」，没有生病/死亡");
  const coinsBeforeDecay = w.eval("loadWallet().coins");
  w.eval("S.pet.careDay='2026-05-01';save();decayCare();");
  ok(w.eval("loadWallet().coins") === coinsBeforeDecay, "★ 不照顾它不会扣金币、不扣任何东西");

  console.log("\n② 自然拼读：音节拆分 + 音标 + 颜色");
  const PH = w.eval("PHONICS");
  ok(PH[0].words[0].ipa === "/keɪk/", "例词带音标: cake " + PH[0].words[0].ipa);
  ok(JSON.stringify(PH[5].words[7].syl) === '["tea","cher"]', "多音节词已拆分: teacher → tea·cher");
  const withIpa = PH.reduce((a, p) => a + p.words.filter(x => x.ipa && x.syl).length, 0);
  ok(withIpa === 64, "64 个例词全部有音标和音节");
  w.eval("navStack=[()=>renderPhonicRule(PHONICS[0])];renderPhonicRule(PHONICS[0]);");
  const ph = $("#scr-phonic").innerHTML;
  ok(ph.includes("phKey"), "★ 规则字母上色（红色）");
  ok(ph.includes("phMute"), "★ 不发音的魔法 e 显示为灰色删除线");
  ok(ph.includes("/keɪk/"), "★ 显示音标");
  ok(ph.includes("sylBlock"), "★ 音节分块显示");
  ok(ph.includes("红色") && ph.includes("不发音"), "有图例说明颜色含义");
  // 具体检查 cake：c(普通) a(规则) k(普通) e(不发音)
  const cakeHtml = w.eval("colorWord(PHONICS[0].words[0], PHONICS[0])");
  ok(/<span class="phKey">a<\/span>/.test(cakeHtml), "★ cake 的 a 标为发音关键字母");
  ok(/<span class="phMute">e<\/span>/.test(cakeHtml), "★ cake 结尾的 e 标为不发音");
  const teacherHtml = w.eval("colorWord(PHONICS[5].words[7], PHONICS[5])");
  ok((teacherHtml.match(/sylBlock/g) || []).length === 2, "★ teacher 被切成 2 个音节块");

  console.log("\n③ 白白 + 可保存装扮");
  const PETS = w.eval("PETS");
  ok(PETS.length === 1 && PETS[0].id === "baibai", "★ 暂时只保留陪伴五年的白白");
  ok(PETS[0].art === "assets/baibai-base.png", "★ 白白使用无服装基础形象");
  ok(S().pet.id === "baibai" && S().pet.name === "白白", "★ 默认伙伴和名字都是白白");
  ok((S().pet.owned || []).length === 1 && S().pet.owned[0] === "baibai", "不再出现换伙伴入口");
  w.eval("navStack=[renderCare];renderCare();");
  ok(!$("#toSwap"), "★ 照顾页没有换伙伴按钮");
  const cats = new Set(w.eval("OUTFITS.map(o=>o.cat)"));
  ok(w.eval("OUTFITS.length") >= 28 && ["发饰","帽子","耳饰","项圈","披风","手持"].every(x=>cats.has(x)),
     "★ 至少 28 件白白装扮，覆盖发饰、帽子、耳饰、项圈、披风和手持");
  ok(w.eval("OUTFITS.filter(o=>o.group==='body').every(o=>o.art&&['披风','婚纱'].includes(o.cat))"), "★ 人类裙装已全部替换为适合白白体型的披风/婚纱图片");
  w.eval("saveWallet({coins:500,tickets:0});updateCoinBox();");
  w.eval("navStack=[renderOutfit];renderOutfit();");
  $("[data-o='bb_crown']").click();
  ok((S().pet.outfits || []).includes("bb_crown") && (S().pet.worn || []).includes("bb_crown"), "★ 买下皇冠后自动加入造型");
  ok(w.eval("loadWallet().coins") === 420, "从共享钱包扣 80 金币");
  w.eval("navStack=[renderHome];renderHome();");
  ok($("#petShow [data-outfit='bb_crown'] img")?.src.endsWith("/assets/outfits/hat-crown.svg"), "★ 首页显示白白最新保存的皇冠图片");

  console.log("\n④ 转盘：每天一次 + 必须学完复习完");
  w.eval("S.daily={date:todayStr(),w:0,g:0,r:0,ph:0,earn:0,t1:false,t2:false,t3:false,t4:false,hard:false,bonus:false,spun:false};S.tickets=3;save();");
  w.eval("navStack=[renderWheel];renderWheel();");
  ok($("#spinBtn").disabled === true, "★ 没做完任务 → 转盘锁定");
  ok($("#spinBtn").textContent.includes("先完成今天的学习和复习"), "★ 明确告诉她要先学完复习完");
  ok($("#scr-wheel").innerHTML.includes("做完今天的复习") && $("#scr-wheel").innerHTML.includes("学一条自然拼读"), "★ 列出四个前置条件（含复习和拼读）");
  // 完成今日任务
  w.eval("S.daily.t1=true;S.daily.t2=true;S.daily.t3=true;S.daily.t4=true;S.daily.w=9;S.daily.g=9;S.daily.r=9;S.daily.ph=1;save();navStack=[renderWheel];renderWheel();");
  ok(w.eval("wheelReady()") === true, "★ 四项任务全完成(含拼读) → 转盘解锁");
  ok($("#spinBtn").disabled === false, "★ 可以转了");
  ok($("#spinBtn").textContent.includes("今天的唯一一次"), "★ 强调是今天唯一一次");
  const tk = S().tickets;
  $("#spinBtn").click();
  await sleep(4600);
  ok(S().daily.spun === true, "★ 转过后标记 spun");
  const refunded = $("#wheelWon").textContent.includes("再转一次");
  ok(S().tickets === tk - 1 + (refunded ? 1 : 0), refunded ? "抽到再转一次：消耗后返还 1 张券" : "消耗 1 张券");
  ok($("#spinBtn").disabled === true && $("#spinBtn").textContent.includes("明天再来"), "★ 转完立刻锁定：今天不能再转");
  w.eval("navStack=[renderWheel];renderWheel();");
  ok($("#spinBtn").disabled === true, "★ 重新进入转盘页仍然是锁定的（一天一次）");
  ok(S().tickets >= 2, "剩余的券留到明天用（不浪费她挣的）");

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("异常:", e); process.exit(1); });

/* 白白核心伙伴：基础形象 / 多件衣橱 / 保存造型 / 跨科目同步 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };

const dom = new JSDOM(fs.readFileSync(DIR + "/index.html", "utf8").replace(/<script src="[^"]+"><\/script>/g, ""),
  { runScripts: "dangerously", url: "https://nevergiveup0618.github.io/English/", pretendToBeVisual: true });
const w = dom.window;
w.SpeechSynthesisUtterance = function (t) { this.text = t; };
w.speechSynthesis = { speaking: 0, pending: 0, paused: 0, cancel() {}, resume() {}, speak() {}, getVoices: () => [] };
w.AudioContext = function () { return { state: "running", resume() {}, currentTime: 0, destination: {}, createOscillator: () => ({ frequency: {}, connect() {}, start() {}, stop() {} }), createGain: () => ({ connect() {}, gain: { exponentialRampToValueAtTime() {} } }) }; };
w.Audio = function () { return { play: () => Promise.resolve(), pause() {}, onended: null }; };
for (const f of ["audio/manifest.js", "data.js", "app.js"]) {
  const sc = w.document.createElement("script"); sc.textContent = fs.readFileSync(DIR + "/" + f, "utf8"); w.document.body.appendChild(sc);
}
const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];
const S = () => w.eval("S");

(async () => {
  console.log("① 白白成为唯一默认伙伴，首次是裸狗形象");
  ok(w.eval("PETS.length") === 1 && w.eval("PETS[0].id") === "baibai", "★ 暂时隐藏其他伙伴，只保留白白");
  ok(S().pet.id === "baibai" && w.eval("petName()") === "白白", "★ 老存档打开也统一切到白白");
  ok(!!$("#petShow .petImg") && /assets\/baibai-base\.png$/.test($("#petShow .petImg").src), "★ 首页使用无衣服无帽子的白白基础图");
  ok($$("#petShow .petDeco").length === 0, "★ 首次登场没有任何默认穿戴");
  ok(fs.existsSync(DIR + "/assets/baibai-base.png"), "白白透明基础图已进入项目");

  console.log("\n② 衣橱覆盖婚纱、裙子、发饰、耳饰、衣服等品类");
  w.eval("saveWallet({coins:500,tickets:0});updateCoinBox();navStack=[renderOutfit];renderOutfit();");
  const outfits = w.eval("OUTFITS");
  ok(outfits.length >= 24, "至少 24 件可搭配装扮: " + outfits.length);
  ok(["发饰","耳饰","项链","婚纱裙","衣服","脸上","手持"].every(c => outfits.some(o => o.cat === c)), "★ 用户指定的主要品类全部覆盖");
  ok(S().pet.outfits.includes("bb_bow") && S().pet.outfits.includes("bb_flower"), "★ 送两件免费发饰，打开就能玩");
  $("[data-o='bb_bow']").click();
  ok(S().pet.worn.includes("bb_bow"), "点一下免费蝴蝶结立即穿上");
  $("[data-o='bb_wedding']").click();
  ok(S().pet.worn.includes("bb_wedding") && w.eval("loadWallet().coins") === 380, "★ 花共享金币买白色婚纱并穿上");
  $("[data-o='bb_pinkdress']").click();
  ok(S().pet.worn.includes("bb_pinkdress") && !S().pet.worn.includes("bb_wedding"), "★ 换裙子时自动收好上一件，避免两条裙子重叠");

  console.log("\n③ 每件装扮独立拖动，点保存前不改正式造型");
  w.eval("S.pet.worn=['bb_bow','bb_pinkdress'];save();navStack=[renderDecoEdit];renderDecoEdit();");
  ok($$(".decoItem").length === 2 && $$(".decoItem").every(x => x.dataset.outfit), "两件装扮都能单独选中和拖动");
  ok(/aspect-ratio:\s*1\s*\/\s*1/.test(fs.readFileSync(DIR + "/index.html", "utf8")), "编辑器和首页使用同一正方形坐标系");
  const before = w.eval("decoOf('bb_bow')");
  const stage = $("#decoStage");
  stage.getBoundingClientRect = () => ({ left:0, top:0, width:200, height:200 });
  const bow = $("#decoStage [data-outfit='bb_bow']");
  bow.dispatchEvent(new w.MouseEvent("mousedown", { bubbles:true, clientX:60, clientY:20 }));
  stage.dispatchEvent(new w.MouseEvent("mousemove", { bubbles:true, clientX:70, clientY:40 }));
  stage.dispatchEvent(new w.MouseEvent("mouseup", { bubbles:true }));
  await sleep(20);
  ok(w.eval("decoOf('bb_bow')").x === before.x, "★ 拖动只是预览，尚未点击保存不会改正式宠物");
  $("#deDone").click();
  ok(w.eval("decoOf('bb_bow')").x === 35 && w.eval("decoOf('bb_bow')").y === 20, "★ 点击保存后落点正式生效");

  console.log("\n④ 保存后的最新白白用于首页和每次做题反馈");
  w.eval("navStack=[renderHome];renderHome();");
  const homeBow = $("#petShow [data-outfit='bb_bow']");
  ok(homeBow && homeBow.style.left === "35%" && homeBow.style.top === "20%", "首页显示刚保存的位置");
  w.eval("showBaibaiReaction('right','答对啦！')");
  ok(!!$("#baibaiReaction .petImg") && !!$("#baibaiReaction [data-outfit='bb_bow']"), "★ 做题即时反馈使用同一份最新装扮白白");

  console.log("\n⑤ 造型跨科目共享，但钱包协议保持独立");
  const shared = JSON.parse(w.localStorage.getItem("sharedPet_v1"));
  ok(shared.name === "白白" && shared.items.some(x => x.id === "bb_bow" && x.x === 35), "★ sharedPet_v1 写入最新白白造型，语文可直接读取");
  ok(JSON.parse(w.localStorage.getItem("sharedWallet_v1")).coins === 290, "装扮消费仍只走 sharedWallet_v1");

  console.log("\n⑥ 投喂、洗澡、陪玩每次都有明确反馈且没有惩罚");
  ok(w.eval("CARE.every(c=>c.say.includes('白白')&&c.fx)"), "四种互动都有白白专属文字和动作反馈");
  w.eval("saveWallet({coins:100,tickets:0});S.pet.hunger=40;navStack=[renderCare];renderCare();");
  $("[data-c='food']").click();
  ok($("#careSay").textContent.includes("白白") && S().pet.hunger === 65, "★ 投喂后立刻回应并更新状态");
  w.eval("S.pet.careDay='2026-01-01';S.pet.hunger=100;S.pet.clean=100;S.pet.mood=100;decayCare();");
  ok(S().pet.hunger >= 20 && !/病|死|离开/.test(JSON.stringify(w.eval("careMood()"))), "★ 长期不操作也不生病、不死亡、不离开");

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("异常:", e); process.exit(1); });

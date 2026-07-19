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

  console.log("\n② 衣橱只提供适合白白身体的披风、帽子与配件");
  w.eval("saveWallet({coins:500,tickets:0});updateCoinBox();navStack=[renderOutfit];renderOutfit();");
  const outfits = w.eval("OUTFITS");
  ok(outfits.length >= 24, "至少 24 件可搭配装扮: " + outfits.length);
  ok(outfits.every(o => o.art && /assets\/outfits\/.+\.(?:svg|webp)$/.test(o.art)), "★ 衣橱每件装扮都有项目内置图片，不再用 Emoji 文字冒充图片");
  ok(["发饰","帽子","耳饰","项圈","披风","脸上","手持"].every(c => outfits.some(o => o.cat === c)), "★ 白白适配的主要品类全部覆盖");
  ok(outfits.filter(o => o.group === "body").every(o => ["披风","婚纱"].includes(o.cat) && o.art), "★ 所有人类裙装都已原位升级成适合白白的披风/婚纱");
  ok(outfits.filter(o => o.art && o.group !== "body").every(o => o.base < .8)
    && outfits.filter(o => o.group === "body").every(o => o.base === 1),
    "★ 小配饰保持紧凑画布；披风允许覆盖完整身体轮廓以贴合颈部和两侧");
  ok(S().pet.outfits.includes("bb_bow") && S().pet.outfits.includes("bb_flower"), "★ 送两件免费发饰，打开就能玩");
  $("[data-o='bb_bow']").click();
  ok(S().pet.worn.includes("bb_bow"), "点一下免费蝴蝶结立即穿上");
  $("[data-o='bb_wedding']").click();
  ok(S().pet.worn.includes("bb_wedding") && w.eval("loadWallet().coins") === 380, "★ 花共享金币买皇家披风并穿上");
  $("[data-o='bb_pinkdress']").click();
  ok(S().pet.worn.includes("bb_pinkdress") && !S().pet.worn.includes("bb_wedding"), "★ 换披风时自动收好上一件，避免两件披风重叠");

  console.log("\n③ 每件装扮独立拖动，点保存前不改正式造型");
  w.PointerEvent = w.MouseEvent;
  w.eval("S.pet.worn=['bb_bow','bb_pinkdress'];save();navStack=[renderDecoEdit];renderDecoEdit();");
  ok($$(".decoItem").length === 2 && $$(".decoItem").every(x => x.dataset.outfit), "两件装扮都能单独选中和拖动");
  ok(!!$("#decoGrab") && $$(".decoItem").every(x => w.getComputedStyle(x).pointerEvents === "none"), "★ 独立抓取点负责拖动，披风透明画布不再遮住帽子");
  ok(w.getComputedStyle($("#decoGrab")).width === "44px" && w.getComputedStyle($("#decoGrab span")).width === "26px", "★ 拖动热区够大，但可见移动点很小，不遮住衣服落点");
  ok($("#decoStage [data-outfit='bb_pinkdress']").style.zIndex === "3", "★ 调整页与保存后的正式形象使用同一前置披风层级");
  ok(!!$("#deRemove") && $("#deRemove").textContent.includes("取下"), "★ 编辑页提供明确的取下按钮");
  ok(/aspect-ratio:\s*1\s*\/\s*1/.test(fs.readFileSync(DIR + "/index.html", "utf8")), "编辑器和首页使用同一正方形坐标系");
  const before = w.eval("decoOf('bb_bow')");
  const stage = $("#decoStage");
  $("#screens").scrollTop = 360;
  stage.getBoundingClientRect = () => ({ left:0, top:0, width:200, height:200 });
  const bow = $("#decoStage [data-outfit='bb_bow']");
  $("#decoGrab").dispatchEvent(new w.MouseEvent("pointerdown", { bubbles:true, clientX:60, clientY:20 }));
  w.dispatchEvent(new w.MouseEvent("pointermove", { bubbles:true, clientX:70, clientY:40 }));
  w.dispatchEvent(new w.MouseEvent("pointerup", { bubbles:true }));
  await sleep(20);
  ok($("#screens").scrollTop === 360, "★ 拖动装扮后编辑页不跳回顶部");
  $("#screens").scrollTop = 410; $("[data-act='cw']").click();
  ok($("#screens").scrollTop === 410, "★ 旋转装扮后编辑页保持原位置");
  ok(w.eval("decoOf('bb_bow')").x === before.x, "★ 拖动只是预览，尚未点击保存不会改正式宠物");
  $("#deDone").click();
  const moved = w.eval("decoOf('bb_bow')");
  ok(moved.x === before.x + 5 && moved.y === before.y + 10, "★ 点击保存后按抓取偏移落点正式生效");

  console.log("\n④ 保存后的最新白白用于首页和每次做题反馈");
  w.eval("navStack=[renderHome];renderHome();");
  const homeBow = $("#petShow [data-outfit='bb_bow']");
  ok(homeBow && homeBow.style.left === moved.x + "%" && homeBow.style.top === moved.y + "%", "首页显示刚保存的位置");
  w.eval("showBaibaiReaction('right','答对啦！')");
  ok(!!$("#baibaiReaction .petImg") && !!$("#baibaiReaction [data-outfit='bb_bow']"), "★ 做题即时反馈使用同一份最新装扮白白");

  console.log("\n⑤ 造型跨科目共享，但钱包协议保持独立");
  const shared = JSON.parse(w.localStorage.getItem("sharedPet_v1"));
  ok(shared.name === "白白" && shared.items.some(x => x.id === "bb_bow" && x.x === moved.x), "★ sharedPet_v1 写入最新白白造型，语文可直接读取");
  ok(JSON.parse(w.localStorage.getItem("sharedWallet_v1")).coins === 290, "装扮消费仍只走 sharedWallet_v1");

  w.eval("navStack=[renderDecoEdit];renderDecoEdit();");
  $("[data-pick='bb_pinkdress']").click();
  $("#deRemove").click();
  ok(!S().pet.worn.includes("bb_pinkdress") && S().pet.worn.includes("bb_bow"), "★ 编辑页点取下后立即生效，白白恢复为剩余造型");

  console.log("\n⑥ 投喂、洗澡、陪玩每次都有明确反馈且没有惩罚");
  ok(w.eval("CARE.every(c=>c.say.includes('白白')&&c.fx)"), "四种互动都有白白专属文字和动作反馈");
  w.eval("saveWallet({coins:100,tickets:0});S.pet.hunger=40;navStack=[renderCare];renderCare();");
  $("[data-c='food']").click();
  ok($("#careSay").textContent.includes("白白") && S().pet.hunger === 65, "★ 投喂后立刻回应并更新状态");
  w.eval("S.pet.careDay='2026-01-01';S.pet.hunger=100;S.pet.clean=100;S.pet.mood=100;decayCare();");
  ok(S().pet.hunger >= 20 && !/病|死|离开/.test(JSON.stringify(w.eval("careMood()"))), "★ 长期不操作也不生病、不死亡、不离开");

  console.log("\n⑦ 满值免费互动、30姿势与贴纸衣橱联动");
  w.eval("saveWallet({coins:77,tickets:0});S.pet.hunger=100;S.pet.careDay=todayStr();renderCare();");
  $("[data-c='food']").click();
  ok(w.eval("loadWallet().coins") === 77 && $("#careSay").textContent.includes("免费抱抱"), "★ 饱腹满值仍有回应且不花金币");
  w.eval("navStack=[renderOutfit];renderOutfit();$('#toPoses').click()");
  ok(w.eval("BAIBAI_POSES.length") === 30 && $$("[data-pose]").length === 30, "★ 姿势册共有30个白白姿势");
  ok(w.eval("BAIBAI_POSES.slice(0,5).every(p=>p.cost===0)&&BAIBAI_POSES.slice(5).every(p=>p.cost>0)"), "★ 前5个免费，后25个金币解锁");
  $("[data-pose='p02']").click();
  ok(S().pet.pose === "p02" && /pose-02\.webp$/.test(w.eval("petVisual()")), "★ 免费姿势可切换并成为最新白白形象");
  const linked = w.eval("stickerOf('星帽魔法白白')");
  w.eval("S.pet.outfits=S.pet.outfits.filter(x=>x!=='bb_wizardhat')");
  ok(w.eval("unlockStickerOutfit(stickerOf('星帽魔法白白')).id") === "bb_wizardhat" && S().pet.outfits.includes("bb_wizardhat"), "★ 抽到有装饰的贴纸会解锁卡面同款衣橱物品");
  ok(w.eval("stickerOutfit(stickerOf('薰衣草·相机白白')).id") === "bb_camera" && w.eval("stickerOutfit(stickerOf('珍珠·绘本时光白白')).id") === "bb_ix_2", "★ 全部20套闪卡版本都能识别相机、绘本等卡面配饰");
  ok(w.eval("STICKERS.every(s=>s.message&&!s.message.includes('这是陪你学习的白白'))"), "★ 2000张卡片都改为鼓励语、名句或诗句");
  ok(w.eval("new Set(STICKERS.map(s=>s.message)).size") === 50, "★ 收藏卡准备了50句轮换小纸条，不再千篇一律");
  w.localStorage.removeItem("sharedCardDaily_v1");
  const chances = w.eval("[1,2,3,4,5,6,7,8,9].map(()=>takeEnglishCardChance())");
  ok(chances.filter(Boolean).length === 8 && w.eval("englishCardLeft()") === 0, "★ 英语每日最多获得8张卡");

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("异常:", e); process.exit(1); });

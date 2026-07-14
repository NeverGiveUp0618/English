/* 伙伴形象上传 + 点三下定位 + 饰品贴合 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };

const FAKE_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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
const $ = s => w.document.querySelector(s);
const $$ = s => [...w.document.querySelectorAll(s)];
const S = () => w.eval("S");

(async () => {
  console.log("① 家长设置里能进「伙伴形象」");
  w.eval("parentOK=true;navStack=[renderParent];renderParent();");
  ok(!!$("#pPics"), "家长设置有「🖼️ 伙伴形象」入口");
  ok($("#scr-parent").innerHTML.includes("只存本机，不上传"), "★ 明确说明图片不上传");
  $("#pPics").click();
  ok($("#scr-pics").classList.contains("on"), "进入伙伴形象页");
  ok($("#scr-pics").innerHTML.includes("不会上传到网上") && $("#scr-pics").innerHTML.includes("不会进代码仓库"), "★ 页面写清：图片只存本机");
  ok($$("#scr-pics [data-up]").length === 4, "4 个伙伴都能换形象");
  ok($$("#scr-pics [data-up]")[0].accept === "image/*", "选图控件正确");

  console.log("\n② 上传一张图（模拟家长选了猫小九的图）");
  w.eval(`S.pet.pics = { cat: "${FAKE_PNG}" }; save();`);
  ok(w.eval("petPic('cat')").startsWith("data:image"), "★ 图片存进了本地存档");
  w.eval("navStack=[renderPetPics];renderPetPics();");
  ok($("#scr-pics").innerHTML.includes("已设置自定义形象"), "显示已设置");
  ok(!!$("[data-use='cat']") && !!$("[data-del='cat']"), "出现「用它并调装扮」和「删除」");

  console.log("\n③ 首页/伙伴屋显示的是这张图，不是 emoji");
  w.eval("S.pet.id='cat';save();navStack=[renderHome];renderHome();");
  ok(!!$("#petShow .petImg"), "★ 首页伙伴显示为上传的图片");
  ok($("#petShow .petImg").src.startsWith("data:image"), "用的正是家长上传的那张");
  ok(!$("#petShow #petEmoji"), "不再显示 emoji");
  w.eval("navStack=[renderCare];renderCare();");
  ok(!!$("#carePet .petImg"), "★ 伙伴屋也显示这张图");

  console.log("\n④ 装扮编辑：直接拖动 / 放大缩小 / 旋转");
  // 先戴上三件饰品
  w.eval("S.pet.id='cat';S.pet.outfits=['hat1','face1','item1'];S.pet.wear={hat:'hat1',face:'face1',item:'item1'};save();");
  w.eval("navStack=[renderDecoEdit];renderDecoEdit();");
  ok($("#scr-anchor").classList.contains("on"), "进入装扮编辑页");
  ok($("#scr-anchor").innerHTML.includes("按住饰品直接拖"), "★ 提示可以直接拖");
  ok($$(".decoItem").length === 3, "三件饰品都能拖");
  ok($$(".decoBtn").length === 5, "有 缩小/放大/左转/右转/复位 五个按钮");

  // 拖动：把帽子拖到 (30%, 15%)
  const stage = $("#decoStage");
  stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 300 });
  const hat = $(".decoItem[data-slot='hat']");
  hat.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true, clientX: 100, clientY: 24 }));
  stage.dispatchEvent(new w.MouseEvent("mousemove", { bubbles: true, clientX: 60, clientY: 45 }));
  stage.dispatchEvent(new w.MouseEvent("mouseup", { bubbles: true }));
  await sleep(30);
  let d = w.eval("decoOf('hat')");
  ok(d.x === 30 && d.y === 15, "★ 帽子拖到了 (30%,15%): " + JSON.stringify({x:d.x,y:d.y}));

  // 放大
  w.eval("navStack=[renderDecoEdit];renderDecoEdit();");
  const s0 = w.eval("decoOf('hat')").s;
  $$("[data-pick]")[0].click();               // 选中帽子
  $("[data-act='big']").click();
  ok(w.eval("decoOf('hat')").s > s0, "★ 放大生效: " + s0 + " → " + w.eval("decoOf('hat')").s);
  $("[data-act='small']").click(); $("[data-act='small']").click();
  ok(w.eval("decoOf('hat')").s < s0 + 0.01, "★ 缩小生效: " + w.eval("decoOf('hat')").s);

  // 旋转
  $("[data-act='cw']").click(); $("[data-act='cw']").click();
  ok(w.eval("decoOf('hat')").r === 30, "★ 右转两次 = 30°");
  $("[data-act='ccw']").click();
  ok(w.eval("decoOf('hat')").r === 15, "★ 左转一次 = 15°");

  // 复位
  $("[data-act='reset']").click();
  d = w.eval("decoOf('hat')");
  ok(d.x === 50 && d.y === 8 && d.s === 1 && d.r === 0, "★ 复位回到默认");

  // 切换选中的饰品
  $$("[data-pick]")[2].click();
  $("[data-act='big']").click();
  ok(w.eval("decoOf('item')").s > 1, "★ 可以切换选中「手里」的饰品单独调整");
  ok(w.eval("decoOf('hat')").s === 1, "调整一件不影响另一件");

  console.log("\n⑤ 调好的位置/大小/角度要显示在首页");
  w.eval("S.pet.deco={cat:{hat:{x:30,y:15,s:1.5,r:45},face:{x:50,y:34,s:1,r:0},item:{x:80,y:70,s:1,r:0}}};save();");
  w.eval("navStack=[renderHome];renderHome();");
  const hd = $("#petShow .deco-hat");
  ok(hd.style.left === "30%" && hd.style.top === "15%", "★ 首页帽子在拖动后的位置");
  ok(/rotate\(45deg\)/.test(hd.style.transform), "★ 旋转角度也生效");
  ok(parseInt(hd.style.fontSize) > 28, "★ 放大后的尺寸也生效: " + hd.style.fontSize);

  // 没戴装扮时不能卡住
  w.eval("S.pet.wear={hat:'',face:'',item:''};save();navStack=[renderDecoEdit];renderDecoEdit();");
  ok($("#scr-anchor").innerHTML.includes("还没给它戴装扮") && !!$("#deGo"), "★ 没戴装扮时引导去衣橱，不卡死");

  console.log("\n⑥ 备份码不会被图片撑爆");
  const code = w.eval("exportCode()");
  ok(code.length < 8000, "★ 备份码仍然很小 (" + code.length + " 字符)，图片没被塞进去");
  ok(!code.includes("iVBORw0"), "★ 备份码里确实不含图片数据");
  ok(w.eval("petPic('cat')").length > 50, "但图片仍在本机存档里，正常显示");

  console.log("\n⑦ 没上传图时回退 emoji（不能白屏）");
  w.eval("S.pet.pics={};S.pet.id='fox';save();navStack=[renderHome];renderHome();");
  ok(!$("#petShow .petImg"), "没有图片元素");
  ok(!!$("#petShow #petEmoji"), "★ 回退显示 emoji，不会白屏");

  console.log("\n⑧ 删除形象");
  w.eval(`S.pet.pics={cat:"${FAKE_PNG}"};save();navStack=[renderPetPics];renderPetPics();`);
  $("[data-del='cat']").click();
  ok(!S().pet.pics.cat, "★ 可以删除，恢复默认表情");

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("异常:", e); process.exit(1); });

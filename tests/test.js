const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) { pass++; console.log("  ✓", name); } else { fail++; console.log("  ✗ FAIL:", name); } }

(async () => {
  const html = fs.readFileSync(DIR + "/index.html", "utf8")
    .replace('<script src="data.js"></script>', "")
    .replace('<script src="app.js"></script>', "");
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.com/", pretendToBeVisual: true });
  const w = dom.window;
  // 浏览器API桩
  const spoken = [];
  w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  w.speechSynthesis = {
    speaking: false, pending: false, paused: false,
    cancel() {}, pause() {}, resume() {},
    speak(u) { spoken.push(u.text); },
    getVoices: () => [{ name: "Samantha", lang: "en-US" }]
  };
  w.AudioContext = function () {
    return {
      currentTime: 0, state: "running", resume() {}, destination: {},
      createOscillator: () => ({ type: "", frequency: {}, connect() {}, start() {}, stop() {} }),
      createGain: () => ({ connect() {}, gain: { value: 0, exponentialRampToValueAtTime() {} } })
    };
  };
  // <audio> 桩：记录播放的 mp3，并可手动触发"播完"
  const played = [];
  const audios = [];
  w.Audio = function (src) {
    const a = {
      preload: "", crossOrigin: "", src: src || "", playbackRate: 1, currentTime: 0, onended: null,
      pause() {},
      play() { if (this.src && !this.src.startsWith("data:") && !this.src.startsWith("blob:")) played.push(this.src); return Promise.resolve(); }
    };
    audios.push(a);
    return a;
  };
  // 让测试能模拟"这段音频播完了"
  w.AUD_ENDED = () => { const a = w.eval("AUD"); if (a && a.onended) a.onended(); };

  // 模拟 iPhone：不支持语音识别(SR)，但支持录音(MediaRecorder + getUserMedia)
  w.navigator.mediaDevices = { getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop() {} }] }) };
  w.MediaRecorder = function () {
    const self = this;
    this.state = "inactive";
    this.mimeType = "audio/webm";
    this.start = () => { self.state = "recording"; };
    this.stop = () => {
      self.state = "inactive";
      if (self.ondataavailable) self.ondataavailable({ data: { size: 100 } });
      if (self.onstop) self.onstop();
    };
  };
  w.Blob = w.Blob || function () {};
  w.URL.createObjectURL = () => "blob:fake";
  w.URL.revokeObjectURL = () => {};
  for (const f of ["audio/manifest.js", "data.js", "app.js"]) {
    const sc = w.document.createElement("script");
    sc.textContent = fs.readFileSync(DIR + "/" + f, "utf8");
    w.document.body.appendChild(sc);
  }
  const $ = s => w.document.querySelector(s);
  const $$ = s => [...w.document.querySelectorAll(s)];
  const S = () => w.eval("S");
  const UNITS = w.eval("UNITS");
  const zhOf = en => { for (const u of UNITS) for (const x of u.words) if (x.w === en) return x; return null; };
  // 反查：播放的 mp3 → 原文（现在发音走 mp3 通道，不再走 speechSynthesis）
  const AUDIO_MAP = w.eval("AUDIO_MAP");
  const REV = {}; Object.entries(AUDIO_MAP).forEach(([t, f]) => { REV["audio/" + f] = t; });
  const lastSpoken = () => played.length ? REV[played[played.length - 1]] : spoken[spoken.length - 1];

  console.log("— 首页 —");
  ok($("#scr-home").classList.contains("on"), "首页显示");
  ok($("#smartRecommend") && $("#smartGo"), "★ 首页有基于当前学习状态的白白建议入口");
  ok($("#hubLink").href === "https://nevergiveup0618.github.io/learning/#englishPortal" && $("#hubLink").style.display !== "none", "★ 首页返回学习导航时带英语位置锚点");
  ok($("#backBtn").style.visibility === "hidden", "★ 英语首页不显示无意义的页内返回箭头");
  $("#homeAlbum").click();
  ok($$(".tab").find(t => t.dataset.tab === "reward").classList.contains("on"), "★ 从首页进白白收藏册时，高亮白白礼物而不是首页");
  ok($("#backBtn").style.visibility === "visible" && $("#hubLink").style.display === "none", "★ 进入英语子页面只显示页内返回");
  $("#backBtn").click();
  ok($("#scr-home").classList.contains("on") && $$(".tab").find(t => t.dataset.tab === "home").classList.contains("on"), "★ 页内返回回到英语首页并恢复首页高亮");
  ok($("#petShow .petImg")?.src.endsWith("/assets/baibai-base.png"), "★ 首页默认伙伴是无服装的白白");
  ok($("#coinNum").textContent === "0", "初始金币0");
  const swText = fs.readFileSync(DIR + "/sw.js", "utf8");
  ok(swText.includes("magic-english-v62") && swText.includes("const CORE") && !swText.includes("STICKER_V2_FILES"), "★ 启动只预缓存8个核心文件，贴纸和语音按需缓存");
  ok(swText.includes("fallback || fresh"), "★ 慢网络二次打开优先显示缓存首页");

  console.log("— 地图与锁 —");
  $$('.tab').find(t => t.dataset.tab === "map").click();
  ok($("#scr-map").classList.contains("on") && $("#hubLink").style.display !== "none" && $("#backBtn").style.visibility === "hidden", "地图同级大菜单显示学习导航，不显示页内返回");
  let cards = $$("#scr-map .unitCard");
  const cardOf = id => cards.find(c => c.dataset.uid === id);
  ok(cards.length === 50, "50个单元卡片（已覆盖二至六年级）");
  ok($$("#scr-map .gradeFold").length === 5 && $$("#scr-map .gradeFoldBody.collapsed").length === 4, "★ 地图按五个年级折叠，默认展开当前四年级");
  ok(!cardOf("u1").classList.contains("locked") && cardOf("u2").classList.contains("locked"), "四上U1解锁 U2锁定");
  ok(!cardOf("d1").classList.contains("locked") && !cardOf("b1").classList.contains("locked") && !cardOf("t1").classList.contains("locked"),
     "★ 每册第一单元默认解锁（暑假可直接复习低年级）");
  cardOf("u2").click();
  ok($("#scr-map").classList.contains("on"), "点锁定单元不进入");
  $("#screens").scrollTop = 420;
  cardOf("u1").click();
  ok($("#hubLink").style.display === "none" && $("#backBtn").style.visibility === "visible", "进入地图项目后只显示返回");
  $("#backBtn").click();
  ok($("#scr-map").classList.contains("on") && $("#screens").scrollTop === 420, "★ 从项目返回地图时恢复原来的滚动位置");
  cards = $$("#scr-map .unitCard");

  console.log("— 难度：新手段位（刚上四年级） —");
  ok(w.eval("levelNum()") === 1, "0词时=1段(小小魔法学徒)");
  ok(w.eval("D().rank") === "🌱 小小魔法学徒", "段位名正确");
  ok(w.eval("D().newWords") === 8, "每日新学8个单词");
  ok(w.eval("D().opts") === 3, "新手3选1");
  ok(w.eval("D().timer") === 0, "新手闪电轮不倒计时");
  ok($("#scr-home").innerHTML.includes("小小魔法学徒") && $("#scr-home").innerHTML.includes("再学会 25"), "首页显示段位+升段进度");
  ok($("#scr-home").innerHTML.includes("学 8 个新单词"), "每日任务显示8个新词");

  console.log("— 学单词：魔法孵化(翻卡→三连击→连击轮) —");
  cardOf("u1").click();
  ok($("#scr-unit").classList.contains("on"), "进入单元页");
  $$("#scr-unit .actRow")[0].click();
  ok($("#scr-learn").classList.contains("on"), "进入魔法孵化");
  ok(!!$("#flipCard") && !!$(".flipBack"), "翻卡背面显示");
  ok($$("#wordLights .wl").length === 8, "每日8盏单词进度灯");

  const NW = 8;
  for (let n = 0; n < NW; n++) {
    // 翻卡
    ok($("#lcGo").style.visibility === "hidden", "词" + (n + 1) + ": 翻开前不能开始");
    $("#flipCard").click();
    await sleep(600);
    ok($("#flipCard").classList.contains("flipped"), "词" + (n + 1) + ": 卡片已翻开 " + $("#lcWord").textContent);
    const word = $("#lcWord").textContent;
    const info = zhOf(word);
    $("#lcGo").click();

    // 三连击
    // 关1 听音选图（正确答案=该词的中文）
    ok($$("#scr-learn .dOpt").length === 3, "词" + (n + 1) + ": 关1 是3选1(新手)");
    let btn = $$("#scr-learn .dOpt").find(b => b.textContent.includes(info.zh));
    ok(!!btn, "词" + (n + 1) + ": 关1 听音选图");
    btn.click(); await sleep(900);
    // 关2 看图选词
    btn = $$("#scr-learn .dOpt").find(b => b.textContent === word);
    ok(!!btn, "词" + (n + 1) + ": 关2 看图选词");
    btn.click(); await sleep(900);
    // 关3 补字母：按需要的顺序点正确字母键
    let guard = 0;
    while ($$("#scr-learn .key").length && guard++ < 10) {
      const shown = $("#holeWord").textContent;
      const missIdx = [...shown].findIndex(c => c === "▢");
      if (missIdx < 0) break;
      const need = word[missIdx].toLowerCase();
      const k = $$("#scr-learn .key").find(x => x.dataset.k === need && !x.disabled);
      if (!k) break;
      k.click();
      await sleep(60);
    }
    ok(guard < 10, "词" + (n + 1) + ": 关3 补字母完成");
    await sleep(950);
    ok($("#scr-learn").innerHTML.includes("收服成功"), "词" + (n + 1) + ": 点亮成功");
    ok(S().units.u1.learned.includes(word), "词" + (n + 1) + ": " + word + " 记入已学");
    $("#nextW").click();
    await sleep(50);
  }

  console.log("— 连击轮(新手无倒计时) —");
  ok($("#scr-learn").innerHTML.includes("连击轮"), "新手进入「连击轮」而非闪电轮");
  ok(!$("#tBar"), "新手段位没有倒计时条");
  ok($("#scr-learn").innerHTML.includes("慢慢想"), "提示「慢慢想，答对就有连击」");
  let lq = 0;
  while ($$("#scr-learn .lOpt").length && lq < 12) {
    lq++;
    await sleep(120);   // speak() 延迟 50ms 调用（iOS 修复），等它落地
    const sub = $("#scr-learn .qSub").textContent;
    let answer;
    if (sub.includes("听音选图")) answer = zhOf(lastSpoken()).zh;
    else {
      const zh = sub.replace("快！", "").replace(" 的英文", "").trim();
      for (const u of UNITS) for (const x of u.words) if (x.zh === zh) answer = x.w;
    }
    const b = $$("#scr-learn .lOpt").find(x => x.textContent.includes(answer));
    b.click();
    await sleep(850);
  }
  ok($("#scr-result").classList.contains("on"), "闪电轮结算(共" + lq + "题)");
  ok(S().units.u1.learned.length === 8, "8个单词全部记入已学");
  ok(S().daily.w === 8, "每日任务·学词计数=8");
  ok(S().coins > 0, "获得金币(含连击倍率): " + S().coins);
  ok(S().daily.t2 === true, "★ 学新词任务(t2)已自动发奖");
  ok(w.eval("liveTimer") === null, "闪电轮结束后计时器已清理");
  $("#resBack").click();
  ok($("#scr-unit").classList.contains("on"), "结算返回单元页");

  console.log("— 单元页精简为3项 —");
  ok($$("#scr-unit .actRow").length === 3, "★ 单元页只剩3个入口(学/练/挑战)");
  const unitNames = $$("#scr-unit .actRow").map(r => r.textContent);
  ok(unitNames[0].includes("学单词"), "① 学单词");
  ok(unitNames[1].includes("本单元练习"), "② 本单元练习(4游戏折叠进来)");
  ok(unitNames[2].includes("单元挑战"), "③ 单元挑战");
  ok($("#scr-unit").innerHTML.includes("只出本单元"), "★ 说明了和游戏厅的区别");

  console.log("— 本单元练习（随机题型，走配对分支时） —");
  // 固定随机数，确保这次抽到「词语配对」
  const realRandom = Math.random;
  w.Math.random = () => 0.01;          // 命中 kinds[0] = 词语配对
  $$("#scr-unit .actRow")[1].click();
  ok($("#scr-play").classList.contains("on"), "进入练习");
  ok($$("#scr-play .mL").length > 0, "抽到词语配对");
  w.Math.random = realRandom;
  const mls = $$("#scr-play .mL");
  for (const ml of mls) {
    ml.click();
    $$("#scr-play .mR").find(mr => mr.dataset.w === ml.dataset.w).click();
  }
  await sleep(700);
  ok($("#scr-result").classList.contains("on"), "配对完成进结算");
  ok($("#resStars").textContent === "⭐⭐⭐", "零失误3星");
  ok(S().daily.g === 2, "游戏计数=2(连击轮+配对)");
  $("#resBack").click();

  console.log("— 单元挑战(新手8题) —");
  $$("#scr-unit .actRow")[2].click();
  ok($("#playProg").textContent.includes("/ 8"), "新手段位：单元挑战8题");
  for (let i = 0; i < 8; i++) {
    await sleep(120);   // speak() 延迟 50ms 落地
    let answer;
    const qt = $("#scr-play .qText");
    if (qt) answer = zhOf(qt.textContent).zh;                    // 英选中
    else if ($("#scr-play #lcSpeak")) answer = zhOf(lastSpoken()).zh; // 听音
    if ($("#scr-play .qSub") && $("#scr-play .qSub").textContent.includes("选出英文")) {
      const zh = $("#scr-play .qSub").textContent.split(" ——")[0].trim();
      let en; for (const u of UNITS) for (const x of u.words) if (x.zh === zh) en = x.w;
      answer = en;
    }
    const btn = $$("#scr-play .optBtn").find(b => b.textContent.includes(answer));
    if (!btn) { console.log("    !找不到选项:", answer, $$("#scr-play .optBtn").map(b => b.textContent)); }
    btn.click();
    await sleep(950);
  }
  ok($("#scr-result").classList.contains("on"), "挑战结算");
  ok(S().units.u1.stars === 3, "u1拿到3星");
  ok(S().daily.g === 3 && S().daily.t3 === false, "3局尚未完成5局游戏任务");
  $("#resBack").click();

  console.log("— 解锁验证 —");
  $$('.tab').find(t => t.dataset.tab === "map").click();
  ok(!$$("#scr-map .unitCard").find(c => c.dataset.uid === "u2").classList.contains("locked"), "u2已解锁");

  console.log("— 游戏厅·听音选图(凑满3局) —");
  const arcade = name => { $$('.tab').find(t => t.dataset.tab === "arcade").click(); $$("#scr-arcade .actRow").find(r => r.textContent.includes(name)).click(); };
  arcade("听音选图");
  for (let i = 0; i < 8; i++) {
    await sleep(120);
    const info = zhOf(lastSpoken());
    $$("#scr-play .optBtn").find(b => b.textContent === info.e + info.zh).click();
    await sleep(1000);
  }
  ok($("#scr-result").classList.contains("on"), "听音8题结算");
  ok(S().daily.g === 4, "游戏厅再玩1局 g=4");
  w.eval("bumpDaily('g')");
  ok(S().daily.g === 5 && S().daily.t3 === true, "5局后玩游戏任务完成");
  $("#resBack").click();

  console.log("— 扭蛋机 —");
  w.eval("S.coins=100;save();updateCoinBox();");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  ok($("#scr-reward").classList.contains("on"), "奖励屋显示");
  $("#gachaBtn").click();
  await sleep(1100);
  ok(Object.keys(S().stickers).length === 1, "扭到1张贴纸: " + JSON.stringify(S().stickers));
  ok(S().coins <= 85, "扣了20金币(重复返5): " + S().coins);

  console.log("— 白白收藏册 & 游戏厅 & 每日任务t3 —");
  $("#toAlbum").click();
  ok($("#scr-album").classList.contains("on"), "白白收藏册显示");
  ok(w.eval("STICKERS.length") === 2000, "2000张白白收藏卡");
  ok($$(".albumCell").length === 100, "收藏册按系列每次展示100张，手机不卡顿");
  ok($$(".albumSeriesBtn").length === 20, "2000张分成20个独立收藏系列");
  ok(w.eval("new Set(STICKERS.map(s=>s.n)).size===2000"), "2000张卡名全部唯一，能独立解锁");
  ok(w.eval("STICKERS.every(s=>s.n.includes('白白')&&s.art)"), "★ 扭蛋奖励全部是白白，没有其他狗或动物");
  ok(w.eval("STICKERS.every(s=>!s.tone)&&STICKERS.every(s=>!/<img[^>]+style=/.test(stickerVisual(s)))"), "★ 全部20套闪卡都只换卡片底色，不再给白白本体染色");
  ok(w.eval("duplicateStickerCoins({r:1})===5&&duplicateStickerCoins({r:2})===10&&duplicateStickerCoins({r:3})===15"), "★ 重复卡按稀有度折金币并统一扣除5枚");
  $$('.tab').find(t => t.dataset.tab === "arcade").click();
  ok($$("#scr-arcade .actRow").length === 10, "游戏厅10个入口(含听句子、阶段测验和今日复习)");
  ok(S().daily.t1 === true, "无复习任务时t1(复习)自动完成");
  w.eval("bumpDaily('ph',3)");
  ok(S().daily.t4 === true, "★ 拼读任务(t4)完成");
  ok(S().daily.bonus === true && S().streak === 1, "★ 四项任务齐→bonus+连续1天");

  console.log("— 幸运大转盘 —");
  ok(S().tickets >= 1, "完成每日任务后有转盘券: " + S().tickets);
  const t4 = S().daily.t4;
  ok(typeof t4 === "boolean", "勤奋超额标记存在(earn=" + S().daily.earn + ", t4=" + t4 + ")");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#toWheel").click();
  ok($("#scr-wheel").classList.contains("on"), "转盘页显示");
  ok($$("#scr-wheel .wLabel").length === 8, "默认8个奖品格");
  const tk0 = S().tickets, v0 = S().vouchers.length, c0 = S().coins;
  $("#spinBtn").click();
  await sleep(4600);
  const won = $("#wheelWon .wn");
  ok(!!won, "转出奖品: " + (won && won.textContent));
  const spent = tk0 - S().tickets;
  const gotVoucher = S().vouchers.length === v0 + 1;
  const gotCoin = S().coins > c0;
  const again = spent === 0;
  ok(gotVoucher || gotCoin || again, "奖品正确落账(券" + spent + " 奖励券+" + (S().vouchers.length - v0) + " 金币差" + (S().coins - c0) + ")");

  console.log("— 奖励券兑换 —");
  w.eval("S.vouchers.unshift({n:'📺 看电视30分钟',d:todayStr(),used:false});save();");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#toVoucher").click();
  ok($("#scr-voucher").classList.contains("on"), "奖励券页显示");
  let vbtn = $$("#scr-voucher .vBtn.todo")[0];
  vbtn.click();
  ok(vbtn.textContent === "再点确认", "兑换需二次确认");
  vbtn.click();
  ok(S().vouchers[0].used === true, "确认后标记已兑换");

  console.log("— 家长设置 —");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#parentLink").click();
  ok($("#scr-parent").classList.contains("on") && !!$("#pGate"), "家长密码框显示");
  ok($("#pGate").type === "password", "密码是隐藏输入");
  $("#pGate").value = "000000";
  $("#pGateBtn").click();
  ok(!$("#pAdd"), "★ 错误密码进不去");
  ok($("#pGateMsg").textContent.includes("密码不对"), "提示密码不对");
  $("#pGate").value = "223826";
  $("#pGateBtn").click();
  ok(!!$("#pAdd"), "★ 正确密码 223826 进入设置");
  $("#pNew").value = "🎨 买一支新画笔";
  $("#pAdd").click();
  ok(S().wheel && S().wheel.length === 9 && S().wheel.includes("🎨 买一支新画笔"), "添加自定义奖品");
  $$("#scr-parent .pDel")[0].click();
  ok(S().wheel.length === 8, "删除奖品");
  const tkB = S().tickets;
  $("#pTicket").click();
  ok(S().tickets === tkB + 1, "补发转盘券");
  $("#pReset").click();
  ok(S().wheel === null, "恢复默认奖品");

  console.log("— 14天上新提醒 —");
  w.eval("S.wheelTouched='2026-06-20';save();");   // 23天前
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  ok($("#toWheel .aSub").textContent.includes("该上新奖品啦"), "奖励屋入口显示上新提醒");
  $("#toWheel").click();
  ok($("#scr-wheel").innerHTML.includes("天没换新啦"), "转盘页显示提醒卡");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#parentLink").click();  // parentOK已通过,直达设置
  const expDays = w.eval("wheelAgeDays()");
  ok($("#scr-parent").innerHTML.includes("已 " + expDays + " 天"), "家长设置显示天数(" + expDays + "天)");
  $("#pNew").value = "🍰 周末吃蛋糕";
  $("#pAdd").click();
  ok(S().wheelTouched === w.eval("todayStr()"), "改奖品后计时重置");
  ok($("#scr-parent").innerHTML.includes("今天刚更换过"), "设置页显示今天已更换");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  ok(!$("#toWheel .aSub").textContent.includes("该上新"), "提醒消失");
  w.eval("S.wheel=null;save();");

  console.log("— 主题换装屋 & 音效开关 —");
  w.eval("S.coins=200;save();updateCoinBox();");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#toTheme").click();
  ok($("#scr-theme").classList.contains("on"), "换装屋显示");
  ok($$("#scr-theme .themeCard").length === 5, "5套皮肤");
  const cB = S().coins;
  $$("#scr-theme .themeCard .themeBtn")[1].click();
  ok(S().coins === cB - 60 && S().theme === "mint", "解锁薄荷仙子(扣60金币)");
  ok(w.document.body.className === "th-mint", "body皮肤类已应用");
  $$("#scr-theme .themeCard .themeBtn")[4].click();
  ok(S().theme === "night" && S().coins === cB - 160, "再解锁星空魔法(扣100)");
  $$("#scr-theme .themeCard .themeBtn")[0].click();
  ok(S().theme === "candy" && w.document.body.className === "", "免费切回糖果粉");
  $("#soundBtn").click();
  ok(S().sound === false, "音效可关闭");
  $("#soundBtn").click();
  ok(S().sound === true, "音效可重开");
  $$('.tab').find(t => t.dataset.tab === "home").click();
  ok(!!$("#themeQuick"), "首页🎨快捷入口存在");

  console.log("— 自然拼读 —");
  $$('.tab').find(t => t.dataset.tab === "phonics").click();
  ok($("#scr-phonics").classList.contains("on"), "拼读学院显示");
  ok(w.eval("['三上','三下','四上','四下','五上','五下','六上','六下'].every(b=>PHONICS.some(p=>p.book===b))"), "★ 三至六年级上下册都有自然拼读内容");
  ok($$("#scr-phonics .phonicsGrade").length === 4 && $$("#scr-phonics .gradeFoldBody.collapsed").length === 3, "★ 自然拼读按四个年级折叠");
  $("#scr-phonics .actRow[data-pid='ph1']").click();
  ok($("#scr-phonic").classList.contains("on"), "规则页显示(a-e)");
  ok($$("#phWords .phRow").length === 8, "8个例词可点读（音节+音标行）");
  ok($("#scr-phonic").innerHTML.includes("phKey") && $("#scr-phonic").innerHTML.includes("phIpa"), "★ 例词显示音节色块+音标");
  $("#phGo").click();
  ok(S().phonics.ph1.learned === true, "规则标记已学");
  const PH = w.eval("PHONICS");
  for (let i = 0; i < 6; i++) {
    // 正确答案永远是当前规则 ph1 => 找 label 为 "a-e" 的选项
    const btn = $$("#scr-play .optBtn").find(b => b.textContent.includes("a-e"));
    ok(!!btn, "拼读第" + (i + 1) + "题有正确选项");
    btn.click();
    await sleep(1050);
  }
  ok($("#scr-result").classList.contains("on"), "拼读关卡结算");
  ok(S().phonics.ph1.stars === 3, "拼读拿3星");
  $("#resBack").click();

  console.log("— 跟读打分函数 —");
  ok(w.eval("scoreSay('What time is it?','what time is it')") === 1, "打分:完全正确=1.0");
  ok(w.eval("scoreSay('What time is it?','what time is')") === 0.75, "打分:漏一词=0.75");
  ok(w.eval("scoreSay('What time is it?','')") === 0, "打分:没听到=0");

  console.log("— 魔法大考 —");
  // 词数不足8时应拒绝进入
  w.eval("S.units.u1.learned=S.units.u1.learned.slice(0,7);save()");
  arcade("魔法大考");
  ok(!$("#scr-play").classList.contains("on"), "已学词<8时不能进大考");
  // 补足已学单词后再考
  w.eval("const U1=UNITS.find(u=>u.id==='u1'),U2=UNITS.find(u=>u.id==='u2');S.units.u1.learned=U1.words.map(x=>x.w);S.units.u2={learned:U2.words.map(x=>x.w),stars:0};U1.words.concat(U2.words).forEach(x=>{S.learnedAt[x.w]=todayStr();srsInit(x.w);});save();");
  arcade("魔法大考");
  ok($("#scr-play").classList.contains("on"), "大考开始(已学25词)");
  let examQ = 0;
  while ($("#scr-play").classList.contains("on") && examQ < 20) {
    examQ++;
    await sleep(120);
    let answer;
    const qt = $("#scr-play .qText");
    const sub = $("#scr-play .qSub");
    if (qt) answer = zhOf(qt.textContent).zh;
    else if (sub && sub.textContent.includes("选出英文")) {
      const zh = sub.textContent.split(" ——")[0].trim();
      for (const u of UNITS) for (const x of u.words) if (x.zh === zh) answer = x.w;
    } else answer = zhOf(lastSpoken()).zh;
    const btn = $$("#scr-play .optBtn").find(b => b.textContent.includes(answer));
    btn.click();
    await sleep(900);
  }
  ok($("#scr-result").classList.contains("on"), "大考结算(共" + examQ + "题)");
  ok(S().bestExam === 100, "满分记录100: " + S().bestExam);
  $("#resBack").click();

  console.log("— 家长报告 —");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#parentLink").click();
  $("#pReport").click();
  ok($("#scr-report").classList.contains("on"), "报告页显示");
  const rh = $("#scr-report").innerHTML;
  ok(rh.includes("掌握单词") && rh.includes("总正确率") && rh.includes("最近7天"), "三大板块齐全");
  ok(Object.keys(S().history).length >= 1, "历史记录已积累: " + JSON.stringify(S().history));
  const h = S().history[w.eval("todayStr()")];
  ok(h.total > 0 && h.right > 0, "今日答题统计 right/total = " + h.right + "/" + h.total);
  w.eval("goBack()");

  console.log("— 备份与恢复 —");
  $("#pBackup").click();
  ok($("#scr-backup").classList.contains("on"), "备份页显示");
  const code = $("#bkOut").value;
  ok(code.length > 100, "生成备份码 " + (code.length / 1024).toFixed(1) + "KB");
  const coinsBefore = S().coins, starsBefore = S().units.u1.stars;
  w.eval("S=defState();save();");           // 模拟清档
  ok(w.eval("S.coins") === 0, "已清档");
  ok(w.eval("importCode(" + JSON.stringify(code) + ")") === true, "导入备份码成功");
  ok(S().coins === coinsBefore && S().units.u1.stars === starsBefore, "进度完整恢复(金币" + S().coins + " 星" + S().units.u1.stars + ")");
  ok(w.eval("importCode('这不是备份码')") === false, "错误备份码被拒绝");

  console.log("— 刷任务漏洞修复 —");
  w.eval("S.daily.w=0;S.daily.g=0;save();");
  ok(S().units.u1.learned.length === UNITS.find(u=>u.id==="u1").words.length, "u1已全部学完(复习模式)");
  const wBefore = S().daily.w;
  w.eval("(function(){const u=UNITS[0];const us=unitS(u.id);const wd=u.words[0];if(us.learned.includes(wd.w)){recordRight(wd.w);}else{}})()");
  ok(S().daily.w === wBefore, "复习旧词不再计入「学会新单词」任务");
  ok(w.eval("noFreshWords()") === false, "还有未解锁/未学完单元时 noFreshWords=false");

  console.log("— 音频解锁与自检 —");
  ok(w.eval("audioReady") === true, "首次点击后音频已解锁");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#parentLink").click();
  $("#pAudio").click();
  ok($("#scr-audio").classList.contains("on"), "发音自检页显示");
  const ah = $("#scr-audio").innerHTML;
  ok(ah.includes("真人发音包") && ah.includes("音效通道"), "自检项齐全(含真人发音包状态)");
  ok(ah.includes("静音开关") && ah.includes("620"), "含排查清单 + 620条发音就绪");
  const before = played.length;
  $("#acTest").click();
  await sleep(120);
  ok(played.length > before, "测试按钮播放真人mp3: " + played[played.length - 1]);
  ok(lastSpoken() === "cake", "播放的正是 cake 的录音");
  w.eval("goBack()");

  console.log("— 打卡日历 + 学习周期奖励 —");
  $$('.tab').find(t => t.dataset.tab === "home").click();
  ok($("#scr-home").innerHTML.includes("打卡日历"), "首页底部有打卡日历");
  ok($$("#scr-home .calCell").length > 27, "日历渲染出本月格子: " + $$("#scr-home .calCell").length);
  ok($$("#scr-home .calW").length === 7, "有星期表头");
  ok($$("#scr-home .calCell.today").length === 1, "今天有高亮标记");
  // 今天已完成全部任务 → 应已打卡
  ok(S().daily.bonus === true, "今天四项任务已完成");
  ok(!!S().checkins[w.eval("todayStr()")], "★ 完成全部任务 = 今天打卡成功");
  ok($$("#scr-home .calCell.done").length >= 1, "今天格子显示🔥");
  ok($("#scr-home").innerHTML.includes("本学习周期"), "显示周期进度条");
  ok(w.eval("cycleProgress()") === 1, "周期进度 1/7");
  ok($("#scr-home").innerHTML.includes("再坚持 <b>6</b> 天"), "提示还差6天");

  console.log("— 满 7 天 → 奖励 2 张转盘券 —");
  const tkBefore = S().tickets, cyc0 = S().cyclesPaid;
  // 补前 6 天打卡（凑满一个周期）
  w.eval("for(let i=1;i<=6;i++) S.checkins[dateAdd(-i)]=1; save(); checkCycle();");
  ok(w.eval("checkinCount()") === 7, "累计打卡 7 天");
  ok(S().cyclesPaid === cyc0 + 1, "★ 完成第 1 个学习周期");
  ok(S().tickets === tkBefore + 2, "★ 奖励 2 张转盘券: " + tkBefore + " → " + S().tickets);
  // 不重复发
  const tk2 = S().tickets;
  w.eval("checkCycle()");
  ok(S().tickets === tk2, "同一周期不会重复发奖");
  // 再满 7 天 → 再发 2 张
  w.eval("for(let i=7;i<=13;i++) S.checkins[dateAdd(-i)]=1; save(); checkCycle();");
  ok(w.eval("checkinCount()") === 14 && S().cyclesPaid === 2, "累计14天 = 2个周期");
  ok(S().tickets === tk2 + 2, "★ 第2个周期再奖励2张券");
  // 日历刷新
  $$('.tab').find(t => t.dataset.tab === "home").click();
  ok($("#scr-home").innerHTML.includes("已完成 2 个周期"), "首页显示已完成周期数");
  ok($$("#scr-home .calCell.done").length >= 7, "日历上多日显示🔥: " + $$("#scr-home .calCell.done").length);

  console.log("— 老存档迁移（打卡） —");
  w.eval("S.checkins={};S.cyclesPaid=0;S.lastDaily=todayStr();save();migrateCheckins();");
  ok(w.eval("checkinCount()") === 1, "老存档按 lastDaily 补一天打卡");

  console.log("— 句子小火车：读完整句才翻页 —");
  $$('.tab').find(t => t.dataset.tab === "arcade").click();
  $$("#scr-arcade .actRow").find(r => r.textContent.includes("句子小火车")).click();
  ok($("#scr-play").classList.contains("on"), "进入句子小火车");
  {
    const zh = $("#scr-play .card").textContent;
    // 拼出正确句子：按 AUDIO_MAP 里的原句反查
    const SENTS = [];
    UNITS.forEach(u => u.sents.forEach(s => SENTS.push(s)));
    const target = SENTS.find(s => zh.includes(s.zh));
    ok(!!target, "找到当前句: " + (target && target.en));
    for (const word of target.en.split(" ")) {
      const chip = $$("#sentPool .chip").find(c => c.textContent === word && !c.dataset.used);
      chip.dataset.used = "1";
      chip.click();
      await sleep(30);
    }
    const playedBefore = played.length;
    $("#sentCheck").click();
    await sleep(150);
    ok(played.length > playedBefore, "答对后开始朗读整句");
    ok(REV[played[played.length - 1]] === target.en, "朗读的正是这句: " + target.en);
    // 关键：音频没播完时，不能翻页
    ok($("#scr-play").innerHTML.includes("听一遍") || $("#sentCheck").disabled, "朗读期间按钮锁定");
    const stillSame = $("#scr-play .card").textContent.includes(target.zh);
    ok(stillSame, "★ 音频还没播完时，句子没有跳走（原 bug 已修）");
    // 触发音频结束 → 才翻页
    w.eval("AUD_ENDED()");
    await sleep(800);
    ok(!$("#scr-play .card").textContent.includes(target.zh) || $("#scr-result").classList.contains("on"), "★ 音频播完后才翻到下一句");
  }
  w.eval("goBack()");

  console.log("— 魔法回声：iPhone(无语音识别) 走录音模式 —");
  ok(w.eval("typeof SR === 'undefined' || !SR"), "模拟 iPhone：不支持语音识别");
  ok(w.eval("echoMode()") === "record", "无语音识别但能录音 → record 模式（iPhone 就是这种）");
  $$('.tab').find(t => t.dataset.tab === "arcade").click();
  const echoRow = $$("#scr-arcade .actRow").find(r => r.textContent.includes("魔法回声"));
  ok(echoRow.textContent.includes("录下自己的声音"), "游戏厅副标题按模式提示");
  echoRow.click();
  ok($("#scr-echo").classList.contains("on"), "进入魔法回声");
  ok(!$("#scr-echo").innerHTML.includes("不支持"), "★ 不再显示「不支持语音识别」死胡同（原 bug）");
  ok(!!$("#echoMic") && $("#echoMic").textContent.includes("录音"), "显示录音按钮");
  ok(!!$("#echoPlay"), "有听标准发音按钮");
  // 点录音 → 授权 → 录 → 停
  $("#echoMic").click();
  await sleep(80);
  ok(w.eval("typeof MediaRecorder") === "function", "MediaRecorder 桩就位");
  ok($("#echoMic").textContent.includes("再点一下结束"), "录音中状态正确");
  $("#echoMic").click();          // 停止录音
  await sleep(120);
  ok(!!$("#playMine") && !!$("#playStd"), "★ 录完出现「我读的」和「标准发音」对比按钮");
  ok($$("#echoScore [data-self]").length === 3, "★ 有三档自评（很像/还行/再练练）");
  const q1 = $("#scr-echo #playProg").textContent;
  $$("#echoScore [data-self]")[0].click();   // 自评 ⭐⭐⭐
  await sleep(120);
  ok($("#scr-echo #playProg").textContent !== q1, "自评后进入下一句 (" + q1 + " → " + $("#scr-echo #playProg").textContent + ")");
  // 跳过剩下的，验证结算
  let guardE = 0;
  while ($("#echoSkip") && guardE++ < 8) { $("#echoSkip").click(); await sleep(60); }
  ok($("#scr-result").classList.contains("on"), "跟读结算页出现");
  ok(S().coins > 0, "跟读有金币奖励");
  $("#resBack").click();

  console.log("— 白白收藏卡 —");
  const STICKERS = w.eval("STICKERS");
  // 先给两张白白收藏卡
  w.eval(`S.stickers={${JSON.stringify(STICKERS[0].n)}:1, ${JSON.stringify(STICKERS[5].n)}:1};save();`);
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#toAlbum").click();
  ok($("#scr-album").classList.contains("on"), "白白收藏册显示");
  ok($("#scr-album").textContent.includes("这里只有白白"), "★ 收藏册明确只收集白白");
  ok($("#scr-album").innerHTML.includes("集齐奖励"), "收藏册有集齐奖励进度");
  ok($$("#scr-album .albumCell img").length === 100 && w.eval("STICKERS.every(s=>!!s.art)"), "五个系列的每张收藏卡都有白白图片");
  // 点未拥有的卡片 → 拒绝
  const cells = $$("#scr-album .albumCell");
  const lockedCell = cells.find(c => c.classList.contains("no"));
  ok(lockedCell.querySelector("img")?.src.endsWith("/assets/baibai-base.png"), "★ 未获得卡使用PNG灰色白白占位，兼容旧iPad Safari");
  lockedCell.click();
  ok(!w.document.getElementById("decoPick"), "未拥有的白白卡不能打开");
  // 点已拥有 → 打开收藏大图，不再把另一只动物贴到白白身上
  cells[0].click();
  ok(!!w.document.getElementById("decoPick") && !!$("#decoPick .stickerPreview"), "已拥有的卡片可打开白白大图");
  const previewCardStyle = w.getComputedStyle($("#decoPick .decoCard"));
  ok(previewCardStyle.display === "flex" && previewCardStyle.alignItems === "center", "★ 收藏卡大图与外层白框严格水平居中");
  ok(!$("#asHat") && !$("#asBuddy"), "★ 收藏卡不再冒充可穿戴衣服或另一只伙伴");
  $("#decoCancel").click();
  ok(S().hat === null && S().buddy === null, "旧动物头饰和小伙伴槽保持清空");

  console.log("— 集齐奖励 —");
  const setTk0 = S().tickets;
  // 集齐全部「传说」款(r=3)
  w.eval(`STICKERS.filter(s=>s.r===3).forEach(s=>S.stickers[s.n]=1);save();checkStickerSets();`);
  ok(S().setDone.r3 === true, "集齐传说款已标记");
  ok(S().tickets === setTk0 + 2, "集齐传说 → +2 转盘券: " + setTk0 + " → " + S().tickets);
  // 不会重复发奖
  const setTk1 = S().tickets;
  w.eval("checkStickerSets()");
  ok(S().tickets === setTk1, "集齐奖励只发一次");
  // 集齐普通款 → +1
  w.eval(`STICKERS.filter(s=>s.r===1).forEach(s=>S.stickers[s.n]=1);save();checkStickerSets();`);
  ok(S().tickets === setTk1 + 1, "集齐普通 → +1 转盘券");
  ok(w.eval("setComplete(2)") === false, "稀有款尚未集齐");

  console.log("— 间隔重复调度器(SRS) —");
  // 学会的词自动排程：明天第一次复习
  const anyLearned = S().units.u1.learned[0];
  ok(!!S().srs[anyLearned], "学会的词自动进入复习计划");
  ok(S().srs[anyLearned].lv === 1, "初始记忆等级=1");
  ok(S().srs[anyLearned].due === w.eval("dateAdd(1)"), "首次复习安排在明天: " + S().srs[anyLearned].due);
  ok(S().srs[anyLearned].due > w.eval("todayStr()"), "刚学会的词今天不到期(明天才复习)");

  // 到期→答对→升级，间隔按 1/2/4/7/15/30 拉长
  const steps = w.eval("SRS_STEPS");
  ok(JSON.stringify(steps) === "[1,2,4,7,15,30]", "间隔阶梯 1/2/4/7/15/30 天");
  const tw = anyLearned;
  for (let lv = 1; lv <= 6; lv++) {
    w.eval(`S.srs[${JSON.stringify(tw)}].due = todayStr(); save();`);  // 手动到期
    const before = S().srs[tw].lv;
    w.eval(`recordRight(${JSON.stringify(tw)})`);
    const after = S().srs[tw].lv;
    if (lv < 6) ok(after === before + 1, "到期答对: 等级 " + before + " → " + after + "，下次 " + S().srs[tw].due);
    else ok(after === 6 && S().srs[tw].due === w.eval("dateAdd(30)"), "满级(6级)封顶，间隔30天");
  }
  // 防刷：没到期的词答对不升级
  w.eval(`S.srs[${JSON.stringify(tw)}] = {lv:3, due: dateAdd(5)}; save();`);
  w.eval(`recordRight(${JSON.stringify(tw)}); recordRight(${JSON.stringify(tw)});`);
  ok(S().srs[tw].lv === 3 && S().srs[tw].due === w.eval("dateAdd(5)"), "未到期的词反复答对不会升级(防刷)");
  // 答错一律打回1级、明天重练
  w.eval(`recordWrong(${JSON.stringify(tw)})`);
  ok(S().srs[tw].lv === 1 && S().srs[tw].due === w.eval("dateAdd(1)"), "答错→打回1级，明天重练");

  console.log("— 今日复习包 —");
  // 造 10 个到期词
  w.eval(`Object.keys(S.learnedAt).slice(0,10).forEach(x=>{S.srs[x]={lv:1,due:todayStr()}});save();`);
  const dc0 = w.eval("dueCount()");
  ok(dc0 >= 5, "到期词数量: " + dc0);
  $$('.tab').find(t => t.dataset.tab === "home").click();
  ok($$("#scr-home .taskRow")[0].textContent.includes(String(dc0)), "★ 首页第1行(复习)显示到期词数: " + dc0);
  ok($("#scr-home").innerHTML.includes("刚学会") && $("#scr-home").innerHTML.includes("记牢了"), "首页显示记忆分层");
  $$("#scr-home .taskRow")[0].click();
  ok($("#scr-play").classList.contains("on"), "★ 点第1行直接进入今日复习");
  ok($("#playHead").innerHTML.includes("记忆等级"), "显示当前词的记忆等级");
  let dq = 0;
  while ($$("#scr-play .optBtn").length && dq < 15) {
    dq++;
    await sleep(120);
    let answer;
    const qt = $("#scr-play .qText"), sub = $("#scr-play .qSub").textContent;
    if (qt) answer = zhOf(qt.textContent).zh;
    else if (sub.includes("英文是哪个")) {
      const zh = sub.split(" ——")[0].trim();
      for (const u of UNITS) for (const x of u.words) if (x.zh === zh) answer = x.w;
    } else answer = zhOf(lastSpoken()).zh;
    $$("#scr-play .optBtn").find(b => b.textContent.includes(answer)).click();
    await sleep(1000);
  }
  ok($("#scr-result").classList.contains("on"), "复习包结算(共" + dq + "题)");
  ok(w.eval("dueCount()") < dc0, "复习后到期词减少: " + dc0 + " → " + w.eval("dueCount()"));
  ok(S().daily.r >= 3 && S().daily.t3 === true, "复习任务t3完成 r=" + S().daily.r);
  const anyUp = Object.values(S().srs).some(s => s.lv >= 2);
  ok(anyUp, "复习答对的词记忆等级已提升");
  $("#resBack").click();

  console.log("— 老存档迁移 —");
  w.eval("S.srs={};S.learnedAt={};save();migrateSRS();");
  const migrated = Object.keys(S().srs).length;
  ok(migrated > 0, "老存档的已学词自动补上复习排程: " + migrated + " 个");
  ok(Object.values(S().srs).every(s => s.due === w.eval("todayStr()")), "迁移的词全部安排为今天到期");

  console.log("— 测试模式 —");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#parentLink").click();
  ok($("#pTest").textContent === "已关闭", "默认关闭");
  $("#pTest").click();
  ok(S().testMode === true && $("#pTest").textContent === "已开启", "可开启测试模式");
  ok(!!$("#tCoin") && !!$("#tSkin") && !!$("#tCards") && !!$("#tReset"), "测试工具按钮出现");
  const realStickerCount = Object.keys(S().stickers).length;
  $("#tCards").click();
  ok($("#scr-album").textContent.includes("2000 / 2000") && $$("#scr-album .albumCell.no").length === 0, "★ 测试模式收藏册显示全部2000张，当前系列100张全部点亮");
  ok($$("#scr-album .albumSeriesBtn small").every(x => x.textContent === "100/100"), "★ 20个卡片系列在测试模式都显示100/100");
  $$("#scr-album .albumCell")[99].click();
  ok(!!$("#decoPick .stickerPreview"), "★ 未真实获得的测试卡也能打开大图校对");
  $("#decoCancel").click();
  ok(Object.keys(S().stickers).length === realStickerCount, "★ 校对全部卡片不写入真实收藏存档");
  // 全部单元解锁
  $$('.tab').find(t => t.dataset.tab === "map").click();
  ok($$("#scr-map .unitCard.locked").length === 0, "测试模式下全部单元解锁");
  ok(!!$("#scr-home") && true, "占位");
  // 皮肤免费 + 文字提示
  w.eval("S.coins=0;S.themesOwned=['candy'];save();updateCoinBox();");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#toTheme").click();
  ok($("#scr-theme").innerHTML.includes("测试模式：全部皮肤免费"), "换肤页有测试模式提示");
  ok($$("#scr-theme .themeCard .themeBtn")[4].textContent === "免费穿上", "锁定皮肤按钮显示「免费穿上」");
  $$("#scr-theme .themeCard .themeBtn")[4].click();
  ok(S().theme === "night" && S().coins === 0, "测试模式下皮肤0金币可换");
  // 首页横幅
  $$('.tab').find(t => t.dataset.tab === "home").click();
  ok(!!$("#testBanner"), "首页显示测试模式横幅");
  // 工具按钮
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#parentLink").click();
  $("#tCoin").click();
  ok(S().coins >= 1000, "+1000金币: " + S().coins);
  $("#tTicket").click();
  ok(S().tickets >= 5, "+5转盘券");
  $("#tWords").click();
  const allW = UNITS.reduce((a, u) => a + u.words.length, 0);
  const mk = Object.keys(S().units).reduce((a, k) => a + S().units[k].learned.length, 0);
  ok(mk === allW, "全部单词标记已学: " + mk + "/" + allW);
  $("#tWrong").click();
  ok(Object.keys(S().wrong).length >= 5, "造出错词: " + Object.keys(S().wrong).length + " 个");
  // 重置今日任务
  const streakBefore = S().streak;
  ok(S().daily.t1 === true || S().daily.w > 0, "重置前今日已有进度");
  $("#tDaily").click();
  const d = S().daily;
  ok(d.w === 0 && d.g === 0 && d.r === 0 && d.earn === 0, "计数归零");
  ok(d.t1 === false && d.t2 === false && d.t3 === false && d.t4 === false && d.bonus === false, "任务标记归零");
  ok(S().streak === streakBefore, "连续天数不受影响: " + S().streak);
  $$('.tab').find(t => t.dataset.tab === "home").click();
  ok($("#scr-home").innerHTML.includes("0/8") || $("#scr-home").innerHTML.includes("0/2"), "首页任务重新显示为未完成");
  $$('.tab').find(t => t.dataset.tab === "reward").click();
  $("#parentLink").click();
  // 清空
  let tr = $("#tReset"); tr.click();
  ok(tr.textContent.includes("再点一次"), "清空需二次确认");
  tr.click();
  ok(S().coins === 0 && w.eval("masteredCount()") === 0 && Object.keys(S().srs).length === 0 && S().testMode === true, "已清空进度(词/金币/复习计划归零)但保留测试模式");
  // 关闭测试模式后恢复锁
  $("#pTest").click();
  ok(S().testMode === false, "可关闭测试模式");
  w.eval("albumEdition='classic';renderAlbum()");
  ok($$("#scr-album .albumCell.no").length > 0 && !$("#scr-album").textContent.includes("2000 / 2000"), "★ 关闭测试模式后恢复真实收藏与灰色未解锁卡");
  $$('.tab').find(t => t.dataset.tab === "map").click();
  ok($$("#scr-map .unitCard.locked").length === 41, "关闭后重新上锁（九册各第一单元开放）");
  // 还原一份进度供后续断言
  ok(w.eval("importCode(" + JSON.stringify(code) + ")") === true, "恢复测试前进度");

  console.log("— 存档持久化 —");
  const saved = JSON.parse(w.localStorage.getItem("magicEnglish_v1"));
  ok(saved.units.u1.stars === 3 && saved.coins === S().coins, "localStorage已写入");

  console.log("\n结果: " + pass + " 通过, " + fail + " 失败");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("异常:", e); process.exit(1); });

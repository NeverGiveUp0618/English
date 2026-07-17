/* 白白专属中文小奶狗声线：中文、童声音调、互动覆盖、中英文不叠音 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const DIR = require("path").resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗ FAIL"} ${m}`); };

const html = fs.readFileSync(DIR + "/index.html", "utf8").replace(/<script src="[^"]+"><\/script>/g, "");
const dom = new JSDOM(html, { runScripts:"dangerously", url:"https://nevergiveup0618.github.io/English/", pretendToBeVisual:true });
const w = dom.window, spoken = [], audios = [];
w.SpeechSynthesisUtterance = function(t) { this.text = t; };
w.speechSynthesis = {
  speaking:false, pending:false, paused:false,
  cancel(){}, resume(){}, speak(u){ spoken.push(u); },
  getVoices:()=>[
    {name:"Samantha",lang:"en-US"},
    {name:"Xiaoxiao",lang:"zh-CN"}
  ]
};
w.AudioContext = function(){ return {state:"running",resume(){},currentTime:0,destination:{},createOscillator:()=>({frequency:{value:0},connect(){},start(){},stop(){}}),createGain:()=>({connect(){},gain:{value:0,exponentialRampToValueAtTime(){}}})}; };
w.Audio = function(){ const a={src:"",paused:true,onended:null,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};audios.push(a);return a; };
for (const f of ["audio/manifest.js","data.js","app.js"]) {
  const sc=w.document.createElement("script");sc.textContent=fs.readFileSync(DIR+"/"+f,"utf8");w.document.body.appendChild(sc);
}
const $=s=>w.document.querySelector(s), $$=s=>[...w.document.querySelectorAll(s)];
const zhSpoken=()=>spoken.filter(x=>x.lang==="zh-CN");

(async()=>{
  console.log("白白中文小奶狗声线");
  spoken.length=0;
  $("#petShow").click();
  await sleep(320);
  const home=zhSpoken().at(-1);
  ok(home && !/[A-Za-z]/.test(home.text), "点首页白白，说的是纯中文鼓励");
  ok(home && home.lang==="zh-CN" && home.pitch>=1.5 && home.rate>1, "使用中文高音调、轻快语速的小奶狗声线");
  ok(home && home.voice && home.voice.name==="Xiaoxiao", "优先选中设备里的中文童声");

  spoken.length=0;
  w.eval("saveWallet({coins:100,tickets:0});S.coins=100;navStack=[renderCare];renderCare();");
  $$(".careBtn")[0].click();
  await sleep(320);
  const care=zhSpoken().at(-1);
  ok(care && care.text.includes("好香呀") && !care.text.includes("咂咂嘴"), "喂食后白白用中文说出台词，不朗读动作旁白");

  spoken.length=0;
  w.eval("speak('cake');showBaibaiReaction('right','我等你听完英语再说！');");
  await sleep(260);
  ok(zhSpoken().length===0, "英语单词播放期间白白不会插话或叠音");
  const aud=w.eval("AUD"); if(aud.onended) aud.onended();
  await sleep(340);
  ok(zhSpoken().at(-1)?.text==="我等你听完英语再说！", "英语结束后白白才接着用中文回应");

  spoken.length=0;
  w.eval("showBaibaiReaction('try','再试一次，我陪着你。');stopSpeak();");
  await sleep(320);
  ok(zhSpoken().length===0, "离开页面会取消尚未说出的白白台词");

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});

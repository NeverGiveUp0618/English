#!/usr/bin/env python3
"""Generate the fixed Mandarin voice lines used by Baibai in the English app."""
import asyncio, hashlib, json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "audio" / "baibai"
VOICE = "zh-CN-XiaoyiNeural"  # Cartoon / Lively：当前通道稳定支持的中文动漫角色音色
LINES = [
  "没关系，我们发现了一个新线索！", "再试一次，我陪着你。", "答错也在变聪明，慢慢来～",
  "完成啦！我们配合得真棒！", "今天又向前走了一步！", "白白一直知道你能做到！",
  "答对啦！", "就是这样！", "好厉害，我都记住了！",
  "干得漂亮！", "你太棒了！", "继续加油！", "好极了！", "我相信你！", "你是超级明星！",
  "好香呀，我吃饱啦！", "洗得香喷喷，抱一下吧！", "再玩一次嘛！", "你最懂我啦！", "今天想一起做什么呀？",
  "今天的魔法收集完成！现在放心去玩吧～", "你已经跨过最难的开头啦，再走一小步！",
  "刚才那局很有勇气，答错也算发现了线索！", "我看到你认真试过了，这就很了不起！",
  "不用一下子全会，我们先玩一小关吧！", "我等你听完英语再说！"
]

def filename(text): return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12] + ".mp3"

async def main():
  OUT.mkdir(parents=True, exist_ok=True); manifest = {}
  for i, text in enumerate(LINES, 1):
    name = filename(text); manifest[text] = "audio/baibai/" + name; target = OUT / name
    print(f"[{i}/{len(LINES)}] {text}")
    # 轻微升调 + 略慢：奶声奶气但不尖、不像变声器。
    await edge_tts.Communicate(text, VOICE, rate="-5%", pitch="+6Hz", volume="-2%").save(str(target))
  (OUT / "manifest.js").write_text("globalThis.BAIBAI_AUDIO = " + json.dumps(manifest, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
  print(f"Generated {len(manifest)} lines with {VOICE}")

asyncio.run(main())

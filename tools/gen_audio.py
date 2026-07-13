#!/usr/bin/env python3
"""
从 data.js 提取全部英文文本，用 edge-tts 合成 mp3 到 audio/，并写出 audio/manifest.js。

用法：
    python3 tools/gen_audio.py                      # 用默认声音
    python3 tools/gen_audio.py en-US-AriaNeural     # 换个声音（会全部重新生成）

说明：
- 人教版PEP是美式发音，所以只在 en-US 声音里挑；教材录音风格＝成人、清晰、平稳、稍慢。
- 单词读慢一点（WORD_RATE），句子稍慢（SENT_RATE），方便小学生跟读。
- 改了 data.js 新增单词/句子后，必须重跑本脚本，否则新内容没有发音。
- 换声音时会先清空 audio/*.mp3，避免新旧声音混在一起。
"""
import asyncio, json, re, os, sys, glob, hashlib
import edge_tts

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(DIR, "audio")

VOICE = sys.argv[1] if len(sys.argv) > 1 else "en-US-JennyNeural"
WORD_RATE = "-15%"
SENT_RATE = "-10%"
VOICE_FILE = os.path.join(OUT, ".voice")

os.makedirs(OUT, exist_ok=True)
data = open(os.path.join(DIR, "data.js"), encoding="utf-8").read()

words = set(re.findall(r'\bw:\s*"([^"]+)"', data))        # 单词、拼读例词
sents = set(re.findall(r'\ben:\s*"([^"]+)"', data))       # 句型、鼓励语
sents.add("Hello! I am your English pet.")                # 发音自检用
words -= sents

prev = open(VOICE_FILE).read().strip() if os.path.exists(VOICE_FILE) else ""
if prev != VOICE:
    for f in glob.glob(os.path.join(OUT, "*.mp3")):
        os.remove(f)
    print(f"声音由 [{prev or '无'}] 换成 [{VOICE}]，已清空旧音频")

items = [(t, WORD_RATE) for t in sorted(words)] + [(t, SENT_RATE) for t in sorted(sents)]
print(f"声音 {VOICE}｜单词 {len(words)} 条({WORD_RATE})｜句子 {len(sents)} 条({SENT_RATE})")


def slug(t):
    s = re.sub(r"[^a-z0-9]+", "_", t.lower()).strip("_")[:40]
    return f"{s}_{hashlib.sha1(t.encode()).hexdigest()[:6]}.mp3"


async def one(t, rate, retries=3):
    path = os.path.join(OUT, slug(t))
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return t, slug(t), "cached"
    for i in range(retries):
        try:
            await edge_tts.Communicate(t, VOICE, rate=rate).save(path)
            if os.path.getsize(path) > 500:
                return t, slug(t), "ok"
        except Exception as e:
            if i == retries - 1:
                return t, None, f"FAIL {e}"
            await asyncio.sleep(1.5)
    return t, None, "FAIL empty"


async def main():
    sem = asyncio.Semaphore(6)

    async def run(t, r):
        async with sem:
            return await one(t, r)

    results = await asyncio.gather(*[run(t, r) for t, r in items])
    mapping = {t: f for t, f, _ in results if f}
    fails = [(t, s) for t, f, s in results if not f]

    print(f"成功 {len(mapping)}/{len(items)}，失败 {len(fails)}")
    for t, s in fails[:10]:
        print("  ✗", t, s)
    if fails:
        return 1

    with open(os.path.join(OUT, "manifest.js"), "w", encoding="utf-8") as fp:
        fp.write(f"/* 自动生成，勿手改。声音：{VOICE}｜单词{WORD_RATE} 句子{SENT_RATE} */\n")
        fp.write("const AUDIO_MAP = " + json.dumps(mapping, ensure_ascii=False, indent=0) + ";\n")
    open(VOICE_FILE, "w").write(VOICE)

    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in mapping.values())
    print(f"音频总大小 {total/1024/1024:.2f} MB → {OUT}")
    return 0


sys.exit(asyncio.run(main()))

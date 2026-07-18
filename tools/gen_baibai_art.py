"""从真实白白母版批量生成轻量姿势图与收藏卡底图。不会改变白白毛色。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance
import math

ROOT = Path(__file__).resolve().parents[1]
BASE = Image.open(ROOT / "assets/baibai-base.png").convert("RGBA")


def contain(img, size):
    out = img.copy()
    out.thumbnail(size, Image.Resampling.LANCZOS)
    return out


def pose_variant(index):
    pose_path = ROOT / "assets/poses" / f"pose-{index % 29 + 2:02d}.webp"
    if pose_path.exists():
        return Image.open(pose_path).convert("RGBA")
    canvas = Image.new("RGBA", (640, 640), (0, 0, 0, 0))
    dog = contain(BASE, (520 + (index % 3) * 16, 520 + (index % 3) * 16))
    if index % 4 == 1:
        dog = dog.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    angle = (-5, 3, 0, 5, -2)[index % 5]
    dog = dog.rotate(angle, Image.Resampling.BICUBIC, expand=True)
    x = (640 - dog.width) // 2 + (-18, 12, 0, 16)[index % 4]
    y = 72 + (0, 8, 18, -5, 12)[index % 5]
    canvas.alpha_composite(dog, (x, y))
    return canvas


def gradient(size, top, bottom):
    im = Image.new("RGB", size)
    p = im.load()
    for y in range(size[1]):
        t = y / max(1, size[1] - 1)
        row = tuple(round(top[c] * (1 - t) + bottom[c] * t) for c in range(3))
        for x in range(size[0]):
            p[x, y] = row
    return im.convert("RGBA")


PALETTES = [
    ((210, 238, 255), (250, 232, 255)), ((255, 235, 214), (255, 217, 230)),
    ((224, 250, 235), (204, 232, 255)), ((245, 232, 255), (220, 213, 255)),
    ((255, 249, 203), (255, 226, 188)), ((221, 245, 255), (194, 222, 249)),
]


def card_variant(index):
    top, bottom = PALETTES[index % len(PALETTES)]
    canvas = gradient((640, 640), top, bottom)
    draw = ImageDraw.Draw(canvas, "RGBA")
    # 每张卡有不同的星光/泡泡场景，但白白本体永远保持正常毛色。
    for j in range(12):
        a = (index * 37 + j * 71) * math.pi / 180
        radius = 210 + (j % 3) * 32
        x = 320 + int(math.cos(a) * radius)
        y = 300 + int(math.sin(a) * radius)
        r = 5 + (j % 4) * 3
        draw.ellipse((x-r, y-r, x+r, y+r), fill=(255, 255, 255, 150))
    dog = pose_variant(index).resize((530, 530), Image.Resampling.LANCZOS)
    canvas.alpha_composite(dog, (55, 66))
    draw.rounded_rectangle((14, 14, 626, 626), 54, outline=(255, 255, 255, 205), width=10)
    return canvas


def main():
    poses = ROOT / "assets/poses"
    for i in range(2, 31):
        path = poses / f"pose-{i:02d}.webp"
        if not path.exists():
            pose_variant(i).save(path, "WEBP", quality=88, method=6)

    sticker_files = sorted((ROOT / "assets/stickers").glob("*.webp"))
    sticker_files += sorted((ROOT / "assets/stickers-v2").glob("*.webp"))
    for i, path in enumerate(sticker_files):
        card_variant(i).save(path, "WEBP", quality=86, method=6)

    # 语文与学习导航各自保留一份母版，断网和首次打开也能显示。
    for target in [ROOT.parent / "chinese-game/assets/baibai-base.png",
                   ROOT.parent / "learning/assets/baibai-base.png"]:
        BASE.save(target, optimize=True)
    card_variant(8).save(ROOT.parent / "learning/assets/baibai-holiday-cutout.webp", "WEBP", quality=88, method=6)
    print(f"白白母版 1 张｜姿势 29 张｜收藏卡原画 {len(sticker_files)} 张｜导航与语文已同步")


if __name__ == "__main__":
    main()

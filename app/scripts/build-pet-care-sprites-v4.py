"""从既有静态图和反应帧生成宠物照料 WebP 精灵图。"""

from pathlib import Path
import json
import math
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1] / "src/static/pets"
SIZE = 400
STEPS = [0, .12, .28, .48, .72, 1, 1, .72, .4, 0]
STAGES = {"cat": {"nursing": "v2", "juvenile": "v2", "growth": "v1"},
          "dog": {"nursing": "v1", "juvenile": "v1", "growth": "v1"},
          "rabbit": {"nursing": "v3", "juvenile": "v3", "growth": "v3"}}
# 每个阶段仅替换眼睛、嘴和脸颊附近的表情；身体、坐垫、耳朵与尾巴始终沿用原图。
FACE = {"cat": {"nursing": (170, 176, 92, 67), "juvenile": (175, 162, 94, 73), "growth": (196, 150, 86, 65)},
        "dog": {"nursing": (172, 150, 78, 65), "juvenile": (178, 153, 82, 68), "growth": (178, 148, 78, 65)},
        "rabbit": {"nursing": (239, 178, 77, 58), "juvenile": (235, 179, 82, 61), "growth": (243, 175, 73, 56)}}


def fit(image):
    """同一画布与缩放算法锁定宠物位置，避免切换帧时跳动。"""
    image = image.convert("RGBA")
    image.thumbnail((SIZE, SIZE), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE))
    canvas.alpha_composite(image, ((SIZE - image.width) // 2, (SIZE - image.height) // 2))
    return canvas


def heart(draw, cx, cy, radius, opacity):
    """上浮爱心叠在渐变表情上，面积和透明度逐帧增加。"""
    points = []
    for i in range(33):
        t = 2 * math.pi * i / 32
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t))
        points.append((cx + x * radius / 18, cy + y * radius / 18))
    draw.polygon(points, fill=(240, 98, 181, opacity))


def droplets(draw, progress):
    """水滴沿宠物右侧向下移动，并随清洁动作渐入渐出。"""
    opacity = int(190 * min(1, progress * 2))
    for x, y, r in [(285, 70, 8), (310, 112, 6), (274, 156, 5)]:
        yy = y + int(progress * 22)
        draw.ellipse((x-r, yy-r, x+r, yy+r), fill=(83, 190, 233, opacity))
        draw.polygon([(x, yy-r-7), (x-r+1, yy), (x+r-1, yy)], fill=(83, 190, 233, opacity))


def reveal(base, reaction, species, stage, index):
    """只切换脸部表情，避免独立绘制的反应图把整只宠物或坐垫带着位移。"""
    if index < 3 or index > 7:
        return base.copy()
    cx, cy, rx, ry = FACE[species][stage]
    mask = Image.new("L", (SIZE, SIZE))
    draw = ImageDraw.Draw(mask)
    draw.ellipse((cx-rx, cy-ry, cx+rx, cy+ry), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(10))
    return Image.composite(reaction, base, mask)


manifest = {"version": 4, "frameWidth": SIZE, "frameHeight": SIZE,
            "frameCount": len(STEPS), "frameDurationMs": 90, "layout": "horizontal", "sprites": []}
for species, stages in STAGES.items():
    for stage, version in stages.items():
        base_name = f"{species}-{stage}-{version}.png"
        base = fit(Image.open(ROOT / base_name))
        for action in ("touch", "clean"):
            reaction_name = f"{species}-{stage}-{action}-frame-v1.png"
            reaction = fit(Image.open(ROOT / reaction_name))
            strip = Image.new("RGBA", (SIZE * len(STEPS), SIZE))
            for index, progress in enumerate(STEPS):
                frame = reveal(base, reaction, species, stage, index)
                overlay = Image.new("RGBA", (SIZE, SIZE))
                draw = ImageDraw.Draw(overlay)
                if action == "touch" and progress:
                    opacity = int(170 * progress)
                    heart(draw, 242, 73 - int(progress * 23), 11 + 5 * progress, opacity)
                    heart(draw, 276, 91 - int(progress * 29), 8 + 4 * progress, opacity)
                elif action == "clean" and progress:
                    droplets(draw, progress)
                frame = Image.alpha_composite(frame, overlay)
                strip.paste(frame, (index * SIZE, 0))
            output = f"{species}-{stage}-{action}-sprite-v4.webp"
            strip.save(ROOT / output, "WEBP", quality=82, method=6)
            manifest["sprites"].append({"species": species, "stage": stage, "action": action,
                                        "file": output, "base": base_name, "reaction": reaction_name})
            print(output, (ROOT / output).stat().st_size)

(ROOT / "care-sprites-v4.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

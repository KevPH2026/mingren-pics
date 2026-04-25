from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1200, 630
img = Image.new("RGB", (W, H), "#f5e6d3")
draw = ImageDraw.Draw(img)

# Background gradient
for y in range(H):
    r = int(245 - y * 0.05)
    g = int(230 - y * 0.08)
    b = int(211 - y * 0.03)
    draw.line([(0, y), (W, y)], fill=(max(0,r), max(0,g), max(0,b)))

# Pop art dots
for x in range(0, W, 30):
    for y in range(0, H, 30):
        size = 3 + int(2 * math.sin(x/50) * math.cos(y/50))
        draw.ellipse([x-size, y-size, x+size, y+size], fill=(255, 220, 180))

# Fonts
font_big = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 72)
font_sub = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 36)
font_url = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 28)
font_celeb = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 32)

def draw_outlined_text(draw, pos, text, font, fill, outline="black", ox=2, oy=2):
    x, y = pos
    for dx in range(-ox, ox+1):
        for dy in range(-oy, oy+1):
            draw.text((x+dx, y+dy), text, fill=outline, font=font)
    draw.text((x, y), text, fill=fill, font=font)

def center_text(draw, y, text, font, fill, outline="black"):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    draw_outlined_text(draw, ((W - tw) // 2, y), text, font, fill, outline)

# Title
center_text(draw, 100, "跟名人合影！", font_big, "#FF6B9D")

# Subtitle
center_text(draw, 200, "AI一键生成  ·  30+ 国际名人  ·  Pop Art风格", font_sub, "#333")

# Celebrity names
celebs = [
    ("Taylor Swift", "#FF1493"), ("Elon Musk", "#4169E1"), ("Messi", "#32CD32"),
    ("Lisa", "#FFD700"), ("BTS", "#9370DB"), ("Zendaya", "#FF6347"),
]
y_start = 300
for i, (name, color) in enumerate(celebs):
    col = i % 3
    row = i // 3
    x = 150 + col * 320
    y = y_start + row * 80
    draw_outlined_text(draw, (x, y), f"✨ {name}", font_celeb, color)

# URL
bbox = font_url.getbbox("mingren.pics")
center_text(draw, 510, "mingren.pics", font_url, "#666", outline="#aaa")

# Border
draw.rectangle([0, 0, W-1, H-1], outline="#ddd", width=3)

out = "/Users/mac/projects/mingren-pics/public/og-image.png"
img.save(out, "PNG", optimize=True)
print(f"Saved: {out} ({os.path.getsize(out)} bytes)")

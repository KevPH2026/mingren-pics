from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1080, 1080

def create_post(title, subtitle, celebs_list, accent_color, filename):
    img = Image.new("RGB", (W, H), "#f5e6d3")
    draw = ImageDraw.Draw(img)
    
    # Background gradient
    for y in range(H):
        r = int(245 - y * 0.03)
        g = int(230 - y * 0.06)
        b = int(211 - y * 0.02)
        draw.line([(0, y), (W, y)], fill=(max(0,r), max(0,g), max(0,b)))
    
    # Pop art dots
    for x in range(0, W, 25):
        for y in range(0, H, 25):
            size = 2 + int(1.5 * math.sin(x/40) * math.cos(y/40))
            draw.ellipse([x-size, y-size, x+size, y+size], fill=(255, 225, 190))
    
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 64)
        font_sub = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 32)
        font_celeb = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 28)
        font_url = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 24)
    except:
        font_title = ImageFont.load_default()
        font_sub = font_title
        font_celeb = font_title
        font_url = font_title
    
    def outlined(draw, pos, text, font, fill, outline="black", ox=2, oy=2):
        x, y = pos
        for dx in range(-ox, ox+1):
            for dy in range(-oy, oy+1):
                draw.text((x+dx, y+dy), text, fill=outline, font=font)
        draw.text((x, y), text, fill=fill, font=font)
    
    def centered(draw, y, text, font, fill, outline="black"):
        bbox = font.getbbox(text)
        tw = bbox[2] - bbox[0]
        outlined(draw, ((W - tw) // 2, y), text, font, fill, outline)
    
    # Top accent bar
    draw.rectangle([0, 0, W, 8], fill=accent_color)
    
    # Title
    centered(draw, 120, title, font_title, accent_color)
    
    # Subtitle
    centered(draw, 220, subtitle, font_sub, "#444")
    
    # Divider
    draw.rectangle([W//2-200, 280, W//2+200, 284], fill=accent_color)
    
    # Celebrity grid (2 columns)
    y_start = 340
    for i, (name, emoji) in enumerate(celebs_list):
        col = i % 2
        row = i // 2
        x = 120 + col * 480
        y = y_start + row * 90
        
        # Pop art card background
        draw.rounded_rectangle([x-20, y-10, x+380, y+60], radius=16, fill="white", outline=accent_color, width=2)
        outlined(draw, (x, y), f"{emoji}  {name}", font_celeb, "#333")
    
    # Bottom URL
    draw.rectangle([0, H-80, W, H], fill=accent_color)
    centered(draw, H-60, "mingren.pics", font_url, "white", outline=accent_color)
    
    # Bottom accent bar
    draw.rectangle([0, H-8, W, H], fill="#333")
    
    out = f"/Users/mac/projects/mingren-pics/public/promo/{filename}"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.save(out, "PNG", optimize=True)
    print(f"Saved: {out} ({os.path.getsize(out)} bytes)")

# Post 1: Main hero - English
create_post(
    "Celebrity Selfie AI",
    "Upload selfie → Pick celebrity → Done!",
    [("Taylor Swift", "🎤"), ("Elon Musk", "🚀"), ("Messi", "⚽"), ("Lisa", "💃"), ("BTS", "🎵"), ("Zendaya", "🌟")],
    "#FF6B9D",
    "promo-hero-en.png"
)

# Post 2: Main hero - Chinese
create_post(
    "跟名人合影！",
    "上传自拍 → 选名人 → AI秒出！",
    [("Taylor Swift", "🎤"), ("Elon Musk", "🚀"), ("Messi", "⚽"), ("Lisa", "💃"), ("BTS", "🎵"), ("Zendaya", "🌟")],
    "#FF6B9D",
    "promo-hero-cn.png"
)

# Post 3: Feature highlight
create_post(
    "Free AI Celebrity Photos",
    "3 generations/day · 30+ celebrities · Pop Art style",
    [("🎨  Pop Art Style", ""), ("📸  High Quality", ""), ("🔄  AI Edit & Remix", ""), ("🆓  Free Daily Quota", ""), ("🎁  Invite for +3/day", ""), ("🌐  30+ Celebrities", "")],
    "#8B5CF6",
    "promo-features.png"
)

# Post 4: Xiaohongshu style - Chinese
create_post(
    "跟Taylor Swift合影了！",
    "AI一键生成 · 逼真到朋友都问我是不是真的见到了",
    [("Taylor Swift", "🎤"), ("Beyoncé", "👑"), ("Rihanna", "💎"), ("Billie Eilish", "🖤"), ("Dua Lipa", "🔥"), ("IU", "🌸")],
    "#FF1493",
    "promo-xhs-cn.png"
)

print("\nAll promo images generated!")

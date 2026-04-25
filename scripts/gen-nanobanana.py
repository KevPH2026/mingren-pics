import requests, json, base64, os, sys, re, time

API_KEY = "sk-AHA6BxNYTbIiLMHzgpzxv5UBzVxG9HP43LsYoS2Yp25OGu7E"
API_URL = "https://api.xas231.online/v1/chat/completions"
OUT_DIR = "/Users/mac/projects/mingren-pics/public/promo"

prompts = [
    {
        "model": "gemini-3.0-pro-image-landscape-2k",
        "filename": "nanobanana-hero-en.png",
        "prompt": """A stunning promotional poster for an AI celebrity selfie app called "mingren.pics". 

The design should be vibrant, modern, and eye-catching with a Pop Art / comic book aesthetic. 

Central concept: Show a diverse group of 6 famous celebrity silhouettes/icons arranged in a dynamic collage pattern — Taylor Swift (microphone), Elon Musk (rocket), Messi (soccer ball), Lisa BLACKPINK (dance), BTS (music notes), and Zendaya (star).

Each celebrity icon should be in a colorful rounded card/tile with bold vibrant colors (pink, blue, green, gold, purple, red).

At the top in large bold Pop Art style text: "Celebrity Selfie AI"
In the middle: "Upload selfie -> Pick celebrity -> Generate!"
At the bottom: "mingren.pics" in a stylish font with a camera icon

Background: warm cream/beige with subtle comic-style halftone dots. Add sparkles and stars around the celebrity cards.

The overall vibe should feel fun, youthful, and viral — like something that would get shared on Twitter/X."""
    },
    {
        "model": "gemini-3.0-pro-image-landscape-2k",
        "filename": "nanobanana-hero-cn.png",
        "prompt": """一张精美的AI名人合影应用宣传海报，应用名为"mingren.pics"。

设计风格：Pop Art波普艺术风格，色彩鲜明活泼，漫画感。

核心概念：展示6位国际名人的卡通化头像/剪影，以动态拼贴方式排列 — Taylor Swift（麦克风）、Elon Musk（火箭）、Messi（足球）、Lisa BLACKPINK（跳舞）、BTS（音符）、Zendaya（星星）。

每位名人图标放在一个彩色圆角卡片中，使用鲜艳的颜色（粉色、蓝色、绿色、金色、紫色、红色）。

顶部大字Pop Art风格标题："跟名人合影！"
中间："上传自拍 → 选名人 → AI秒出！"
底部："mingren.pics" 时尚字体

背景：温暖的奶油色底，带有漫画风格半调网点。在名人卡片周围添加闪光和星星。

整体氛围应该有趣、年轻、有传播力——适合在小红书和微博上被分享。"""
    },
    {
        "model": "gemini-3.0-pro-image-landscape-2k",
        "filename": "nanobanana-features.png",
        "prompt": """A sleek feature showcase poster for an AI app called "mingren.pics" — Celebrity Selfie AI Generator.

Design: Clean, modern, gradient background from violet (#8B5CF6) to cyan (#06B6D4) on dark (#0F0F23). Glass-morphism style cards.

Showcase 6 key features as icon+text cards arranged in a 2x3 grid:
1. 📸 AI Photo Generation — "Upload & Generate in seconds"
2. 🎨 Pop Art Style — "Unique artistic filter"  
3. 🔄 AI Edit & Remix — "Change outfit, background, style"
4. 🆓 Free Daily Quota — "3 free generations per day"
5. 🌐 30+ Celebrities — "International stars library"
6. 🎁 Invite Rewards — "Share & earn more"

Title at top: "mingren.pics" in glowing neon style
Subtitle: "Your AI Celebrity Selfie Studio"

Modern, techy vibe like a premium SaaS landing page. No real photos of celebrities — use stylized icons and illustrations only."""
    },
    {
        "model": "gemini-3.0-pro-image-portrait-2k",
        "filename": "nanobanana-xhs-cn.png",
        "prompt": """小红书风格的精美宣传图，9:16竖屏比例。

主题：AI名人合影应用"mingren.pics"的推广图。

画面设计：
- 顶部大标题："跟Taylor Swift合影了！"用粉色Pop Art字体，带描边
- 中间是一个手机模型（mockup），屏幕显示一个女生和Taylor Swift的AI合影效果（用卡通/插画风格，不是真实照片）
- 手机周围散落着星星✨和爱心❤️的装饰元素
- 底部区域显示几个小标签气泡："AI一键生成"、"30+名人"、"免费体验"、"逼真合影"
- 最底部："mingren.pics" 品牌名

配色：粉色(#FF6B9D)为主色调，搭配奶油色(#FFF5E6)背景，紫色(#8B5CF6)点缀

风格参考：小红书爆款图文的精致感，可爱但不幼稚，有质感。整体要有"种草"的感觉，让人看了就想试试。"""
    },
]

os.makedirs(OUT_DIR, exist_ok=True)

for i, item in enumerate(prompts):
    print(f"\n{'='*60}")
    print(f"Generating [{i+1}/{len(prompts)}]: {item['filename']}")
    print(f"Model: {item['model']}")
    
    payload = {
        "model": item["model"],
        "messages": [
            {"role": "user", "content": item["prompt"]}
        ],
        "stream": True
    }
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        resp = requests.post(API_URL, json=payload, headers=headers, stream=True, timeout=180)
        
        if resp.status_code != 200:
            print(f"  ERROR: HTTP {resp.status_code} - {resp.text[:200]}")
            continue
        
        full_content = ""
        image_data = None
        
        for line in resp.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            data_str = line[6:]
            if data_str.strip() == "[DONE]":
                break
            try:
                data = json.loads(data_str)
                delta = data.get("choices", [{}])[0].get("delta", {})
                content = delta.get("content", "")
                if content:
                    full_content += content
            except json.JSONDecodeError:
                continue
        
        # Extract base64 image from response
        # Look for data:image/...;base64, pattern
        b64_match = re.search(r'data:image/([\w+]+);base64,([A-Za-z0-9+/=\n\r\s]+)', full_content)
        
        if b64_match:
            mime = b64_match.group(1)
            b64_data = b64_match.group(2).replace('\n', '').replace('\r', '').replace(' ', '')
            image_bytes = base64.b64decode(b64_data)
            
            filepath = os.path.join(OUT_DIR, item['filename'])
            with open(filepath, 'wb') as f:
                f.write(image_bytes)
            print(f"  SUCCESS: Saved {filepath} ({len(image_bytes)} bytes)")
        else:
            print(f"  WARNING: No image found in response")
            print(f"  Response preview: {full_content[:300]}")
    
    except Exception as e:
        print(f"  EXCEPTION: {e}")
    
    # Rate limit between requests
    if i < len(prompts) - 1:
        print("  Waiting 5s before next request...")
        time.sleep(5)

print(f"\n{'='*60}")
print("All done!")

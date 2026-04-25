import requests, json, base64, os, sys, re, time

API_KEY = "sk-AHA6BxNYTbIiLMHzgpzxv5UBzVxG9HP43LsYoS2Yp25OGu7E"
API_URL = "https://api.xas231.online/v1/chat/completions"
OUT_DIR = "/Users/mac/projects/mingren-pics/public/promo"

# Test 1: non-streaming, simple prompt
print("Test 1: Non-streaming, simple prompt...")
payload = {
    "model": "gemini-3.0-pro-image-landscape-2k",
    "messages": [
        {"role": "user", "content": "A cute cat in a garden, watercolor style"}
    ],
    "stream": False
}

resp = requests.post(API_URL, json=payload, headers={
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}, timeout=180)

print(f"Status: {resp.status_code}")
print(f"Response keys: {list(resp.json().keys()) if resp.status_code == 200 else 'N/A'}")

if resp.status_code == 200:
    data = resp.json()
    choices = data.get("choices", [])
    if choices:
        msg = choices[0].get("message", {})
        content = msg.get("content", "")
        print(f"Content type: {type(content)}")
        if isinstance(content, list):
            for item in content:
                print(f"  Part type: {item.get('type', 'unknown')}")
                if item.get("type") == "image_url":
                    url = item.get("image_url", {}).get("url", "")
                    print(f"  Image URL prefix: {url[:80]}...")
                elif item.get("type") == "text":
                    print(f"  Text: {item.get('text', '')[:100]}")
        elif isinstance(content, str):
            print(f"Content length: {len(content)}")
            print(f"Content preview: {content[:500]}")
            # Check for base64
            b64_match = re.search(r'data:image/(\w+);base64,', content)
            if b64_match:
                print(f"Found base64 image, mime: {b64_match.group(1)}")
else:
    print(f"Error: {resp.text[:300]}")

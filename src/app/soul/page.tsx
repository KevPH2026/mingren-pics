"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Dice5, Download, Share2, RotateCcw } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import type html2canvasType from "html2canvas";
import { celebrities } from "@/lib/celebrities";
import type { Celebrity } from "@/lib/celebrities";

// ========== 文案库：每个名人预置灵魂文案 ==========
const soulCaptions: Record<string, string[]> = {
  // 中国明星
  jaychou: [
    "周杰伦非要教我唱《晴天》，我跑调跑到他怀疑人生。",
    "周杰伦说我的奶茶品味还行，就是珍珠加太多了。",
    "周杰伦看了我的歌单说：你这品味，穿越了。",
    "周杰伦非要给我写首歌，听完后我说还是你自己唱吧。",
  ],
  dengchao: [
    "邓超说我比他还会搞笑，我说是你带坏的。",
    "邓超非要跟我比表情包，我输了，心服口服。",
    "邓超说我的梗太冷了，他接不住。",
  ],
  // 历史人物
  einstein: [
    "爱因斯坦盯着我手机看了10分钟，说这比相对论难懂。",
    "爱因斯坦问我这道题怎么做，我说我也不会。",
    "爱因斯坦说我的发型比他的还乱，这是夸奖吗？",
    "爱因斯坦非要跟我解释E=mc²，我说能换成人民币吗？",
  ],
  newton: [
    "牛顿看到我的外卖说：苹果掉下来都没这么准时。",
    "牛顿说我的运动轨迹不符合三大定律。",
    "牛顿非要教我物理，我说能先教我怎么不加班吗？",
  ],
  davinci: [
    "达芬奇看了我的涂鸦说：你这叫抽象派。",
    "达芬奇非要给我画肖像，画完后我说还是自拍吧。",
    "达芬奇说我的创意比他那个年代还前卫。",
  ],
  napoleon: [
    "拿破仑看了我的身高说：终于找到组织了。",
    "拿破仑说我的野心比他小，但摸鱼技术比他强。",
    "拿破仑非要教我打仗，我说能先教我怎么打败甲方吗？",
  ],
  lincoln: [
    "林肯看了我的PPT说：解放奴隶都没这么难。",
    "林肯说我的演讲稿比他 Gettysburg 的还短。",
    "林肯非要给我讲民主，我说能先讲讲怎么民主选午餐吗？",
  ],
  churchill: [
    "丘吉尔看了我的KPI说：当年二战都没这么紧张。",
    "丘吉尔说我的演讲比他差远了，但PPT比他好看。",
    "丘吉尔非要给我点雪茄，我说二手烟算工伤吗？",
  ],
  shakespeare: [
    "莎士比亚看了我的朋友圈说：你这文案，比我的十四行诗还难懂。",
    "莎士比亚非要给我写情书，我说能翻译成白话吗？",
    "莎士比亚说我的爱情故事比他所有悲剧都惨。",
  ],
  columbus: [
    "哥伦布看了我的导航说：你比我还容易迷路。",
    "哥伦布说我的探索精神比他强，就是方向感差了点。",
    "哥伦布非要教我航海，我说能先教我怎么不被老板骂吗？",
  ],
  confucius: [
    "孔子看了我的工作报告说：学而不思则罔，你这既不学也不思。",
    "孔子说我的朋友圈比他三千弟子的作业还多。",
    "孔子非要教我论语，我说能先教我怎么不加班吗？",
    "孔子看了我的KPI说：知之为知之，不知为不知，你这KPI是真不知。",
  ],
  libai: [
    "李白抢了我的酒说'这杯我请'，然后写了首诗让我买单。",
    "李白看了我的存款说：千金散尽还复来，你这不是散尽，是根本没千。",
    "李白非要教我写诗，我说能先教我怎么还花呗吗？",
    "李白说我的酒量比他好，我说那是因为我穷得只能喝水。",
  ],
  qinshihuang: [
    "秦始皇看了我的待办清单说：统一六国都没这么多事。",
    "秦始皇说我的加班时间比他修长城的工人还长。",
    "秦始皇非要教我管理，我说能先教我怎么管理老板的预期吗？",
  ],
  wuzetian: [
    "武则天看了我的KPI说：当年朕批奏折都没你这么惨。",
    "武则天说我的气场比她差远了，但摸鱼技术比她强。",
    "武则天非要教我权谋，我说能先教我怎么在群里不背锅吗？",
  ],
  zhugeliang: [
    "诸葛亮摇着扇子说：你这步棋，险啊。",
    "诸葛亮看了我的方案说：空城计都没你这么冒险。",
    "诸葛亮非要教我谋略，我说能先教我怎么在deadline前活下来吗？",
  ],
  caocao: [
    "曹操看了我的朋友圈说：宁教我负天下人，休教天下人负我，你这负的是老板。",
    "曹操说我的疑心比他重，但工资比他低。",
    "曹操非要教我用人，我说能先教我怎么不被HR优化吗？",
  ],
  sushi: [
    "苏轼看了我的外卖说：东坡肉都没你这么丰盛，就是没肉。",
    "苏轼说我的诗词比他差远了，但表情包比他丰富。",
    "苏轼非要教我豁达，我说能先教我怎么豁达地面对余额吗？",
  ],
  zhenhe: [
    "郑和看了我的出差记录说：七下西洋都没你飞的勤。",
    "郑和说我的航海经验比他差远了，但坐飞机比他舒服。",
    "郑和非要教我探险，我说能先教我怎么不迷路吗？",
  ],
  // 日韩偶像
  gdragon: [
    "权志龙看了我的穿搭说：你这风格，超前了10年。",
    "权志龙非要给我设计造型，我说能先设计一下我的发际线吗？",
  ],
  jisoo: [
    "Jisoo说我比她还会撒娇，我说是你教的。",
    "Jisoo非要教我跳舞，我说能先教我怎么不踩自己脚吗？",
  ],
  // 好莱坞
  tomholland: [
    "荷兰弟看了我的爬墙技术说：你这比蜘蛛侠还蜘蛛侠。",
    "荷兰弟非要教我后空翻，我说能先教我怎么不翻车了人生吗？",
  ],
  // 音乐
  taylor: [
    "霉霉看了我的感情史说：你能写10张专辑。",
    "霉霉非要给我写歌，我说能先帮我把前任从通讯录删了吗？",
  ],
  // 科技
  elonmusk: [
    "马斯克看了我的创业计划说：你这比火星还远。",
    "马斯克非要教我造火箭，我说能先教我怎么不炸吗？",
  ],
  // 体育
  messi: [
    "梅西看了我的踢球视频说：你这脚法，守门员都笑了。",
    "梅西非要教我过人，我说能先教我怎么不被生活过吗？",
  ],
  // 动漫
  luffy: [
    "路飞看了我的胃口说：你比我还橡胶人，吃多少都不饱。",
    "路飞非要教我当海贼王，我说能先教我怎么不当社畜吗？",
  ],
  // 政商
  trump: [
    "特朗普看了我的演讲说：你这手势，比我还会比划。",
    "特朗普非要教我发推特，我说能先教我怎么不被封号吗？",
  ],
};

// 默认文案（兜底）
const defaultCaptions = [
  "他说我的气场比他强，我说那是因为我咖啡喝得比他多。",
  "非要教我他的成名绝技，我说能先教我怎么不加班吗？",
  "看了我的朋友圈说：你这生活，比我的还精彩。",
  "非要跟我合影，我说行吧，但别抢我镜头。",
];

function getSoulCaption(celebId: string): string {
  const captions = soulCaptions[celebId];
  if (captions && captions.length > 0) {
    return captions[Math.floor(Math.random() * captions.length)];
  }
  return defaultCaptions[Math.floor(Math.random() * defaultCaptions.length)];
}

// ========== 智能匹配算法 ==========
function smartMatchCelebrity(
  gender: "male" | "female" | null,
  _photoUrl: string
): Celebrity {
  // 根据性别过滤
  let pool = celebrities;
  if (gender === "female") {
    // 女性用户优先匹配男性名人
    const malePrefer = ["jaychou", "dengchao", "einstein", "newton", "davinci",
      "napoleon", "lincoln", "churchill", "shakespeare", "columbus",
      "confucius", "libai", "qinshihuang", "zhugeliang", "caocao", "sushi", "zhenhe",
      "gdragon", "tomholland", "elonmusk", "messi", "luffy", "trump"];
    pool = celebrities.filter((c) => malePrefer.includes(c.id));
  } else if (gender === "male") {
    // 男性用户优先匹配女性名人
    const femalePrefer = ["jisoo", "taylor", "wuzetian"];
    pool = celebrities.filter((c) => femalePrefer.includes(c.id));
  }

  // 按热度加权随机
  const weights = pool.map((c) => c.hotness || 50);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < pool.length; i++) {
    random -= weights[i];
    if (random <= 0) return pool[i];
  }

  return pool[0];
}

// ========== 3D骰子组件 ==========
function Dice3D({ isRolling, matchedCeleb }: { isRolling: boolean; matchedCeleb: Celebrity | null }) {
  return (
    <div className="relative w-32 h-32 mx-auto" style={{ perspective: "600px" }}>
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
        animate={
          isRolling
            ? {
                rotateX: [0, 360, 720, 1080, 1440],
                rotateY: [0, 180, 360, 540, 720],
                rotateZ: [0, 90, 180, 270, 360],
              }
            : {
                rotateX: 0,
                rotateY: 0,
                rotateZ: 0,
              }
        }
        transition={isRolling ? { duration: 2, ease: "easeOut" } : { duration: 0.5 }}
      >
        {/* 骰子六个面 */}
        {[0, 1, 2, 3, 4, 5].map((face) => (
          <div
            key={face}
            className="absolute w-32 h-32 rounded-2xl flex items-center justify-center text-4xl border-4 border-black"
            style={{
              backfaceVisibility: "hidden",
              transform: [
                "rotateY(0deg) translateZ(64px)",
                "rotateY(180deg) translateZ(64px)",
                "rotateY(90deg) translateZ(64px)",
                "rotateY(-90deg) translateZ(64px)",
                "rotateX(90deg) translateZ(64px)",
                "rotateX(-90deg) translateZ(64px)",
              ][face],
              background: ["#e00", "#ff0", "#0cf", "#0f0", "#f5e6d3", "#fff"][face],
              boxShadow: "6px 6px 0 #000",
            }}
          >
            {isRolling ? (
              <span className="text-3xl">{["🎲", "✨", "🌟", "💫", "⭐", "🔮"][face]}</span>
            ) : matchedCeleb ? (
              <span className="text-5xl">{matchedCeleb.avatarUrl}</span>
            ) : (
              <Dice5 className="w-12 h-12 text-black" />
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ========== 分享卡片组件（用于生成图片） ==========
function ShareCard({
  userPhoto,
  generatedImage,
  celeb,
  caption,
  qrDataUrl,
}: {
  userPhoto: string;
  generatedImage: string | null;
  celeb: Celebrity;
  caption: string;
  qrDataUrl: string | null;
}) {
  return (
    <div
      id="share-card"
      className="relative w-[375px] bg-[#f5e6d3] rounded-3xl overflow-hidden border-4 border-black comic-shadow"
      style={{ aspectRatio: "9/16" }}
    >
      {/* 背景装饰 - 半调网点 */}
      <div className="absolute inset-0 halftone opacity-10" />

      {/* 顶部品牌 */}
      <div className="relative pt-6 px-5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#e00] flex items-center justify-center text-white font-bold text-sm comic-shadow-sm">
          M
        </div>
        <span className="text-black/80 text-sm font-black">mingren.pics</span>
        <span className="ml-auto text-black/40 text-xs font-bold">灵魂合影</span>
      </div>

      {/* 主图区域 */}
      <div className="relative mt-4 mx-4 rounded-2xl overflow-hidden bg-white border-4 border-black comic-shadow-sm" style={{ aspectRatio: "1/1" }}>
        {generatedImage ? (
          <Image src={generatedImage} alt="灵魂合影" fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="text-6xl mb-2">{celeb.avatarUrl}</div>
              <div className="text-black/60 text-sm font-bold">{celeb.name}</div>
            </div>
          </div>
        )}

        {/* 用户小头像角标 */}
        <div className="absolute bottom-3 right-3 w-14 h-14 rounded-full border-4 border-black overflow-hidden shadow-lg bg-white">
          <Image src={userPhoto} alt="我" fill className="object-cover" />
        </div>
      </div>

      {/* 文案区域 */}
      <div className="relative mt-4 px-5">
        <div className="bg-white rounded-xl p-4 border-4 border-black comic-shadow-sm">
          <p className="text-black text-base leading-relaxed font-black">
            {caption}
          </p>
        </div>
      </div>

      {/* 名人信息 */}
      <div className="relative mt-3 px-5 flex items-center gap-3">
        <div className="text-3xl">{celeb.avatarUrl}</div>
        <div>
          <div className="text-black font-black">{celeb.name}</div>
          <div className="text-black/50 text-xs font-bold">{celeb.tags.join(" · ")}</div>
        </div>
      </div>

      {/* 底部 CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="bg-white rounded-xl p-4 border-4 border-black comic-shadow-sm">
          <div className="flex items-center gap-3">
            {/* 真实二维码 */}
            {qrDataUrl ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 border-black">
                <Image src={qrDataUrl} alt="扫码访问" width={64} height={64} />
              </div>
            ) : (
              <div className="w-16 h-16 bg-[#ff0] rounded-lg flex items-center justify-center shrink-0 border-4 border-black comic-shadow-sm">
                <div className="text-black text-xs text-center leading-tight font-bold">
                  扫码
                  <br />
                  测测你的
                  <br />
                  灵魂名人
                </div>
              </div>
            )}
            <div className="flex-1">
              <div className="text-black font-black text-sm">测测你的灵魂名人是谁</div>
              <div className="text-black/50 text-xs mt-0.5 font-medium">上传自拍，扔骰子匹配</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 主页面 ==========
export default function SoulPage() {
  const [step, setStep] = useState<"upload" | "rolling" | "result">("upload");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [matchedCeleb, setMatchedCeleb] = useState<Celebrity | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUserPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRoll = useCallback(async () => {
    if (!userPhoto) return;

    setStep("rolling");
    setGeneratedImage(null);
    setQrDataUrl(null);

    // 骰子动画持续2秒，期间"随机"闪烁名人
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 智能匹配
    const celeb = smartMatchCelebrity(gender, userPhoto);
    const cap = getSoulCaption(celeb.id);

    setMatchedCeleb(celeb);
    setCaption(cap);
    setStep("result");

    // 生成二维码
    try {
      const qr = await QRCode.toDataURL("https://mingren.pics/soul", {
        width: 128,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(qr);
    } catch (e) {
      console.error("二维码生成失败:", e);
    }

    // 开始生成图片
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: userPhoto,
          celebrityId: celeb.id,
          scene: cap,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      }
    } catch (err) {
      console.error("生成失败:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [userPhoto, gender]);

  const handleDownload = useCallback(async () => {
    const card = document.getElementById("share-card");
    if (!card) return;

    try {
      // 动态导入 html2canvas
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(card, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
      });

      const link = document.createElement("a");
      link.download = `灵魂合影-${matchedCeleb?.name || "名人"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("保存失败:", err);
      alert("保存失败，请直接截图分享！");
    }
  }, [matchedCeleb]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: "我的灵魂合影",
        text: caption,
        url: window.location.href,
      });
    } else {
      // 复制链接
      navigator.clipboard.writeText(window.location.href);
      alert("链接已复制，快去分享吧！");
    }
  }, [caption]);

  return (
    <div className="min-h-screen bg-[#f5e6d3] text-black">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-[#f5e6d3]/90 backdrop-blur-xl border-b-4 border-black">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#e00] flex items-center justify-center text-white font-bold text-sm comic-shadow-sm">
              M
            </div>
            <span className="font-bold text-lg">mingren.pics</span>
          </div>
          <a href="/" className="text-sm font-bold text-black/60 hover:text-black transition-colors">
            经典模式 →
          </a>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ===== 上传阶段 ===== */}
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* 标题 */}
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-black tracking-tight">
                  <span className="bg-[#ff0] px-2 py-1 comic-border inline-block transform -rotate-1">🎲 灵魂合影骰子</span>
                </h1>
                <p className="text-black/60 text-sm font-medium">上传自拍，扔骰子，看看你的灵魂名人是谁</p>
              </div>

              {/* 上传区域 */}
              <div
                className="relative rounded-2xl border-4 border-black bg-white comic-shadow overflow-hidden"
                style={{ aspectRatio: "3/4" }}
              >
                {userPhoto ? (
                  <div className="relative w-full h-full">
                    <Image src={userPhoto} alt="预览" fill className="object-cover" />
                    <button
                      onClick={() => setUserPhoto(null)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#e00] flex items-center justify-center text-white comic-shadow-sm hover:scale-110 transition-transform"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center gap-3 text-black/40 hover:text-black/60 transition-colors"
                  >
                    <Upload className="w-12 h-12" />
                    <span className="text-sm font-bold">点击上传自拍</span>
                    <span className="text-xs text-black/30">支持 JPG、PNG</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* 性别选择 */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-black/50">选择性别（匹配更准，可选）</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setGender("male")}
                    className={`flex-1 py-3 rounded-xl border-4 transition-all font-bold ${
                      gender === "male"
                        ? "border-black bg-[#0cf] text-black comic-shadow"
                        : "border-black/20 text-black/40 hover:border-black/40"
                    }`}
                  >
                    👨 男生
                  </button>
                  <button
                    onClick={() => setGender("female")}
                    className={`flex-1 py-3 rounded-xl border-4 transition-all font-bold ${
                      gender === "female"
                        ? "border-black bg-[#ff0] text-black comic-shadow"
                        : "border-black/20 text-black/40 hover:border-black/40"
                    }`}
                  >
                    👩 女生
                  </button>
                </div>
              </div>

              {/* 扔骰子按钮 */}
              <button
                onClick={handleRoll}
                disabled={!userPhoto}
                className={`w-full py-4 rounded-xl font-black text-lg transition-all border-4 ${
                  userPhoto
                    ? "bg-[#e00] text-white border-black comic-shadow hover:translate-y-[-2px]"
                    : "bg-black/5 text-black/20 border-black/10 cursor-not-allowed"
                }`}
              >
                {userPhoto ? "🎲 扔骰子！" : "先上传照片"}
              </button>
            </motion.div>
          )}

          {/* ===== 骰子滚动阶段 ===== */}
          {step === "rolling" && (
            <motion.div
              key="rolling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Dice3D isRolling={true} matchedCeleb={null} />
              <motion.p
                className="mt-8 text-black/60 text-lg font-bold"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                正在匹配你的灵魂名人...
              </motion.p>
            </motion.div>
          )}

          {/* ===== 结果展示阶段 ===== */}
          {step === "result" && matchedCeleb && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* 匹配结果 */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0cf] border-4 border-black comic-shadow">
                  <span className="text-black text-sm font-black">✨ 灵魂匹配成功</span>
                </div>
                <h2 className="text-2xl font-black">
                  你的灵魂名人是 <span className="bg-[#ff0] px-2 py-1 comic-border inline-block">{matchedCeleb.name}</span>
                </h2>
              </div>

              {/* 分享卡片（可截图） */}
              <div className="flex justify-center">
                <ShareCard
                  userPhoto={userPhoto!}
                  generatedImage={generatedImage}
                  celeb={matchedCeleb}
                  caption={caption}
                  qrDataUrl={qrDataUrl}
                />
              </div>

              {/* 生成状态 */}
              {isGenerating && (
                <div className="text-center text-black/50 text-sm font-medium">
                  <motion.div
                    className="inline-block w-5 h-5 border-4 border-[#e00] border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span className="ml-2">正在生成合影...</span>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownload}
                  className="py-3 rounded-xl bg-white border-4 border-black comic-shadow font-bold text-black flex items-center justify-center gap-2 hover:bg-[#f5e6d3] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  保存图片
                </button>
                <button
                  onClick={handleShare}
                  className="py-3 rounded-xl bg-[#e00] border-4 border-black comic-shadow font-bold text-white flex items-center justify-center gap-2 hover:bg-[#c00] transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  分享
                </button>
              </div>

              <button
                onClick={() => {
                  setStep("upload");
                  setUserPhoto(null);
                  setGeneratedImage(null);
                }}
                className="w-full py-3 rounded-xl border-4 border-black/20 text-black/50 font-bold hover:border-black/40 hover:text-black flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                再玩一次
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

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

// ========== 趣味通用文案 ==========
const funMessages = [
  "AI正在给这位名人补妆，他/她说不能素颜出镜...",
  "摄影师正在调光，这位名人坚持要拍出最佳状态...",
  "这位名人正在查你的朋友圈，想找个共同话题...",
  "AI正在教这位名人摆pose，他/她学得有点慢...",
  "这位名人正在回忆跟你的前世缘分，需要一点时间...",
  "AI正在给这位名人P图，他/她说要把皱纹去掉...",
  "这位名人正在跟AI讨价还价，想让自己看起来更年轻...",
  "化妆师正在给这位名人做发型，他/她说要显脸小...",
  "这位名人正在背台词，等下要跟你演对手戏...",
  "AI正在检查这位名人的牙齿够不够白...",
];

// ========== 渐进提示文案库 ==========
// 趣味和渐进提示穿插，形成悬念
const progressiveHints: Record<string, string[]> = {
  jaychou: [
    "AI正在分析你的音乐品味...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "这位名人很喜欢喝奶茶...",
    "AI正在给这位名人补妆...",
    "他擅长把中文唱得很酷...",
    "摄影师正在调光...",
    "他最近好像在开演唱会...",
    "这位名人正在查你的朋友圈...",
    "他姓周，名字只有两个字...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——周杰伦",
  ],
  einstein: [
    "AI正在计算你的智商...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "这位名人的头发总是很乱...",
    "AI正在给这位名人补妆...",
    "他提出了一个著名的能量公式...",
    "摄影师正在调光...",
    "他出生在德国，后来去了美国...",
    "这位名人正在查你的朋友圈...",
    "他的名字开头是E...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——爱因斯坦",
  ],
  newton: [
    "AI正在分析重力对你的影响...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "这位名人被一个苹果砸过头...",
    "AI正在给这位名人补妆...",
    "他发现了三大运动定律...",
    "摄影师正在调光...",
    "他生活在17世纪的英国...",
    "这位名人正在查你的朋友圈...",
    "他的姓氏和一种水果有关...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——牛顿",
  ],
  davinci: [
    "AI正在评估你的艺术天赋...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "这位名人画过一幅神秘的微笑...",
    "AI正在给这位名人补妆...",
    "他是个全才：画家、科学家、发明家...",
    "摄影师正在调光...",
    "他生活在文艺复兴时期的意大利...",
    "这位名人正在查你的朋友圈...",
    "他的名字里有'芬奇'...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——达芬奇",
  ],
  confucius: [
    "AI正在分析你的道德水平...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "这位名人有很多弟子...",
    "AI正在给这位名人补妆...",
    "他说过'己所不欲勿施于人'...",
    "摄影师正在调光...",
    "他生活在春秋时期的中国...",
    "这位名人正在查你的朋友圈...",
    "他姓孔，被尊称为'子'...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——孔子",
  ],
  libai: [
    "AI正在检测你的诗性...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "这位名人很爱喝酒...",
    "AI正在给这位名人补妆...",
    "他被称为'诗仙'...",
    "摄影师正在调光...",
    "他生活在唐朝...",
    "这位名人正在查你的朋友圈...",
    "他姓李，名字里有个'白'...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——李白",
  ],
  qinshihuang: [
    "AI正在评估你的帝王之气...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "这位名人统一了六国...",
    "AI正在给这位名人补妆...",
    "他修了一条很长的城墙...",
    "摄影师正在调光...",
    "他派人造了很多兵马俑...",
    "这位名人正在查你的朋友圈...",
    "他是中国历史上第一个皇帝...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——秦始皇",
  ],
  wuzetian: [
    "AI正在检测你的女皇气场...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "这位名人是中国唯一的女皇帝...",
    "AI正在给这位名人补妆...",
    "她给自己造了很多新字...",
    "摄影师正在调光...",
    "她生活在唐朝...",
    "这位名人正在查你的朋友圈...",
    "她姓武...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——武则天",
  ],
  zhugeliang: [
    "AI正在计算你的谋略指数...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "这位名人有一把羽毛扇...",
    "AI正在给这位名人补妆...",
    "他写过《出师表》...",
    "摄影师正在调光...",
    "他是三国时期蜀国的军师...",
    "这位名人正在查你的朋友圈...",
    "他复姓诸葛...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——诸葛亮",
  ],
  caocao: [
    "AI正在评估你的枭雄气质...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "这位名人说过'宁教我负天下人'...",
    "AI正在给这位名人补妆...",
    "他写诗很厉害，打仗也很厉害...",
    "摄影师正在调光...",
    "他是三国时期魏国的人物...",
    "这位名人正在查你的朋友圈...",
    "他姓曹...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——曹操",
  ],
  default: [
    "AI正在分析你的气质...",
    "这位名人正在赶来...",
    "他/她和你有一些共同点...",
    "他/她最近很火...",
    "AI正在给这位名人补妆...",
    "摄影师正在调光...",
    "这位名人正在查你的朋友圈...",
    "他/她的名字你一定能猜到...",
    "AI正在检查这位名人的牙齿...",
    "命运齿轮停转——揭晓答案",
  ],
};

function getProgressiveHints(celebId: string): string[] {
  return progressiveHints[celebId] || progressiveHints.default;
}

function getSoulCaption(celebId: string): string {
  const captions = soulCaptions[celebId];
  if (captions && captions.length > 0) {
    return captions[Math.floor(Math.random() * captions.length)];
  }
  return defaultCaptions[Math.floor(Math.random() * defaultCaptions.length)];
}

// ========== 智能匹配算法 ==========
function smartMatchCelebrity(): Celebrity {
  // 纯随机 + 热度加权，不区分性别
  const pool = celebrities;

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

// ========== 命运齿轮组件 ==========
function FateGear({ isSpinning, matchedCeleb }: { isSpinning: boolean; matchedCeleb: Celebrity | null }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 转动时快速切换名人
  useEffect(() => {
    if (!isSpinning) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % celebrities.length);
    }, 100);
    return () => clearInterval(interval);
  }, [isSpinning]);

  const currentCeleb = celebrities[currentIndex];

  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* 外圈齿轮 */}
      <motion.div
        className="absolute inset-0"
        animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
        transition={isSpinning ? { duration: 0.5, repeat: Infinity, ease: "linear" } : { duration: 1, ease: "easeOut" }}
      >
        {/* 齿轮齿 */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-6 h-8 bg-[#e00] border-4 border-black"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${i * 30}deg) translateY(-96px)`,
              transformOrigin: "center bottom",
            }}
          />
        ))}
        {/* 齿轮主体 */}
        <div className="absolute inset-4 rounded-full bg-[#ff0] border-4 border-black comic-shadow flex items-center justify-center">
          {isSpinning ? (
            <div className="text-center">
              <div className="text-6xl">{currentCeleb.avatarUrl}</div>
              <div className="text-xs font-bold text-black/60 mt-1">{currentCeleb.name}</div>
            </div>
          ) : matchedCeleb ? (
            <div className="text-center">
              <div className="text-7xl">{matchedCeleb.avatarUrl}</div>
              <div className="text-sm font-black text-black mt-1">{matchedCeleb.name}</div>
            </div>
          ) : (
            <div className="text-6xl">⚙️</div>
          )}
        </div>
      </motion.div>

      {/* 中心轴 */}
      <div className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 rounded-full bg-black border-4 border-white z-10" />
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
  const [step, setStep] = useState<"upload" | "rolling" | "generating" | "result">("upload");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [matchedCeleb, setMatchedCeleb] = useState<Celebrity | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("正在初始化...");
  const [caption, setCaption] = useState<string>("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [funFact, setFunFact] = useState<string>("");
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

    // 骰子动画持续2秒
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 智能匹配（但不显示）
    const celeb = smartMatchCelebrity();
    const cap = getSoulCaption(celeb.id);

    setMatchedCeleb(celeb);
    setCaption(cap);
    setProgress(5);
    setProgressText("正在连接AI服务器...");
    setStep("generating");

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

    // 开始生成图片 - 使用 /api/generate/start 异步流程
    try {
      // 1. 提交生成任务
      setProgress(10);
      setProgressText("正在分析你的照片...");
      
      const prompt = `A realistic photo of a person taking a selfie with ${celeb.name}. ${cap}. Both looking at camera, natural lighting, casual setting, high quality portrait.`;
      
      const startRes = await fetch("/api/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          userImageBase64: userPhoto,
          celebrityId: celeb.id,
        }),
      });
      const startData = await startRes.json();

      if (startData.error || !startData.taskId) {
        console.error("提交任务失败:", startData.error);
        setProgress(0);
        setStep("result");
        return;
      }

      // 2. 轮询任务状态
      const taskId = startData.taskId;
      let imageUrl = null;
      const maxAttempts = 20; // 最多轮询20次（约30秒）
      
      const progressTexts = [
        "正在匹配灵魂人物...",
        "AI正在构思画面...",
        "正在绘制轮廓...",
        "正在添加光影效果...",
        "正在进行细节优化...",
        "正在合成最终图像...",
        "即将完成...",
      ];

      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500)); // 每1.5秒轮询一次
        
        // 更新进度
        const newProgress = Math.min(15 + Math.floor((i / maxAttempts) * 75), 95);
        setProgress(newProgress);
        if (i < progressTexts.length) {
          setProgressText(progressTexts[i]);
        }

        const pollRes = await fetch(`/api/generate/poll?taskId=${taskId}`);
        const pollData = await pollRes.json();
        
        const status = (pollData.status || "").toLowerCase();

        if ((status === "success" || status === "completed") && (pollData.imageUrl || pollData.images?.[0])) {
          imageUrl = pollData.imageUrl || pollData.images[0];
          setProgress(100);
          setProgressText("生成完成！");
          break;
        }
        if (status === "failed" || status === "error") {
          console.error("生成失败:", pollData.error);
          setProgressText("生成失败: " + (pollData.error || "未知错误"));
          break;
        }
        // 继续轮询...
      }

      if (imageUrl) {
        setGeneratedImage(imageUrl);
      }
    } catch (err) {
      console.error("生成失败:", err);
      setProgressText("网络异常，请重试");
    } finally {
      setStep("result");
    }
  }, [userPhoto]);

  const handleDownload = useCallback(async () => {
    const card = document.getElementById("share-card");
    if (!card) return;

    try {
      // 使用原生 canvas API 绘制分享图
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      // 设置画布尺寸 (375 x 667 即 9:16)
      const width = 375;
      const height = 667;
      canvas.width = width * 2;
      canvas.height = height * 2;
      ctx.scale(2, 2);

      // 背景色
      ctx.fillStyle = "#f5e6d3";
      ctx.fillRect(0, 0, width, height);

      // 绘制半调网点背景
      ctx.fillStyle = "rgba(0,0,0,0.03)";
      for (let x = 0; x < width; x += 8) {
        for (let y = 0; y < height; y += 8) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 绘制顶部品牌
      ctx.fillStyle = "#e00";
      ctx.fillRect(20, 20, 32, 32);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("M", 36, 40);

      ctx.fillStyle = "#000";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("mingren.pics", 60, 40);

      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("灵魂合影", width - 20, 40);

      // 绘制主图区域边框
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      const imgX = 20;
      const imgY = 70;
      const imgW = width - 40;
      const imgH = imgW;
      ctx.strokeRect(imgX, imgY, imgW, imgH);
      ctx.fillStyle = "#fff";
      ctx.fillRect(imgX + 4, imgY + 4, imgW - 8, imgH - 8);

      // 绘制名人emoji
      ctx.font = "80px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(matchedCeleb?.avatarUrl || "📸", width / 2, imgY + imgH / 2 + 20);

      // 绘制名人名字
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(matchedCeleb?.name || "名人", width / 2, imgY + imgH / 2 + 60);

      // 绘制用户小头像角标
      const avatarX = imgX + imgW - 50;
      const avatarY = imgY + imgH - 50;
      ctx.beginPath();
      ctx.arc(avatarX + 25, avatarY + 25, 25, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.stroke();

      // 绘制文案区域
      const captionY = imgY + imgH + 20;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, captionY, width - 40, 80);
      ctx.fillStyle = "#fff";
      ctx.fillRect(24, captionY + 4, width - 48, 72);

      ctx.fillStyle = "#000";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "left";
      
      // 分行绘制文案
      const words = caption.split("");
      let line = "";
      let lineY = captionY + 28;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > width - 60 && i > 0) {
          ctx.fillText(line, 35, lineY);
          line = words[i];
          lineY += 24;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 35, lineY);

      // 绘制名人信息
      const infoY = captionY + 100;
      ctx.font = "30px sans-serif";
      ctx.fillText(matchedCeleb?.avatarUrl || "", 30, infoY + 30);

      ctx.fillStyle = "#000";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(matchedCeleb?.name || "", 70, infoY + 20);

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(matchedCeleb?.tags.join(" · ") || "", 70, infoY + 40);

      // 绘制底部CTA
      const ctaY = height - 100;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, ctaY, width - 40, 80);
      ctx.fillStyle = "#fff";
      ctx.fillRect(24, ctaY + 4, width - 48, 72);

      // 二维码占位
      ctx.fillStyle = "#ff0";
      ctx.fillRect(35, ctaY + 15, 50, 50);
      ctx.strokeRect(35, ctaY + 15, 50, 50);
      ctx.fillStyle = "#000";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("扫码", 60, ctaY + 35);
      ctx.fillText("测测", 60, ctaY + 48);
      ctx.fillText("你的", 60, ctaY + 61);

      ctx.textAlign = "left";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("测测你的灵魂名人是谁", 100, ctaY + 35);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.font = "12px sans-serif";
      ctx.fillText("上传自拍，扔骰子匹配", 100, ctaY + 55);

      // 下载
      const link = document.createElement("a");
      link.download = `灵魂合影-${matchedCeleb?.name || "名人"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      return "Download triggered";
    } catch (err) {
      console.error("保存失败:", err);
      alert("保存失败，请直接截图分享！");
      return "Error: " + (err as Error).message;
    }
  }, [matchedCeleb, caption]);

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
                  <span className="bg-[#ff0] px-2 py-1 comic-border inline-block transform -rotate-1">🔮 测测你的灵魂人物</span>
                </h1>
                <p className="text-black/60 text-sm font-medium">上传自拍，看看你的灵魂人物是谁</p>
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
                {userPhoto ? "🔮 开始测试！" : "先上传照片"}
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
              <FateGear isSpinning={true} matchedCeleb={null} />
              <motion.p
                className="mt-8 text-black/60 text-lg font-bold"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                正在转动命运的齿轮...
              </motion.p>
            </motion.div>
          )}

          {/* ===== 生成中阶段 ===== */}
          {step === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 space-y-8"
            >
              {/* 进度动画 */}
              <div className="relative w-40 h-40">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-black"
                  style={{ borderTopColor: "#e00" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-4 rounded-full bg-[#ff0] border-4 border-black flex items-center justify-center comic-shadow">
                  <span className="text-4xl">📸</span>
                </div>
              </div>

              {/* 渐进提示文案区域 */}
              <div className="bg-white rounded-xl p-6 border-4 border-black comic-shadow mx-4 max-w-sm overflow-hidden">
                <div className="text-center space-y-3">
                  <div className="text-2xl">✨</div>
                  
                  {/* 滚动文案 - 渐进提示 */}
                  <div className="h-20 overflow-hidden relative">
                    <motion.div
                      className="space-y-2"
                      animate={{ y: [0, -80, -160, -240, -320, -400, -480, -560, -640, -720, -800, -880] }}
                      transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                    >
                      {matchedCeleb ? getProgressiveHints(matchedCeleb.id).map((text, i) => (
                        <p key={i} className="text-black font-bold text-lg leading-relaxed h-20 flex items-center justify-center px-2">
                          {text}
                        </p>
                      )) : (
                        <p className="text-black font-bold text-lg leading-relaxed h-20 flex items-center justify-center">
                          AI正在转动命运的齿轮...
                        </p>
                      )}
                    </motion.div>
                  </div>
                  
                  <div className="text-black/40 text-sm font-medium">
                    正在生成合影，请稍候...
                  </div>
                </div>
              </div>

              {/* 进度条 - 真实进度 */}
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm font-bold text-black">
                  <span>{progressText}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-4 bg-white rounded-full border-4 border-black overflow-hidden">
                  <motion.div
                    className="h-full bg-[#e00]"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-center text-black/40 text-xs">
                  预计等待 15-25 秒
                </p>
              </div>
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
                  <span className="text-black text-sm font-black">⚙️ 命运齿轮停转</span>
                </div>
                <h2 className="text-2xl font-black">
                  命运把你和 <span className="bg-[#ff0] px-2 py-1 comic-border inline-block">{matchedCeleb.name}</span> 连在一起
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

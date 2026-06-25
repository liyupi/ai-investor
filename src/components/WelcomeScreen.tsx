interface WelcomeScreenProps {
  onQuickStart: (text: string) => void;
}

const QUICK_STARTERS = [
  {
    emoji: '🧋',
    title: '奶茶店',
    desc: '想在大学城开一家特色奶茶店',
  },
  {
    emoji: '📱',
    title: 'AI 小程序',
    desc: '做一个 AI 帮你写朋友圈文案的小程序',
  },
  {
    emoji: '🎓',
    title: '知识付费',
    desc: '想做一个教人用 AI 工具提效的付费课程',
  },
  {
    emoji: '🛒',
    title: '跨境电商',
    desc: '在 TikTok Shop 上卖国产美妆产品',
  },
];

export function WelcomeScreen({ onQuickStart }: WelcomeScreenProps) {
  return (
    <div className="welcome">
      <div className="welcome-character">
        <div className="character-bubble">
          <div className="character-emoji">🤑</div>
          <div className="character-sparkle sparkle-1">✨</div>
          <div className="character-sparkle sparkle-2">💰</div>
          <div className="character-sparkle sparkle-3">⭐</div>
        </div>
      </div>
      <h2 className="welcome-title">你好，我是<span className="highlight">毒舌金主</span></h2>
      <p className="welcome-desc">
        见过 10000+ 商业计划书的资深投资人<br />
        说话毒但真诚，帮你用最低成本验证副业想法
      </p>
      <div className="quick-starters">
        {QUICK_STARTERS.map((item) => (
          <button
            key={item.title}
            className="quick-starter-card"
            onClick={() => onQuickStart(item.desc)}
          >
            <span className="qs-emoji">{item.emoji}</span>
            <span className="qs-title">{item.title}</span>
            <span className="qs-desc">{item.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

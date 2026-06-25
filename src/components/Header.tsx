interface HeaderProps {
  onNewChat: () => void;
}

export function Header({ onNewChat }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-avatar">🤑</span>
        <div className="header-title-group">
          <h1 className="header-title">毒舌金主</h1>
          <span className="header-subtitle">AI 副业验证投资人</span>
        </div>
      </div>
      <button className="new-chat-btn" onClick={onNewChat} title="开启新对话">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>新对话</span>
      </button>
    </header>
  );
}

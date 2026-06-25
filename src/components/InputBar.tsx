import { useRef, useEffect } from 'react';

interface InputBarProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  placeholder: string;
}

export function InputBar({ value, onChange, onSend, onStop, isStreaming, placeholder }: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!isStreaming && value.trim()) {
        onSend(value);
      }
    }
  };

  return (
    <div className="input-bar-wrapper">
      <div className="input-bar">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button className="send-btn stop-btn" onClick={onStop} title="停止生成">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={() => value.trim() && onSend(value)}
            disabled={!value.trim()}
            title="发送"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        )}
      </div>
      <p className="input-hint">AI 投资人的意见仅供参考，请结合实际情况做决策</p>
    </div>
  );
}

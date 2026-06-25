import type { Message } from '../App';
import { useMemo } from 'react';

interface ChatMessageProps {
  message: Message;
}

function simpleMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  // unordered list
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  // numbered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br/>');
  html = `<p>${html}</p>`;
  // clean empty p
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*(<h[234]>)/g, '$1');
  html = html.replace(/(<\/h[234]>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>\s*(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');

  return html;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const renderedContent = useMemo(
    () => (isUser ? null : simpleMarkdown(message.content)),
    [isUser, message.content],
  );

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      {!isUser && <div className="message-avatar">🤑</div>}
      <div className={`message-bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
        {message.toolStatus && (
          <div className="tool-status">
            <span className="tool-status-dot" />
            {message.toolStatus}
          </div>
        )}
        {isUser ? (
          <div className="message-text">{message.content}</div>
        ) : message.content ? (
          <div
            className="message-text markdown-body"
            dangerouslySetInnerHTML={{ __html: renderedContent! }}
          />
        ) : !message.toolStatus ? (
          <div className="typing-indicator">
            <span /><span /><span />
          </div>
        ) : null}
      </div>
      {isUser && <div className="message-avatar user-avatar">😎</div>}
    </div>
  );
}

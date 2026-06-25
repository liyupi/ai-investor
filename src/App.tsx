import { useState, useRef, useEffect, useCallback } from 'react';
import { sendMessage, stopAgent, rotateConversationId } from './lib/api';
import { ChatMessage } from './components/ChatMessage';
import { InputBar } from './components/InputBar';
import { Header } from './components/Header';
import { WelcomeScreen } from './components/WelcomeScreen';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolStatus?: string;
  timestamp: number;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages(prev => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await sendMessage(
        text.trim(),
        (type, data) => {
          if (type === 'ai_response' && data.content) {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + data.content, toolStatus: undefined }
                  : m,
              ),
            );
          } else if (type === 'tool_call') {
            const toolName = data.name || '';
            let statusText = '🔍 正在搜索...';
            if (toolName.includes('web_search')) {
              statusText = '🌐 正在联网搜索竞品和市场信息...';
            } else if (toolName.includes('browser')) {
              statusText = '🖥️ 正在浏览网页...';
            }
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, toolStatus: statusText } : m,
              ),
            );
          } else if (type === 'tool_result') {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, toolStatus: '✅ 搜索完成，正在分析...' } : m,
              ),
            );
          } else if (type === 'error_message') {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content || `⚠️ 出错了：${data.content}`, toolStatus: undefined }
                  : m,
              ),
            );
          }
        },
        controller.signal,
      );
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: m.content || `⚠️ 请求失败：${e.message}`, toolStatus: undefined }
              : m,
          ),
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId ? { ...m, toolStatus: undefined } : m,
        ),
      );
    }
  };

  const handleStop = async () => {
    abortRef.current?.abort();
    await stopAgent().catch(() => {});
    setIsStreaming(false);
  };

  const handleNewChat = () => {
    if (isStreaming) {
      abortRef.current?.abort();
    }
    setMessages([]);
    setIsStreaming(false);
    rotateConversationId();
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="app-container">
      <Header onNewChat={handleNewChat} />
      <div className="chat-area">
        {showWelcome ? (
          <WelcomeScreen onQuickStart={(text) => {
            setInputValue(text);
          }} />
        ) : (
          <div className="messages-container">
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <InputBar
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        placeholder={showWelcome ? '描述你的副业想法，让毒舌金主帮你把把关...' : '继续聊聊，或者换个新想法...'}
      />
    </div>
  );
}

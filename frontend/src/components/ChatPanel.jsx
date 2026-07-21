import React, { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { Send, Sparkles, MessageSquare, AlertTriangle } from 'lucide-react';

const formatMessage = (text) => {
  if (!text) return '';
  const blocks = [];
  let lastIndex = 0;
  
  // Matches code blocks: ```lang\ncode```
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const before = text.substring(lastIndex, match.index);
    if (before) {
      blocks.push({ type: 'markdown', content: before });
    }
    blocks.push({ type: 'code', language: match[1], content: match[2] });
    lastIndex = codeBlockRegex.lastIndex;
  }
  const after = text.substring(lastIndex);
  if (after) {
    blocks.push({ type: 'markdown', content: after });
  }

  // Parse inline elements (bold, code, links)
  const parseInline = (line, lineKey) => {
    let parts = [{ type: 'text', text: line }];
    
    // Bold: **text**
    const boldRegex = /\*\*(.*?)\*\*/g;
    let tempParts = [];
    parts.forEach(p => {
      if (p.type !== 'text') {
        tempParts.push(p);
        return;
      }
      let idx = 0;
      let m;
      while ((m = boldRegex.exec(p.text)) !== null) {
        if (m.index > idx) {
          tempParts.push({ type: 'text', text: p.text.substring(idx, m.index) });
        }
        tempParts.push({ type: 'bold', text: m[1] });
        idx = boldRegex.lastIndex;
      }
      if (idx < p.text.length) {
        tempParts.push({ type: 'text', text: p.text.substring(idx) });
      }
    });
    parts = tempParts;

    // Inline Code: `code`
    const inlineCodeRegex = /`(.*?)`/g;
    tempParts = [];
    parts.forEach(p => {
      if (p.type !== 'text') {
        tempParts.push(p);
        return;
      }
      let idx = 0;
      let m;
      while ((m = inlineCodeRegex.exec(p.text)) !== null) {
        if (m.index > idx) {
          tempParts.push({ type: 'text', text: p.text.substring(idx, m.index) });
        }
        tempParts.push({ type: 'inline-code', text: m[1] });
        idx = inlineCodeRegex.lastIndex;
      }
      if (idx < p.text.length) {
        tempParts.push({ type: 'text', text: p.text.substring(idx) });
      }
    });
    parts = tempParts;

    // Links: [text](url)
    const linkRegex = /\[(.*?)\]\((.*?)\)/g;
    tempParts = [];
    parts.forEach(p => {
      if (p.type !== 'text') {
        tempParts.push(p);
        return;
      }
      let idx = 0;
      let m;
      while ((m = linkRegex.exec(p.text)) !== null) {
        if (m.index > idx) {
          tempParts.push({ type: 'text', text: p.text.substring(idx, m.index) });
        }
        tempParts.push({ type: 'link', text: m[1], url: m[2] });
        idx = linkRegex.lastIndex;
      }
      if (idx < p.text.length) {
        tempParts.push({ type: 'text', text: p.text.substring(idx) });
      }
    });
    parts = tempParts;

    return parts.map((part, i) => {
      if (part.type === 'bold') {
        return <strong key={`${lineKey}-b-${i}`} className="font-bold text-white">{part.text}</strong>;
      }
      if (part.type === 'inline-code') {
        return <code key={`${lineKey}-c-${i}`} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-indigo-400">{part.text}</code>;
      }
      if (part.type === 'link') {
        return <a key={`${lineKey}-l-${i}`} href={part.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{part.text}</a>;
      }
      return <span key={`${lineKey}-t-${i}`}>{part.text}</span>;
    });
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIdx) => {
        if (block.type === 'code') {
          return (
            <div key={`block-${blockIdx}`} className="my-2.5 border border-slate-800 bg-slate-950 rounded-lg p-3.5 font-mono text-xs overflow-x-auto text-violet-300">
              <pre className="whitespace-pre"><code>{block.content.trim()}</code></pre>
            </div>
          );
        }

        const lines = block.content.split('\n');
        const elements = [];
        let currentList = [];
        let listType = null; // 'ul' or 'ol'

        const pushListIfExist = (key) => {
          if (currentList.length > 0) {
            const listKey = `list-${key}`;
            if (listType === 'ol') {
              elements.push(
                <ol key={listKey} className="list-decimal pl-6 space-y-1 text-slate-300 text-sm my-2">
                  {currentList.map((li, idx) => <li key={`${listKey}-${idx}`}>{li}</li>)}
                </ol>
              );
            } else {
              elements.push(
                <ul key={listKey} className="list-disc pl-6 space-y-1 text-slate-300 text-sm my-2">
                  {currentList.map((li, idx) => <li key={`${listKey}-${idx}`}>{li}</li>)}
                </ul>
              );
            }
            currentList = [];
            listType = null;
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();

          // Headers: #, ##, ###
          if (trimmed.startsWith('#')) {
            pushListIfExist(i);
            const matchHeader = trimmed.match(/^#+/);
            const level = matchHeader ? matchHeader[0].length : 1;
            const content = trimmed.replace(/^#+\s*/, '');
            const textEl = parseInline(content, `h-${i}`);
            
            if (level === 1) {
              elements.push(<h1 key={`h1-${i}`} className="text-lg font-bold text-white mt-4 mb-2">{textEl}</h1>);
            } else if (level === 2) {
              elements.push(<h2 key={`h2-${i}`} className="text-base font-bold text-white mt-3 mb-1.5">{textEl}</h2>);
            } else {
              elements.push(<h3 key={`h3-${i}`} className="text-sm font-bold text-white mt-2 mb-1">{textEl}</h3>);
            }
          }
          // Unordered lists: - or *
          else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (listType !== 'ul') {
              pushListIfExist(i);
              listType = 'ul';
            }
            const content = trimmed.substring(2);
            currentList.push(parseInline(content, `li-ul-${i}`));
          }
          // Ordered lists: 1. 2.
          else if (/^\d+\.\s+/.test(trimmed)) {
            if (listType !== 'ol') {
              pushListIfExist(i);
              listType = 'ol';
            }
            const content = trimmed.replace(/^\d+\.\s+/, '');
            currentList.push(parseInline(content, `li-ol-${i}`));
          }
          // Empty line
          else if (trimmed === '') {
            pushListIfExist(i);
          }
          // Normal line
          else {
            pushListIfExist(i);
            elements.push(
              <p key={`p-${i}`} className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {parseInline(line, `p-${i}`)}
              </p>
            );
          }
        }
        pushListIfExist(lines.length);

        return (
          <div key={`md-block-${blockIdx}`} className="space-y-1.5">
            {elements}
          </div>
        );
      })}
    </div>
  );
};

const ChatPanel = ({ analysis }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Initialize messages from analysis chatHistory
  useEffect(() => {
    if (analysis && analysis.chatHistory) {
      setMessages(analysis.chatHistory);
    } else {
      setMessages([]);
    }
  }, [analysis]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    
    // Add user message to local state
    const newMessages = [...messages, { role: 'user', message: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await client.post(`/analysis/history/${analysis._id}/chat`, {
        question: userMessage,
      });
      
      // Append model response
      setMessages([...newMessages, { role: 'model', message: response.data.message }]);
    } catch (err) {
      console.error('Failed to get answer:', err);
      setError(err.response?.data?.message || 'Failed to send query. Check network/API keys.');
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    "Explain the general architectural design patterns used in this codebase.",
    "Are there any critical security issues or vulnerability exposure?",
    "How is error handling and crash resilience managed across the files?",
    "What are the main entry points and structural dependencies?"
  ];

  return (
    <div className="flex flex-col h-[600px] border border-slate-800 bg-slate-950/20 rounded-xl overflow-hidden backdrop-blur-md animate-fade-in">
      {/* Panel Header */}
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <MessageSquare className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Ask Questions about Code</h3>
          <p className="text-[10px] text-slate-500">
            Q&A is scoped using the analyzed key codebase file footprint.
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-grow p-6 overflow-y-auto space-y-5 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center max-w-xl mx-auto space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 animate-pulse">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-300">Start an Interactive Audit</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                Ask specific questions about codebase design, security red flags, logic constructs, or error propagation.
              </p>
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(prompt)}
                  className="p-3 text-xs text-slate-400 rounded-lg border border-slate-900 bg-slate-950/45 hover:border-indigo-500/35 hover:text-white transition-all duration-200 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                    msg.role === 'user'
                      ? 'bg-slate-900 border-slate-800 text-slate-100 rounded-tr-none'
                      : 'bg-indigo-600/5 border-indigo-500/10 rounded-tl-none'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-line text-slate-200 font-medium">{msg.message}</p>
                  ) : (
                    formatMessage(msg.message)
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start animate-pulse">
                <div className="max-w-[85%] rounded-2xl rounded-tl-none px-4 py-3 text-sm bg-indigo-600/5 border border-indigo-500/10 text-indigo-400">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-[11px] text-indigo-400/80 ml-1 font-bold uppercase tracking-wider">RepoScope is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex justify-center">
                <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
        <div className="relative flex items-center bg-slate-900/60 border border-slate-800 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/15 p-1.5 rounded-xl transition-all">
          <input
            type="text"
            required
            disabled={loading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this repository..."
            className="block w-full bg-transparent pl-3 pr-12 py-2 text-xs text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all duration-200 disabled:opacity-30 disabled:hover:bg-indigo-600 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;

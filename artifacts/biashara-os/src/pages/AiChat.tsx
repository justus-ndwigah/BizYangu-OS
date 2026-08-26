import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useAiChat, useGetSalesStats, useGetDebtsSummary } from '@workspace/api-client-react';
import type { AiMessage } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SUGGESTIONS = [
  'Which products have the highest profit margin?',
  'How much credit is outstanding this week?',
  'What should I restock urgently?',
  'Summarize today\'s sales performance',
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

export function AiChat() {
  const aiChat = useAiChat();
  const { data: stats } = useGetSalesStats();
  const { data: debtSummary } = useGetDebtsSummary();

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function buildContext() {
    if (!stats) return undefined;
    return `Today's revenue: ${fmt(stats.todayRevenue)}, ${stats.todaySalesCount} sales. Outstanding debt: ${fmt(stats.totalOutstandingDebt)}. Low stock items: ${stats.lowStockCount}.`;
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;
    const userMsg: AiMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const result = await aiChat.mutateAsync({
        data: {
          messages: newMessages,
          // context is extra field passed through
          context: buildContext(),
        },
      });
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Samahani, I could not connect to the AI right now. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto h-full flex flex-col gap-4" style={{ height: 'calc(100dvh - 4rem)' }}>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" /> AI Advisor
        </h1>
        <p className="text-muted-foreground font-medium mt-1">Biashara Assist — your shop intelligence</p>
      </div>

      {/* Context Bar */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs rounded-md font-mono font-bold border-primary/30 text-primary bg-primary/5">
            Today: {fmt(stats.todayRevenue)}
          </Badge>
          <Badge variant="outline" className="text-xs rounded-md font-mono font-bold border-accent/30 text-accent bg-accent/5">
            Debt: {fmt(stats.totalOutstandingDebt)}
          </Badge>
          {stats.lowStockCount > 0 && (
            <Badge variant="outline" className="text-xs rounded-md font-mono font-bold border-destructive/30 text-destructive bg-destructive/5">
              {stats.lowStockCount} low stock
            </Badge>
          )}
        </div>
      )}

      {/* Chat Window */}
      <Card className="flex-1 rounded-2xl border-border/60 shadow-sm flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Habari! I am Biashara Assist</h2>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                Ask me anything about your shop — sales, stock, debts, or pricing advice.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-sm font-medium text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border border-border/60 text-foreground rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j} className={j > 0 ? 'mt-1' : ''}>{line}</p>
                    ))}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border/60 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center h-5">
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/40 flex gap-2 bg-background/50">
          <Textarea
            className="flex-1 rounded-xl resize-none text-sm min-h-[44px] max-h-32"
            placeholder="Ask about your shop…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
          />
          <Button
            size="icon"
            className="rounded-xl w-11 h-11 shrink-0"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

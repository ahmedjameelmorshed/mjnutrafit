import { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

const mdComponents = {
  h2: ({ children }) => (
    <h2 className="mt-3 first:mt-0 mb-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2.5 first:mt-0 mb-1 text-[12px] font-semibold text-foreground/90">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[12.5px] leading-[1.45] text-foreground/80 my-1 first:mt-0 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 space-y-0.5 pl-1 list-disc marker:text-primary/35 marker:text-[0.65rem]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 space-y-0.5 pl-1 list-decimal marker:text-muted-foreground text-[13px]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[12.5px] leading-[1.45] text-foreground/80 pl-0.5 [&>ul]:mt-1 [&>ol]:mt-1">{children}</li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  hr: () => <hr className="my-4 border-border/50" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l border-primary/25 bg-muted/20 py-1.5 pl-2.5 pr-2 rounded-r text-[12px] text-muted-foreground leading-snug">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-border/50 bg-muted/50 p-3 text-xs leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className || "");
    if (isBlock) {
      return (
        <code className={cn("block font-mono text-[0.8rem] text-foreground/90", className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[0.85em] font-mono text-foreground/90"
        {...props}
      >
        {children}
      </code>
    );
  },
};

const ASSISTANT_COLLAPSE_CHARS = 380;

const AICoach = () => {
  const { userRole, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [expandAssistant, setExpandAssistant] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (userRole === "coach") {
    return <Navigate to="/coach-dashboard" replace />;
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await apiService.aiCoachChat({
        message: text,
        sessionId: sessionId || undefined,
      });
      setSessionId(res.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response },
      ]);
    } catch (error) {
      toast.error(error?.message || "Could not reach AI Coach.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I could not respond right now. Make sure the AI service is running and GEMINI_API_KEY is set.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 sm:py-8 flex-1 w-full">
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/15">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">AI Coach</h1>
        </div>
        <p className="text-xs text-muted-foreground/90 leading-snug max-w-sm">
          Concise, readable replies—say &quot;more detail&quot; if you want more depth.
        </p>
      </div>

      <Card className="shadow-sm border-border/70 overflow-hidden bg-card/50 backdrop-blur-[2px]">
        <CardHeader className="py-3.5 sm:py-4 px-4 sm:px-5 border-b bg-gradient-to-b from-muted/40 to-muted/10">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground/95">
            <Bot className="h-5 w-5 text-primary shrink-0" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className="h-[min(520px,58vh)] overflow-y-auto scroll-smooth px-3 sm:px-4 py-4 bg-gradient-to-b from-background/30 to-muted/5"
            style={{ scrollbarGutter: "stable" }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[280px] text-center px-2">
                <div className="rounded-2xl bg-muted/40 p-4 mb-4 ring-1 ring-border/40">
                  <Bot className="h-10 w-10 text-primary/70" />
                </div>
                <p className="text-base font-medium text-foreground/90">What do you want to work on?</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                  One question at a time works best.
                </p>
              </div>
            ) : (
              <div className="space-y-5 max-w-full">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn("flex gap-2.5 sm:gap-3", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {m.role === "assistant" && (
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/20 mt-0.5"
                        aria-hidden
                      >
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "min-w-0 rounded-2xl text-left shadow-sm",
                        m.role === "user"
                          ? "max-w-[88%] sm:max-w-[85%] bg-primary text-primary-foreground px-3.5 py-2.5 sm:px-4 sm:py-3"
                          : "max-w-[min(100%,26rem)] w-full sm:w-auto bg-muted/25 border border-border/50 px-3 py-2.5 sm:px-3.5 sm:py-3 text-foreground",
                      )}
                    >
                      {m.role === "user" ? (
                        <p className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                      ) : (
                        <>
                          <div
                            className={cn(
                              "relative rounded-lg",
                              m.content.length > ASSISTANT_COLLAPSE_CHARS &&
                                !expandAssistant[i] &&
                                "max-h-[8.5rem] overflow-hidden",
                            )}
                          >
                            <div
                              className={cn(
                                "coach-markdown",
                                "[&_.coach-markdown-inner>*:first-child]:mt-0 [&_.coach-markdown-inner>*:last-child]:mb-0",
                              )}
                            >
                              <div className="coach-markdown-inner">
                                <ReactMarkdown components={mdComponents}>{m.content}</ReactMarkdown>
                              </div>
                            </div>
                            {m.content.length > ASSISTANT_COLLAPSE_CHARS && !expandAssistant[i] && (
                              <div
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-lg bg-gradient-to-t from-muted/90 to-transparent"
                                aria-hidden
                              />
                            )}
                          </div>
                          {m.content.length > ASSISTANT_COLLAPSE_CHARS && (
                            <button
                              type="button"
                              className="mt-2 text-[11px] font-medium text-primary hover:underline"
                              onClick={() =>
                                setExpandAssistant((prev) => ({ ...prev, [i]: !prev[i] }))
                              }
                            >
                              {expandAssistant[i] ? "Show less" : "Show more"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {m.role === "user" && (
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/90 ring-1 ring-border/50 mt-0.5"
                        aria-hidden
                      >
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2.5 sm:gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/20 mt-0.5">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-muted/50 border border-border/50 text-sm text-muted-foreground">
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={scrollRef} className="h-px w-full shrink-0" aria-hidden />
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4 border-t border-border/60 bg-muted/20 space-y-3">
            <textarea
              placeholder="One short question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={loading}
              className={cn(
                "flex min-h-[76px] w-full rounded-xl border border-input/80 bg-background/80 px-3 py-2.5 text-sm leading-relaxed",
                "ring-offset-background placeholder:text-muted-foreground/80",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-shadow",
              )}
            />
            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={loading || !input.trim()} className="rounded-xl px-5">
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AICoach;

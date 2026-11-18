import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  FileText,
  Loader2,
  SendHorizontal,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/utils';
import {
  chatbotApi,
  type ChatbotResponse,
  type ChatMessage,
} from '@/api/chatbot';

const TOPIC_LABELS: Record<string, string> = {
  welcome: 'Getting started',
  student_details: 'Student details',
  academic_history: 'Academic history',
  additional_info: 'Additional info',
  documents: 'Documents',
  review: 'Review',
};

export function ChatbotPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState('welcome');
  const [completeness, setCompleteness] = useState(0);
  const [, setAppData] = useState<Record<string, string>>({});
  const [sessionStatus, setSessionStatus] = useState<string>('active');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startChat();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function startChat() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await chatbotApi.start();
      applyResponse(res);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }

  function applyResponse(res: ChatbotResponse) {
    setSessionId(res.session_id);
    setMessages(res.conversation_history);
    setCurrentTopic(res.current_topic);
    setCompleteness(res.completeness);
    setAppData(res.application_data);
    setSessionStatus(res.status);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !sessionId || isSending) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsSending(true);
    setError(null);

    try {
      const res = await chatbotApi.respond(sessionId, text);
      applyResponse(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleSwitchToForm() {
    if (!sessionId) return;
    setError(null);
    try {
      const res = await chatbotApi.switchToForm(sessionId);
      sessionStorage.setItem('chatbot_form_data', JSON.stringify(res.form_data));
      navigate('/enrolment');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleViewSummary() {
    if (!sessionId) return;
    navigate(`/enrolment/chatbot/summary?session_id=${sessionId}`);
  }

  const isCompleted = sessionStatus === 'completed';

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-slate-200/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-slate-400 transition hover:text-brand-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 shadow-glow">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">
                  Enrollment Assistant
                </h1>
                <p className="text-xs text-slate-400">
                  {TOPIC_LABELS[currentTopic] || currentTopic}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwitchToForm}
            disabled={!sessionId}
          >
            <FileText className="h-3.5 w-3.5" />
            Switch to form
          </Button>
        </div>

        <div className="mx-auto mt-2 max-w-3xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Progress</span>
            <span className="font-semibold text-brand-600">{completeness}%</span>
          </div>
          <div className="progress-bar mt-1">
            <div
              className="progress-bar-fill"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-purple-100">
                  <Bot className="h-4 w-4 text-brand-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow'
                    : 'bg-white/80 text-slate-700 shadow-card ring-1 ring-slate-200/40 backdrop-blur-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
              )}
            </motion.div>
          ))}

          {isSending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-purple-100">
                <Bot className="h-4 w-4 text-brand-600" />
              </div>
              <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-card ring-1 ring-slate-200/40 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-5 text-center backdrop-blur-sm"
            >
              <p className="text-sm font-semibold text-emerald-800">
                Application data collected! Review your summary and select a school.
              </p>
              <div className="mt-3 flex justify-center gap-3">
                <Button size="sm" onClick={handleViewSummary} className="shadow-glow">
                  Review &amp; submit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchToForm}
                >
                  Edit in form
                </Button>
              </div>
            </motion.div>
          )}

          {isLoading && messages.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-red-200/60 bg-red-50/80 px-4 py-2 text-center text-sm text-red-700 backdrop-blur-sm"
        >
          {error}
        </motion.div>
      )}

      {!isCompleted && (
        <div className="border-t border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-lg">
          <form
            onSubmit={sendMessage}
            className="mx-auto flex max-w-3xl items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isSending
                  ? 'Waiting for response...'
                  : 'Type your message...'
              }
              disabled={isSending || !sessionId}
              className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm shadow-sm backdrop-blur-sm transition-all focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:shadow-glow disabled:opacity-50"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending || !sessionId}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow transition-all hover:from-brand-700 hover:to-brand-600 active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

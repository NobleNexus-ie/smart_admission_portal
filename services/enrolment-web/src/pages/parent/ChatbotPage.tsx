import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  SendHorizontal,
  Trash2,
  User,
  UserCircle,
  School as SchoolIcon,
  Upload,
  PartyPopper,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DocumentUpload } from '@/components/forms/DocumentUpload';
import { getErrorMessage } from '@/lib/utils';
import { SCHOOL_BOARDS } from '@/lib/types';
import { applicationsApi } from '@/api/applications';
import apiClient from '@/api/client';
import {
  chatbotApi,
  type ChatbotResponse,
  type ChatMessage,
  type ChildOption,
  type SchoolResult,
  type SessionListItem,
} from '@/api/chatbot';

const TOPIC_LABELS: Record<string, string> = {
  welcome: 'Getting started',
  student_details: 'Student details',
  academic_history: 'Academic history',
  additional_info: 'Additional info',
  review: 'Review',
  schools: 'School selection',
  documents: 'Documents & Submit',
};

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  active: { label: 'In progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Ready to submit', color: 'bg-emerald-100 text-emerald-700' },
  switched_to_form: { label: 'Switched to form', color: 'bg-slate-100 text-slate-600' },
  abandoned: { label: 'Incomplete', color: 'bg-amber-100 text-amber-700' },
  submitted: { label: 'Submitted', color: 'bg-purple-100 text-purple-700' },
};

const FIELD_LABELS: Record<string, string> = {
  student_full_name: 'Full Name',
  date_of_birth: 'Date of Birth',
  gender: 'Gender',
  nationality: 'Nationality',
  grade_applying_for: 'Grade Applying For',
  previous_school_name: 'Previous School',
  previous_board: 'Previous Board',
  previous_marks: 'Previous Marks',
  emergency_contact_name: 'Emergency Contact',
  emergency_contact_phone: 'Emergency Phone',
  medical_conditions: 'Medical Conditions',
  special_needs: 'Special Needs',
};

const OPTIONAL_FIELDS = new Set([
  'nationality',
  'previous_school_name',
  'previous_board',
  'previous_marks',
  'medical_conditions',
  'special_needs',
]);

const EXTRA_DOC_LABELS: Record<string, string> = {
  transfer_certificate: 'Transfer Certificate',
  previous_marksheet: 'Previous Marksheet',
  migration_certificate: 'Migration Certificate',
  character_certificate: 'Character Certificate',
  caste_certificate: 'Caste Certificate',
  income_certificate: 'Income Certificate',
  address_proof: 'Address Proof',
};

export function ChatbotPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resumeId = params.get('session_id');

  const [view, setView] = useState<'list' | 'chat'>(resumeId ? 'chat' : 'list');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionSearch, setSessionSearch] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(resumeId);
  const [currentTopic, setCurrentTopic] = useState('welcome');
  const [completeness, setCompleteness] = useState(0);
  const [appData, setAppData] = useState<Record<string, string>>({});
  const [sessionStatus, setSessionStatus] = useState<string>('active');
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [missingMandatory, setMissingMandatory] = useState<string[]>([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(new Set());
  const [alreadySubmittedSchoolIds, setAlreadySubmittedSchoolIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // School selection state
  const [schools, setSchools] = useState<SchoolResult[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolFilterBoard, setSchoolFilterBoard] = useState('');
  const [schoolFilterCity, setSchoolFilterCity] = useState('');

  // Document upload state
  const [birthCert, setBirthCert] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [transcripts, setTranscripts] = useState<File | null>(null);
  const [extraDocs, setExtraDocs] = useState<Record<string, File | null>>({});
  const [docError, setDocError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (resumeId) {
      resumeChat(resumeId);
    } else {
      loadSessions();
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, currentTopic]);

  const isReview = currentTopic === 'review' && missingMandatory.length === 0 && !isEditing;
  const isSchools = currentTopic === 'schools';
  const isDocuments = currentTopic === 'documents';
  const isSubmitted = sessionStatus === 'submitted';
  const hideTextInput = isReview || isDocuments || isSubmitted;

  useEffect(() => {
    if (!isSending && !hideTextInput) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSending, hideTextInput, messages]);

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const list = await chatbotApi.listSessions();
      setSessions(list);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSessionsLoading(false);
    }
  }

  async function resumeChat(id: string) {
    setView('chat');
    setIsLoading(true);
    setError(null);
    try {
      const res = await chatbotApi.resume(id);
      applyResponse(res);
      if (
        res.children &&
        res.children.length > 0 &&
        !res.application_data?.student_full_name &&
        res.status === 'active'
      ) {
        setShowChildPicker(true);
      }
      if (res.current_topic === 'schools' || res.current_topic === 'documents') {
        await loadSchools(id);
      }
    } catch (e) {
      setError(getErrorMessage(e));
      setView('list');
      loadSessions();
    } finally {
      setIsLoading(false);
    }
  }

  async function startNewChat() {
    setView('chat');
    setIsLoading(true);
    setError(null);
    try {
      const res = await chatbotApi.start();
      applyResponse(res);
      if (res.children && res.children.length > 0) {
        setShowChildPicker(true);
      }
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
    setChildren(res.children || []);
    setMissingMandatory(res.missing_mandatory || []);
    if (res.selected_school_ids?.length) {
      setSelectedSchoolIds(new Set(res.selected_school_ids));
    }
    if (res.already_submitted_school_ids?.length) {
      setAlreadySubmittedSchoolIds(new Set(res.already_submitted_school_ids));
    }
    if (res.school_filters) {
      setSchoolFilterBoard(res.school_filters.board || '');
      setSchoolFilterCity(res.school_filters.city || '');
      loadSchools(res.session_id, res.school_filters);
    }
  }

  async function loadSchools(sid: string, filters?: { board?: string; city?: string; area?: string }) {
    setSchoolsLoading(true);
    try {
      const list = await chatbotApi.searchSchools(sid, filters);
      setSchools(list);
    } catch {
      // non-critical
    } finally {
      setSchoolsLoading(false);
    }
  }

  async function handleSelectChild(child: ChildOption) {
    if (!sessionId) return;
    setShowChildPicker(false);
    setIsSending(true);
    setError(null);
    try {
      const res = await chatbotApi.selectChild(sessionId, child.id);
      applyResponse(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  async function handleNewChildInstead() {
    if (!sessionId) return;
    setShowChildPicker(false);
    setIsSending(true);
    setError(null);
    try {
      const res = await chatbotApi.respond(sessionId, '__new_child__');
      applyResponse(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
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
      if (isEditing) setIsEditing(false);
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
      sessionStorage.setItem('chatbot_session_id', res.session_id);
      navigate('/enrolment/continue-from-chat');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleEditInChat() {
    if (!sessionId) return;
    setIsSending(true);
    setIsEditing(true);
    setError(null);
    try {
      const res = await chatbotApi.respond(sessionId, '__edit_details__');
      applyResponse(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  async function handleContinueToSchools() {
    if (!sessionId) return;
    setIsSending(true);
    setError(null);
    try {
      const res = await chatbotApi.respond(sessionId, '__continue_to_schools__');
      applyResponse(res);
      await loadSchools(sessionId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  async function handleConfirmSchools() {
    if (!sessionId || activeSelected.length === 0) return;
    setIsSending(true);
    setError(null);
    try {
      const msg = `__select_schools__:${activeSelected.join(',')}`;
      const res = await chatbotApi.respond(sessionId, msg);
      applyResponse(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmitApplication() {
    if (!sessionId || activeSelected.length === 0) return;

    if (!birthCert || !photo) {
      setDocError('Birth certificate and photograph are required.');
      return;
    }

    const missingExtra = schoolExtraDocs.filter((d) => !extraDocs[d]);
    if (missingExtra.length > 0) {
      const labels = missingExtra.map(
        (d) => EXTRA_DOC_LABELS[d] || d.replace(/_/g, ' '),
      );
      setDocError(`Required by selected school(s): ${labels.join(', ')}`);
      return;
    }

    setSubmitting(true);
    setDocError(null);
    setError(null);
    try {
      const app = await applicationsApi.create({
        school_id: activeSelected[0],
        form_data: appData as any,
        method: 'agentic',
      });

      await applicationsApi.uploadDocument(app.id, birthCert, 'birth_cert');
      await applicationsApi.uploadDocument(app.id, photo, 'photo');
      if (transcripts) {
        await applicationsApi.uploadDocument(app.id, transcripts, 'transcript');
      }

      for (const docKey of schoolExtraDocs) {
        const file = extraDocs[docKey];
        if (file) {
          await applicationsApi.uploadDocument(app.id, file, docKey);
        }
      }

      if (activeSelected.length === 1) {
        await applicationsApi.submit(app.id);
      } else {
        await apiClient.post('/applications/submit-multi', {
          application_id: app.id,
          school_ids: activeSelected,
        });
      }

      const res = await chatbotApi.respond(sessionId, '__application_submitted__');
      applyResponse(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApplyMoreSchools() {
    if (!sessionId) return;
    setIsSending(true);
    setError(null);
    setBirthCert(null);
    setPhoto(null);
    setTranscripts(null);
    setExtraDocs({});
    setSelectedSchoolIds(new Set());
    try {
      const res = await chatbotApi.respond(sessionId, '__apply_more_schools__');
      applyResponse(res);
      await loadSchools(sessionId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  function toggleSchool(id: string) {
    const school = schools.find((s) => s.id === id);
    if (school?.status !== 'active') return;
    if (alreadySubmittedSchoolIds.has(id)) return;
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBackToList() {
    setView('list');
    setMessages([]);
    setSessionId(null);
    setCurrentTopic('welcome');
    setCompleteness(0);
    setSessionStatus('active');
    setShowChildPicker(false);
    setError(null);
    setSchools([]);
    setSelectedSchoolIds(new Set());
    setBirthCert(null);
    setPhoto(null);
    setTranscripts(null);
    setExtraDocs({});
    loadSessions();
  }

  async function handleDeleteSessions(ids: string[]) {
    if (ids.length === 0) return;
    try {
      await chatbotApi.deleteSessions(ids);
      setSessions((prev) => prev.filter((s) => !ids.includes(s.session_id)));
      setSelectedSessionIds(new Set());
      setSelectMode(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function toggleSessionSelect(id: string) {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getSessionStatusLabel(s: SessionListItem) {
    if (s.status === 'completed' && s.submitted_school_count > 0) {
      return {
        label: `Submitted (${s.submitted_school_count} school${s.submitted_school_count > 1 ? 's' : ''})`,
        color: 'bg-purple-100 text-purple-700',
      };
    }
    return STATUS_STYLES[s.status] || STATUS_STYLES.active;
  }

  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    const q = sessionSearch.trim().toLowerCase();
    return sessions.filter(
      (s) =>
        (s.student_name || '').toLowerCase().includes(q) ||
        (s.status || '').toLowerCase().includes(q),
    );
  }, [sessions, sessionSearch]);

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      if (schoolSearch && !s.name.toLowerCase().includes(schoolSearch.toLowerCase())) return false;
      if (schoolFilterBoard && s.board !== schoolFilterBoard) return false;
      if (schoolFilterCity && !s.city?.toLowerCase().includes(schoolFilterCity.toLowerCase())) return false;
      return true;
    });
  }, [schools, schoolSearch, schoolFilterBoard, schoolFilterCity]);

  const activeSelected = useMemo(() => {
    return [...selectedSchoolIds].filter((id) => {
      const s = schools.find((sch) => sch.id === id);
      return s?.status === 'active';
    });
  }, [selectedSchoolIds, schools]);

  const schoolExtraDocs = useMemo(() => {
    const docSet = new Set<string>();
    for (const id of activeSelected) {
      const school = schools.find((s) => s.id === id);
      for (const doc of school?.required_documents ?? []) {
        if (doc !== 'birth_cert' && doc !== 'photo' && doc !== 'transcript') {
          docSet.add(doc);
        }
      }
    }
    return [...docSet];
  }, [activeSelected, schools]);

  if (view === 'list') {
    return (
      <div className="page-container max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-slate-400 transition hover:text-brand-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 shadow-glow">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Enrollment Assistant
              </h1>
              <p className="text-sm text-slate-500">
                Chat with our AI assistant to fill your application
              </p>
            </div>
          </div>
        </div>

        <Button onClick={startNewChat} className="w-full shadow-glow">
          <Plus className="h-4 w-4" />
          Start new conversation
        </Button>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {sessionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : sessions.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Recent conversations
              </h2>
              <div className="flex items-center gap-2">
                {selectMode ? (
                  <>
                    <span className="text-xs text-slate-500">
                      {selectedSessionIds.size} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedSessionIds.size === filteredSessions.length) {
                          setSelectedSessionIds(new Set());
                        } else {
                          setSelectedSessionIds(new Set(filteredSessions.map((s) => s.session_id)));
                        }
                      }}
                      className="text-xs"
                    >
                      {selectedSessionIds.size === filteredSessions.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDeleteSessions([...selectedSessionIds])}
                      disabled={selectedSessionIds.size === 0}
                      className="bg-red-600 text-xs hover:bg-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete ({selectedSessionIds.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectMode(false);
                        setSelectedSessionIds(new Set());
                      }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectMode(true)}
                    className="text-xs"
                  >
                    Select
                  </Button>
                )}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="w-48 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                  />
                </div>
              </div>
            </div>
            {filteredSessions.map((s) => {
              const style = getSessionStatusLabel(s);
              const isSwitchedToForm = s.status === 'switched_to_form';
              const canResume = s.status === 'active' || s.status === 'completed' || s.status === 'abandoned' || s.status === 'submitted' || isSwitchedToForm;
              return (
                <motion.div
                  key={s.session_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-soft transition hover:shadow-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={selectedSessionIds.has(s.session_id)}
                          onChange={() => toggleSessionSelect(s.session_id)}
                          className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                        />
                      )}
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                        <MessageSquare className="h-4 w-4 text-brand-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {s.student_name || 'Untitled application'}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                          <span>{TOPIC_LABELS[s.current_topic] || s.current_topic}</span>
                          <span>&middot;</span>
                          <span>{s.completeness}% complete</span>
                          {s.updated_at && (
                            <>
                              <span>&middot;</span>
                              <span>{new Date(s.updated_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.color}`}>
                        {style.label}
                      </span>
                      {canResume && !selectMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (isSwitchedToForm) {
                              try {
                                const res = await chatbotApi.switchToForm(s.session_id);
                                sessionStorage.setItem('chatbot_form_data', JSON.stringify(res.form_data));
                                sessionStorage.setItem('chatbot_session_id', res.session_id);
                                navigate('/enrolment/continue-from-chat');
                              } catch (err) {
                                setError(getErrorMessage(err));
                              }
                            } else {
                              resumeChat(s.session_id);
                            }
                          }}
                        >
                          {isSwitchedToForm ? 'Continue in Form' : s.status === 'submitted' ? 'View' : s.status === 'completed' ? 'Continue' : 'Resume'}
                        </Button>
                      )}
                      {!selectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSessions([s.session_id]);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          title="Delete conversation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all"
                        style={{ width: `${s.completeness}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
            <Bot className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No conversations yet. Start a new one to begin your application!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-slate-200/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToList}
              className="text-slate-400 transition hover:text-brand-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
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
          {!isSubmitted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwitchToForm}
              disabled={!sessionId}
            >
              <FileText className="h-3.5 w-3.5" />
              Switch to form
            </Button>
          )}
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
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
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

          {/* Child picker card */}
          {showChildPicker && children.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-brand-200/60 bg-brand-50/70 p-5 backdrop-blur-sm"
            >
              <p className="mb-3 text-sm font-semibold text-brand-800">
                Select a child from your profile, or continue to add a new child:
              </p>
              <div className="space-y-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => handleSelectChild(child)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-400 hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100">
                      <UserCircle className="h-5 w-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {child.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {child.dob || 'DOB not set'} · {child.gender || 'Gender not set'}
                      </p>
                    </div>
                  </button>
                ))}
                <button
                  onClick={handleNewChildInstead}
                  className="w-full rounded-xl border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Plus className="mr-1 inline-block h-4 w-4" />
                  Add a new child instead
                </button>
              </div>
            </motion.div>
          )}

          {/* Review summary card */}
          {isReview && !isSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-200/60 bg-white/90 p-5 shadow-card backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800">
                  Application details collected!
                </p>
              </div>

              <div className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
                {Object.entries(appData)
                  .filter(([, v]) => v)
                  .map(([key, value]) => {
                    const isNone = value === 'None' || value === 'No';
                    const displayValue = isNone ? 'None' : value;
                    return (
                    <div key={key} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-slate-500">
                        {FIELD_LABELS[key] || key.replace(/_/g, ' ')}
                        {OPTIONAL_FIELDS.has(key) && (
                          <span className="ml-1 text-slate-400">(Optional)</span>
                        )}
                      </span>
                      <span className={`font-medium ${isNone ? 'text-slate-400' : 'text-slate-900'}`}>{displayValue}</span>
                    </div>
                    );
                  })}
              </div>

              <div className="flex gap-3">
                <Button size="sm" onClick={handleContinueToSchools} className="shadow-glow">
                  <SchoolIcon className="h-3.5 w-3.5" />
                  Select Schools
                </Button>
                <Button variant="outline" size="sm" onClick={handleEditInChat}>
                  Edit Details
                </Button>
              </div>
            </motion.div>
          )}

          {/* School selection card */}
          {isSchools && !isSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-blue-200/60 bg-white/90 p-5 shadow-card backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <SchoolIcon className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-semibold text-blue-800">
                  Select Schools to Apply
                </p>
              </div>

              {alreadySubmittedSchoolIds.size > 0 && (
                <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                  <p className="text-xs text-purple-700">
                    You've already applied to {alreadySubmittedSchoolIds.size} school{alreadySubmittedSchoolIds.size > 1 ? 's' : ''} for this student.
                    Those are marked as "Already applied" and cannot be selected again.
                  </p>
                </div>
              )}

              {/* Filters */}
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={schoolSearch}
                    onChange={(e) => setSchoolSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                  />
                </div>
                <select
                  value={schoolFilterBoard}
                  onChange={(e) => setSchoolFilterBoard(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                >
                  <option value="">All boards</option>
                  {SCHOOL_BOARDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Filter by city..."
                  value={schoolFilterCity}
                  onChange={(e) => setSchoolFilterCity(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
                />
              </div>

              {schoolsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                </div>
              ) : filteredSchools.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">No schools match your filters.</p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {filteredSchools.map((school) => {
                    const isActive = school.status === 'active';
                    const isAlreadySubmitted = alreadySubmittedSchoolIds.has(school.id);
                    const isDisabled = !isActive || isAlreadySubmitted;
                    const isSelected = selectedSchoolIds.has(school.id);
                    return (
                      <label
                        key={school.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                          isDisabled
                            ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                            : isSelected
                              ? 'cursor-pointer border-brand-500 bg-brand-50 ring-1 ring-brand-500/30'
                              : 'cursor-pointer border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleSchool(school.id)}
                          className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-900">{school.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {school.board} · {school.area}, {school.city}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAlreadySubmitted ? (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                              Already applied
                            </span>
                          ) : isActive ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              Active
                            </span>
                          ) : (
                            <div className="text-right">
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                Inactive
                              </span>
                              <p className="mt-0.5 text-[8px] text-slate-400">
                                Not accepting applications
                              </p>
                            </div>
                          )}
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-brand-600" />
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {activeSelected.length > 0 && (
                <p className="mt-3 text-xs font-medium text-brand-700">
                  {activeSelected.length} school{activeSelected.length > 1 ? 's' : ''} selected
                </p>
              )}

              <div className="mt-4 flex gap-3">
                <Button
                  size="sm"
                  onClick={handleConfirmSchools}
                  disabled={activeSelected.length === 0 || isSending}
                  loading={isSending}
                  className="shadow-glow"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Confirm Schools & Upload Documents
                </Button>
              </div>
            </motion.div>
          )}

          {/* Document upload & submit card */}
          {isDocuments && !isSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-amber-200/60 bg-white/90 p-5 shadow-card backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <Upload className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">
                  Upload Documents & Submit
                </p>
              </div>

              <p className="mb-4 text-xs text-slate-600">
                Please upload the required documents to complete your application.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <DocumentUpload
                  label="Birth Certificate"
                  required
                  value={birthCert}
                  onChange={setBirthCert}
                />
                <DocumentUpload
                  label="Recent Photograph"
                  required
                  accept=".jpg,.jpeg,.png"
                  value={photo}
                  onChange={setPhoto}
                />
                <DocumentUpload
                  label="Previous Transcripts"
                  value={transcripts}
                  onChange={setTranscripts}
                />
                {schoolExtraDocs.map((docKey) => (
                  <DocumentUpload
                    key={docKey}
                    label={EXTRA_DOC_LABELS[docKey] || docKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    required
                    value={extraDocs[docKey] || null}
                    onChange={(file) =>
                      setExtraDocs((prev) => ({ ...prev, [docKey]: file }))
                    }
                  />
                ))}
              </div>

              {schoolExtraDocs.length > 0 && (
                <p className="mt-2 text-[10px] text-amber-600">
                  Additional documents required by selected school(s).
                </p>
              )}

              {docError && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {docError}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  onClick={handleSubmitApplication}
                  disabled={submitting || !birthCert || !photo}
                  loading={submitting}
                  className="shadow-glow"
                >
                  Submit to {activeSelected.length || '...'} school
                  {activeSelected.length !== 1 ? 's' : ''}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyMoreSchools}
                  disabled={submitting}
                >
                  <SchoolIcon className="h-3.5 w-3.5" />
                  Change Schools
                </Button>
              </div>
            </motion.div>
          )}

          {/* Success card */}
          {isSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-green-50 p-6 shadow-card backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <PartyPopper className="h-6 w-6 text-emerald-600" />
                <p className="text-base font-bold text-emerald-800">
                  Application Submitted!
                </p>
              </div>
              <p className="mb-4 text-sm text-emerald-700">
                Your application has been submitted to {activeSelected.length || 'the selected'} school
                {activeSelected.length !== 1 ? 's' : ''} successfully.
                You'll receive email confirmations from each school.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
                <Button size="sm" variant="outline" onClick={handleApplyMoreSchools}>
                  <SchoolIcon className="h-3.5 w-3.5" />
                  Apply to More Schools
                </Button>
                <Button size="sm" variant="outline" onClick={handleBackToList}>
                  Start Another Application
                </Button>
              </div>
            </motion.div>
          )}

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

      {!hideTextInput && (
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
                  : isEditing
                    ? 'e.g. "change the name to Ravi" or "update DOB to 2015-03-10"...'
                    : isSchools
                      ? 'Filter schools, e.g. "Show CBSE schools in Noida"...'
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

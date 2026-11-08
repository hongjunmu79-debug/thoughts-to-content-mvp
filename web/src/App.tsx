import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clipboard,
  Download,
  Feather,
  LoaderCircle,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  ThumbsUp,
  UserRoundCheck,
  WandSparkles,
  X,
} from "lucide-react";
import { generateContent, getHealth, saveFeedback, transcribeAudio } from "./api";
import type { ContentFormat, FeedbackValue, Generation, Health } from "./types";
import { useRecorder } from "./useRecorder";

const formats: { value: ContentFormat; label: string; short: string }[] = [
  { value: "linkedin", label: "LinkedIn post", short: "LinkedIn" },
  { value: "x_thread", label: "X thread", short: "X thread" },
  { value: "newsletter", label: "Newsletter draft", short: "Newsletter" },
  { value: "blog", label: "Blog draft", short: "Blog" },
  { value: "short_video", label: "Short video script", short: "Video" },
];

const feedbackOptions: { value: FeedbackValue; label: string; icon: typeof Check }[] = [
  { value: "sounds_like_me", label: "Sounds like me", icon: UserRoundCheck },
  { value: "would_publish", label: "I'd publish this", icon: ThumbsUp },
  { value: "too_ai", label: "Too AI-ish", icon: X },
];

const starter = `Okay, here's the thing I keep coming back to: productivity advice is weirdly obsessed with squeezing more out of a day. I don't need twelve optimized hours. I need, like, two honest hours where my brain isn't negotiating with six tabs and a blinking phone. Maybe the goal isn't doing more. Maybe it's making the good hours less crowded.`;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function App() {
  const [source, setSource] = useState("");
  const [format, setFormat] = useState<ContentFormat>("linkedin");
  const [voiceNotes, setVoiceNotes] = useState("");
  const [showVoiceNotes, setShowVoiceNotes] = useState(false);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<Set<FeedbackValue>>(new Set());
  const [feedbackBusy, setFeedbackBusy] = useState<FeedbackValue | null>(null);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const onRecording = async (blob: Blob) => {
    setIsTranscribing(true);
    setError("");
    try {
      const text = await transcribeAudio(blob);
      setSource((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text));
    } catch (recordingError) {
      setError(errorMessage(recordingError));
    } finally {
      setIsTranscribing(false);
    }
  };

  const recorder = useRecorder(onRecording);
  const selectedFormat = useMemo(() => formats.find((item) => item.value === format)!, [format]);
  const wordCount = source.trim() ? source.trim().split(/\s+/).length : 0;

  const handleRecord = async () => {
    setError("");
    try {
      if (recorder.isRecording) recorder.stop();
      else await recorder.start();
    } catch (recordingError) {
      setError(errorMessage(recordingError));
    }
  };

  const handleGenerate = async () => {
    if (source.trim().length < 20) {
      setError("Give us a little more to work with — at least a sentence or two.");
      return;
    }
    setError("");
    setIsGenerating(true);
    setGeneration(null);
    setSubmittedFeedback(new Set());
    try {
      setGeneration(await generateContent(source, format, voiceNotes));
      window.setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (generationError) {
      setError(errorMessage(generationError));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generation) return;
    await navigator.clipboard.writeText(generation.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleExport = () => {
    if (!generation) return;
    const file = new Blob([generation.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${generation.content_format}-${generation.id}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleFeedback = async (value: FeedbackValue) => {
    if (!generation || submittedFeedback.has(value)) return;
    setFeedbackBusy(value);
    setError("");
    try {
      await saveFeedback(generation.id, value);
      setSubmittedFeedback((current) => new Set(current).add(value));
    } catch (feedbackError) {
      setError(errorMessage(feedbackError));
    } finally {
      setFeedbackBusy(null);
    }
  };

  const reset = () => {
    setGeneration(null);
    setSubmittedFeedback(new Set());
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-paper text-ink">
      <div className="grain" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-lime"><Feather size={17} /></span>
          <span>Say It Like You</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-ink/55">
          <span className={`h-2 w-2 rounded-full ${health?.generation_configured ? "bg-emerald-500" : "bg-amber-500"}`} />
          {health ? (health.generation_configured ? "AI ready" : "Setup needed") : "API offline"}
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/55 px-3 py-1.5 text-xs font-semibold text-moss shadow-sm backdrop-blur">
            <Sparkles size={13} /> Your words. Shaped, not replaced.
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Say the messy thing.<br /><span className="font-serif italic text-moss">Keep your voice.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-7 text-ink/60 sm:text-lg">
            Talk it out or paste a rough thought. Get something ready to publish—without the polished-to-death AI voice.
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-4xl sm:mt-14">
          <div className="absolute -inset-8 -z-10 rounded-[4rem] bg-lime/35 blur-3xl" />
          <div className="overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white/80 shadow-lift backdrop-blur sm:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4 sm:px-7">
              <div>
                <p className="text-sm font-semibold">Start with the raw version</p>
                <p className="mt-0.5 text-xs text-ink/45">English, 中文, or both</p>
              </div>
              {source && <button onClick={() => setSource("")} className="text-xs font-medium text-ink/45 transition hover:text-ink">Clear</button>}
            </div>

            <div className="p-4 sm:p-6">
              <textarea
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Paste the unfiltered thought here… the ramble, the rough draft, the voice note transcript. Don't clean it up first."
                className="min-h-52 w-full resize-none rounded-2xl bg-stone-50/80 p-5 text-[15px] leading-7 outline-none ring-1 ring-inset ring-ink/8 transition placeholder:text-ink/30 focus:bg-white focus:ring-moss/35 sm:min-h-60 sm:p-6 sm:text-base"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRecord}
                    disabled={isTranscribing}
                    className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:opacity-50 ${recorder.isRecording ? "bg-red-600 text-white shadow-lg shadow-red-200" : "bg-ink text-white hover:bg-moss"}`}
                  >
                    {recorder.isRecording ? <><Square size={14} fill="currentColor" /> Stop · {formatDuration(recorder.seconds)}</> : isTranscribing ? <><LoaderCircle size={16} className="animate-spin" /> Transcribing…</> : <><Mic size={16} /> Talk it out</>}
                  </button>
                  <span className="text-xs text-ink/40">{wordCount ? `${wordCount} words` : health?.transcription_configured ? "Mic is ready" : "Text works without STT setup"}</span>
                </div>
                {!source && <button onClick={() => setSource(starter)} className="text-left text-xs font-semibold text-moss underline decoration-moss/25 underline-offset-4 hover:decoration-moss">Try a voice-y example</button>}
              </div>
            </div>

            <div className="border-t border-ink/8 bg-stone-50/70 px-4 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-ink/45">Shape it for</label>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                    {formats.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setFormat(item.value)}
                        className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${format === item.value ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/55 hover:border-ink/25 hover:text-ink"}`}
                      >
                        {item.short}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || recorder.isRecording || isTranscribing}
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-moss px-6 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5 hover:bg-[#234b37] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? <><LoaderCircle size={17} className="animate-spin" /> Listening for your voice…</> : <><WandSparkles size={17} /> Make my {selectedFormat.short}<ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></>}
                </button>
              </div>
              <button onClick={() => setShowVoiceNotes((value) => !value)} className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-ink/45 hover:text-ink">
                <ChevronDown size={14} className={`transition ${showVoiceNotes ? "rotate-180" : ""}`} /> Add a voice note (optional)
              </button>
              {showVoiceNotes && (
                <input
                  value={voiceNotes}
                  onChange={(event) => setVoiceNotes(event.target.value)}
                  placeholder="e.g. Keep my dry humor. I never use emojis. Don't make me sound certain."
                  className="mt-3 w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none focus:border-moss/40"
                />
              )}
            </div>
          </div>

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
              <X className="mt-0.5 shrink-0" size={16} /><span>{error}</span>
            </div>
          )}
        </div>
      </section>

      {generation && (
        <section id="result" className="relative z-10 border-t border-ink/10 bg-[#e9ece3] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-moss">Voice-preserved draft</p>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Same thought. Ready to go.</h2>
              </div>
              <button onClick={reset} className="inline-flex items-center gap-2 self-start text-sm font-semibold text-ink/50 hover:text-ink"><RotateCcw size={15} /> Start another</button>
            </div>

            <div className="grid overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white shadow-lift lg:grid-cols-2">
              <article className="border-b border-ink/10 bg-stone-50 p-6 lg:border-b-0 lg:border-r sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink/40">What you said</span>
                  <span className="rounded-full border border-ink/8 px-2.5 py-1 text-[11px] text-ink/40">Raw</span>
                </div>
                <div className="whitespace-pre-wrap text-[15px] leading-7 text-ink/65 sm:text-base">{generation.source_text}</div>
              </article>

              <article className="p-6 sm:p-8">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{formats.find((item) => item.value === generation.content_format)?.label}</span>
                  <div className="flex gap-2">
                    <button onClick={handleExport} title="Download Markdown" className="grid h-9 w-9 place-items-center rounded-full border border-ink/10 text-ink/50 transition hover:bg-paper hover:text-ink"><Download size={15} /></button>
                    <button onClick={handleCopy} className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-3.5 text-xs font-semibold text-white transition hover:bg-moss">
                      {copied ? <><Check size={14} /> Copied</> : <><Clipboard size={14} /> Copy</>}
                    </button>
                  </div>
                </div>
                <div className={`platform-preview ${generation.content_format === "x_thread" ? "x-preview" : ""}`}>
                  {generation.content}
                </div>
                <div className="mt-8 rounded-2xl border border-moss/10 bg-emerald-50/60 p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-moss"><Sparkles size={13} /> What the AI heard in your voice</div>
                  <p className="text-xs leading-5 text-ink/55">{generation.voice_profile}</p>
                  {generation.preserved_phrases.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {generation.preserved_phrases.map((phrase) => <span key={phrase} className="rounded-full bg-white px-2.5 py-1 text-[11px] text-ink/55">“{phrase}”</span>)}
                    </div>
                  )}
                </div>
              </article>
            </div>

            <div className="mx-auto mt-8 max-w-2xl text-center">
              <h3 className="text-lg font-semibold">Quick gut check: does this feel true?</h3>
              <p className="mt-1 text-sm text-ink/50">This feedback is saved—not just decoration. Pick any that apply.</p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                {feedbackOptions.map((option) => {
                  const Icon = option.icon;
                  const done = submittedFeedback.has(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleFeedback(option.value)}
                      disabled={done || feedbackBusy !== null}
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition disabled:cursor-default ${done ? "border-moss bg-moss text-white" : option.value === "too_ai" ? "border-ink/10 bg-white/60 text-ink/60 hover:border-red-300 hover:text-red-700" : "border-ink/10 bg-white/60 text-ink/60 hover:border-moss/30 hover:text-moss"}`}
                    >
                      {feedbackBusy === option.value ? <LoaderCircle size={15} className="animate-spin" /> : done ? <Check size={15} /> : <Icon size={15} />}
                      {done ? "Saved" : option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="relative z-10 border-t border-ink/10 bg-paper px-5 py-8 text-center text-xs text-ink/40">
        Text is sent to your configured AI provider. Recordings are sent only to your STT provider and are not stored by this app. Drafts and feedback live in local SQLite.
      </footer>
    </main>
  );
}

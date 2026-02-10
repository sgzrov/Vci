import * as React from "react"
import { Play, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { VCIClient, type VapiEvent, type SessionState } from "@/api/client"

/* ── types ── */
type Actor = "customer" | "company"
type Severity = "info" | "warning" | "danger" | "success"

type FeedEvent = {
  id: string
  title: string
  detail: string
  severity: Severity
  deltaScore?: number
  rule?: string
  ts: string
}

type TranscriptMessage = {
  id: string
  actor: Actor
  text: string
  ts: string
}

type ScriptStep = {
  actor: Actor
  text: string
  vapiEvents: VapiEvent[]
  feedEvent?: Omit<FeedEvent, "id" | "ts">
}

/* ── scripted scenario with Vapi events ── */
const SCRIPT: ScriptStep[] = [
  {
    actor: "customer",
    text: "Hi. My internet is down again. I need this fixed right now.",
    vapiEvents: [
      { type: "call_started", ts: Date.now() },
      { type: "user_transcript", text: "Hi. My internet is down again. I need this fixed right now.", ts: Date.now() },
    ],
    feedEvent: {
      title: "Session started",
      detail: "Customer AI begins test scenario",
      severity: "info",
      rule: "test.start",
    },
  },
  {
    actor: "company",
    text: "Hi — I can help. Can you confirm your account email or the last 4 digits of your phone?",
    vapiEvents: [
      { type: "agent_transcript", text: "Hi — I can help. Can you confirm your account email or the last 4 digits of your phone?", ts: Date.now() },
      { type: "latency", ms: 1200 },
    ],
    feedEvent: {
      title: "✓ Identity verification",
      detail: "Company AI correctly verified identity before proceeding",
      severity: "success",
      deltaScore: +4,
      rule: "verify_identity",
    },
  },
  {
    actor: "customer",
    text: "It's maru… wait, why do you always ask that? Just reset it.",
    vapiEvents: [
      { type: "user_transcript", text: "It's maru… wait, why do you always ask that? Just reset it.", ts: Date.now() },
    ],
  },
  {
    actor: "company",
    text: "Fair point. I ask to protect your account. Once confirmed I'll run a line check and walk you through the fix.",
    vapiEvents: [
      { type: "agent_transcript", text: "Fair point. I ask to protect your account. Once confirmed I'll run a line check and walk you through the fix.", ts: Date.now() },
      { type: "latency", ms: 1500 },
    ],
    feedEvent: {
      title: "✓ Clear explanation",
      detail: "Justified policy and provided next steps",
      severity: "success",
      deltaScore: +6,
      rule: "explain_reasoning",
    },
  },
  {
    actor: "customer",
    text: "Fine. Email is marufov@example.com. Also — hello?? are you there?",
    vapiEvents: [
      { type: "user_transcript", text: "Fine. Email is marufov@example.com. Also — hello?? are you there?", ts: Date.now() },
    ],
  },
  {
    actor: "company",
    text: "I'm here. Account verified — checking your line now. If modem lights are flashing we'll power-cycle next.",
    vapiEvents: [
      { type: "agent_transcript", text: "I'm here. Account verified — checking your line now. If modem lights are flashing we'll power-cycle next.", ts: Date.now() },
      { type: "latency", ms: 1100 },
    ],
    feedEvent: {
      title: "✓ No stalling",
      detail: "Acknowledged presence and narrated current action",
      severity: "success",
      deltaScore: +5,
      rule: "responsiveness",
    },
  },
  {
    actor: "customer",
    text: "I already rebooted twice. This is ridiculous. Put me through to a supervisor.",
    vapiEvents: [
      { type: "user_transcript", text: "I already rebooted twice. This is ridiculous. Put me through to a supervisor.", ts: Date.now() },
    ],
  },
  {
    actor: "company",
    text: "Understood. Before I escalate — is the WAN light off or blinking? Helps me route you to the right team.",
    vapiEvents: [
      { type: "agent_transcript", text: "Understood. Before I escalate — is the WAN light off or blinking? Helps me route you to the right team.", ts: Date.now() },
      { type: "latency", ms: 1400 },
    ],
    feedEvent: {
      title: "⚠ Delaying escalation",
      detail: "Asked question before escalating as requested",
      severity: "warning",
      deltaScore: -3,
      rule: "escalation_delay",
    },
  },
  {
    actor: "customer",
    text: "Off. And stop talking over me — I said I want escalation.",
    vapiEvents: [
      { type: "barge_in", ts: Date.now() },
      { type: "user_transcript", text: "Off. And stop talking over me — I said I want escalation.", ts: Date.now() },
    ],
  },
  {
    actor: "company",
    text: "You're right — sorry. Escalating now. I'm noting WAN light off and two reboots already done.",
    vapiEvents: [
      { type: "agent_transcript", text: "You're right — sorry. Escalating now. I'm noting WAN light off and two reboots already done.", ts: Date.now() },
      { type: "latency", ms: 1300 },
      { type: "call_ended", ts: Date.now() },
    ],
    feedEvent: {
      title: "✓ Recovery",
      detail: "Apologized and escalated immediately without arguing",
      severity: "success",
      deltaScore: +8,
      rule: "graceful_recovery",
    },
  },
]

/* ── animated circle ── */
function AgentCircle({
  label,
  color,
  active,
  idle,
}: {
  label: string
  color: "coral" | "teal"
  active: boolean
  idle: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className={cn(
          "rounded-full transition-all duration-700 ease-out",
          active && "scale-110",
          !active && !idle && "scale-100 opacity-60",
          idle && "scale-100 opacity-40",
          color === "coral"
            ? "bg-gradient-to-br from-rose-400 via-orange-400 to-amber-400 shadow-[0_8px_32px_rgba(251,146,60,0.4)]"
            : "bg-gradient-to-br from-teal-400 via-cyan-400 to-sky-400 shadow-[0_8px_32px_rgba(45,212,191,0.4)]",
          active &&
            (color === "coral"
              ? "shadow-[0_12px_48px_rgba(251,146,60,0.6)]"
              : "shadow-[0_12px_48px_rgba(45,212,191,0.6)]"),
        )}
        style={{ width: 180, height: 180 }}
      />

      <div className="text-center">
        <div className="text-[15px] font-semibold text-zinc-700">{label}</div>
        <div
          className={cn(
            "mt-1 text-[13px] font-medium transition-colors",
            active ? "text-emerald-600" : idle ? "text-zinc-300" : "text-zinc-400",
          )}
        >
          {active ? "Speaking…" : idle ? "Idle" : "Listening…"}
        </div>
      </div>
    </div>
  )
}

/* ── main app ── */
export default function App() {
  const [running, setRunning] = React.useState(false)
  const [stepIdx, setStepIdx] = React.useState(0)
  const [feed, setFeed] = React.useState<FeedEvent[]>([])
  const [transcript, setTranscript] = React.useState<TranscriptMessage[]>([])
  const [score, setScore] = React.useState(75)
  const [done, setDone] = React.useState(false)
  const [roomId, setRoomId] = React.useState<string | null>(null)
  const [backendState, setBackendState] = React.useState<SessionState | null>(null)

  const speaking: Actor | null = running ? SCRIPT[stepIdx]?.actor ?? null : null
  const feedEndRef = React.useRef<HTMLDivElement>(null)
  const transcriptEndRef = React.useRef<HTMLDivElement>(null)

  const reset = React.useCallback(() => {
    setRunning(false)
    setStepIdx(0)
    setFeed([])
    setTranscript([])
    setScore(75)
    setDone(false)
    setRoomId(null)
    setBackendState(null)
  }, [])

  const start = React.useCallback(async () => {
    reset()
    
    // Try backend first; fall back to local demo if unavailable
    try {
      const state = await VCIClient.createRoom()
      setRoomId(state.roomId)
      setBackendState(state)
      setRunning(true)
    } catch (err) {
      console.error("Backend unavailable, running in local demo mode:", err)
      // Local mode: run scripted flow without backend
      setRoomId("local-demo")
      setBackendState({ roomId: "local-demo", startedAt: null, firstResponseMs: null, deadAirDetected: false, requiredStepSeen: false, interruptionCount: 0, ended: false, status: "running", failureReason: null, events: 0 })
      setRunning(true)
    }
  }, [reset])

  /* tick through script */
  React.useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setStepIdx((i) => i + 1), 1400)
    return () => window.clearInterval(id)
  }, [running])

  /* process each step and send Vapi events to backend */
  const isLocalMode = roomId === "local-demo"

  React.useEffect(() => {
    if (!running) return

    if (stepIdx >= SCRIPT.length) {
      setRunning(false)
      setDone(true)
      
      // Get final state from backend (skip in local mode)
      if (isLocalMode) {
        const pass = score >= 80
        setFeed((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            title: pass ? "✓ TEST PASSED" : "✗ TEST FAILED",
            detail: pass ? "Demo complete. Connect backend for full evaluation." : "Demo complete.",
            severity: pass ? "success" : "danger",
            rule: "final_result",
            ts: now(),
          },
        ])
        return
      }

      VCIClient.getState(roomId!).then((state) => {
        setBackendState(state)
        const pass = state.status === "pass"
        const finalScore = pass ? 95 : 65 // Map backend result to score
        setScore(finalScore)
        
        setFeed((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            title: pass ? "✓ TEST PASSED" : "✗ TEST FAILED",
            detail: pass
              ? `Backend evaluation: PASS. All compliance rules met.`
              : `Backend evaluation: FAIL. ${state.failureReason || "Check logs for details."}`,
            severity: pass ? "success" : "danger",
            rule: "final_result",
            ts: now(),
          },
        ])
      }).catch((err) => {
        console.error("Failed to get final state:", err)
      })
      
      return
    }

    const step = SCRIPT[stepIdx]
    if (!step) return

    // Add message to transcript
    setTranscript((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        actor: step.actor,
        text: step.text,
        ts: now(),
      },
    ])

    // Send Vapi events to backend (skip in local mode)
    if (!isLocalMode && roomId) {
      (async () => {
        try {
          for (const vapiEvent of step.vapiEvents) {
            const state = await VCIClient.sendEvent(roomId, vapiEvent)
            setBackendState(state)
            
            // Check if backend detected a failure
            if (state.status === "fail" && state.failureReason) {
              const reason = state.failureReason
              setFeed((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  title: "⚠ Rule Violation",
                  detail: reason,
                  severity: "danger",
                  rule: "backend_rule",
                  ts: now(),
                },
              ])
            }
          }
        } catch (err) {
          console.error("Failed to send event:", err)
        }
      })()
    }

    // Add UI feed event if present
    const ev = step.feedEvent
    if (ev) {
      const d = ev.deltaScore ?? 0
      if (d !== 0) setScore((s) => Math.max(0, Math.min(100, s + d)))
      setFeed((prev) => [...prev, { id: crypto.randomUUID(), ts: now(), ...ev }])
    }
  }, [running, stepIdx, roomId, isLocalMode])

  /* auto-scroll feed */
  React.useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [feed])

  /* auto-scroll transcript */
  React.useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript])

  const idle = !running && !done

  return (
    <div className="flex h-screen flex-col bg-white text-zinc-900">
      {/* ── top bar ── */}
      <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-zinc-800">Sentra</span>
          <span className="text-[11px] text-zinc-400">Company AI under evaluation</span>
          {roomId && (
            <span className="text-[10px] text-zinc-300 font-mono">
              {roomId.slice(0, 12)}...
            </span>
          )}
          {done && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                score >= 80 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600",
              )}
            >
              {score >= 80 ? "PASS" : "FAIL"} — {score}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={start}
            disabled={running}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition",
              running
                ? "cursor-not-allowed bg-zinc-100 text-zinc-400"
                : "bg-zinc-900 text-white hover:bg-zinc-800",
            )}
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </header>

      {/* ── main ── */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT — circles centered at start, move up + transcript appears on Run */}
        <div className="flex flex-1 flex-col bg-gradient-to-br from-zinc-50 to-white overflow-hidden">
          {/* circles — centered when idle, move up when running */}
          <div
            className={cn(
              "flex items-center justify-center gap-24 transition-all duration-700 ease-out",
              idle ? "flex-1" : "shrink-0 pt-8 pb-6",
            )}
          >
            <AgentCircle label="Customer AI" color="coral" active={speaking === "customer"} idle={idle} />
            <AgentCircle label="Company AI" color="teal" active={speaking === "company"} idle={idle} />
          </div>

          {/* transcript — hidden when idle, slides in when running */}
          <div
            className={cn(
              "overflow-y-auto border-t border-zinc-100 transition-all duration-500 ease-out",
              idle
                ? "max-h-0 min-h-0 opacity-0 overflow-hidden"
                : "flex-1 min-h-0 opacity-100",
            )}
          >
            <div className="px-6 py-4">
              <div className="mx-auto max-w-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-zinc-700">Conversation Transcript</h3>
                {transcript.length > 0 && (
                  <span className="text-[11px] text-zinc-400">{transcript.length} messages</span>
                )}
              </div>
              
              {transcript.length === 0 && (
                <p className="text-center text-sm text-zinc-300 py-8">
                  Press <span className="font-medium text-zinc-500">Run</span> to start the conversation
                </p>
              )}

              <div className="flex flex-col gap-3">
                {transcript.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.actor === "customer" ? "justify-start" : "justify-end",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                        msg.actor === "customer"
                          ? "bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200"
                          : "bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200",
                      )}
                    >
                      <div
                        className={cn(
                          "mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider",
                          msg.actor === "customer" ? "text-orange-700" : "text-blue-700",
                        )}
                      >
                        <span>{msg.actor === "customer" ? "Customer AI" : "Company AI"}</span>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-400 font-normal normal-case">{msg.ts}</span>
                      </div>
                      <p
                        className={cn(
                          "text-[13px] leading-relaxed",
                          msg.actor === "customer" ? "text-orange-900" : "text-blue-900",
                        )}
                      >
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* RIGHT — live feed */}
        <div className="flex w-[380px] shrink-0 flex-col border-l border-zinc-100">
          {/* header */}
          <div className="border-b border-zinc-100 px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold text-zinc-700">Test Feedback</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {backendState 
                    ? `${backendState.events} events • ${backendState.status}`
                    : "Evaluating Company AI responses"}
                </div>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-zinc-600">
                {score}/100
              </span>
            </div>
          </div>

          {/* feed list */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {feed.length === 0 && (
              <p className="text-center text-[12px] text-zinc-300">Press Run to start evaluation</p>
            )}
            <div className="flex flex-col gap-2.5">
              {feed.map((e) => (
                <div
                  key={e.id}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-[12px]",
                    e.severity === "success" && "border-emerald-200 bg-emerald-50",
                    e.severity === "warning" && "border-amber-200 bg-amber-50",
                    e.severity === "danger" && "border-red-200 bg-red-50",
                    e.severity === "info" && "border-blue-200 bg-blue-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "font-semibold leading-tight",
                        e.severity === "success" && "text-emerald-700",
                        e.severity === "warning" && "text-amber-700",
                        e.severity === "danger" && "text-red-700",
                        e.severity === "info" && "text-blue-700",
                      )}
                    >
                      {e.title}
                    </span>
                    {typeof e.deltaScore === "number" && e.deltaScore !== 0 && (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                          e.deltaScore > 0
                            ? "bg-emerald-200 text-emerald-800"
                            : "bg-red-200 text-red-800",
                        )}
                      >
                        {e.deltaScore > 0 ? `+${e.deltaScore}` : e.deltaScore}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-zinc-600 leading-relaxed">{e.detail}</p>
                  <div className="mt-2 flex items-center justify-between">
                    {e.rule && (
                      <span className="rounded-md bg-white/60 px-2 py-0.5 text-[10px] font-medium text-zinc-500 border border-zinc-200">
                        {e.rule}
                      </span>
                    )}
                    <span className="text-[10px] tabular-nums text-zinc-400 ml-auto">{e.ts}</span>
                  </div>
                </div>
              ))}
              <div ref={feedEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function now() {
  return new Date().toLocaleTimeString()
}

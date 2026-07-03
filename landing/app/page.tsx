"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import PetSprite from "../components/PetSprite";

const GITHUB = "https://github.com/ahfoysal/claude-code-pet";

const ROSTER = [
  { id: "clawd", name: "Clawd", vibe: "The original companion" },
  { id: "quacks", name: "Quacks", vibe: "Calm workspace days" },
  { id: "embyr", name: "Embyr", vibe: "Fast iteration energy" },
  { id: "owlbert", name: "Owlbert", vibe: "Sharp-eyed polish" },
  { id: "boulder", name: "Boulder", vibe: "Steady on big diffs" },
  { id: "sprout", name: "Sprout", vibe: "Fresh ideas" },
  { id: "stax", name: "Stax", vibe: "Deep-work focus" },
  { id: "oops", name: "Oops", vibe: "Crash-screen charm" },
  { id: "voidling", name: "Voidling", vibe: "Signal from the void" },
];

const STATES = [
  { state: "work", label: "Running", sub: "types on its laptop while Claude works", dot: "#4cc38a" },
  { state: "notification", label: "Needs you", sub: "alerts when Claude asks for input", dot: "#f5a524" },
  { state: "taskDone", label: "Ready for review", sub: "celebrates when a turn finishes", dot: "#6e9bf5" },
  { state: "stop", label: "Idle", sub: "naps quietly between tasks", dot: "#8a8f9d" },
];

const FEATURES = [
  { icon: "🪟", title: "Floats over everything", body: "Always on top — every Space, every fullscreen app, no Dock clutter." },
  { icon: "⚡", title: "Real-time, real source", body: "Driven by Claude Code hooks & transcripts. Never fake timers." },
  { icon: "💬", title: "Live status bubble", body: "Chat name, Claude's latest reply, and the exact tool running." },
  { icon: "🔔", title: "Needs-input alerts", body: "A red ! and a chime the moment Claude waits for you." },
  { icon: "🗂️", title: "Every session at a glance", body: "A badge counts active chats; a panel lists each one." },
  { icon: "🚀", title: "Opens with Claude", body: "Auto-launches when you start a Claude Code session." },
  { icon: "🎨", title: "9 pets + your own", body: "Swap creatures, or install any pet from a link." },
  { icon: "🔒", title: "Local & open source", body: "Events stay on 127.0.0.1. MIT licensed, fully auditable." },
];

export default function Page() {
  return (
    <main className="relative min-h-screen">
      <Backdrop />
      <Nav />
      <Hero />
      <StatesSection />
      <RosterSection />
      <FeaturesSection />
      <InstallSection />
      <LaunchCTA />
      <Footer />
    </main>
  );
}

/* ── Backdrop ─────────────────────────────────────────── */
function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="mesh absolute inset-0 animate-shimmer" />
      <div className="grain absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/40 to-ink" />
      {/* drifting background pets */}
      <FloatPet pet="embyr" style={{ top: "18%", left: "8%" }} size={64} delay={0} />
      <FloatPet pet="quacks" style={{ top: "62%", left: "4%" }} size={52} delay={2} />
      <FloatPet pet="owlbert" style={{ top: "30%", right: "7%" }} size={60} delay={1} />
      <FloatPet pet="sprout" style={{ top: "72%", right: "10%" }} size={48} delay={3} />
    </div>
  );
}

function FloatPet({ pet, style, size, delay }: { pet: string; style: React.CSSProperties; size: number; delay: number }) {
  return (
    <div className="absolute animate-drift opacity-30 blur-[0.5px]" style={{ ...style, animationDelay: `${delay}s` }}>
      <PetSprite pet={pet} state="idle" size={size} />
    </div>
  );
}

/* ── Nav ──────────────────────────────────────────────── */
function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full">
      <div className="glass mx-auto mt-3 flex max-w-5xl items-center justify-between rounded-2xl px-4 py-2.5">
        <a href="#top" className="flex items-center gap-2 font-bold tracking-tight">
          <PetSprite pet="clawd" state="idle" size={30} />
          <span>Claude Code Pet</span>
        </a>
        <div className="hidden items-center gap-6 text-sm text-cream/70 sm:flex">
          <a href="#states" className="hover:text-cream">How it works</a>
          <a href="#pets" className="hover:text-cream">Pets</a>
          <a href="#install" className="hover:text-cream">Install</a>
        </div>
        <a
          href={GITHUB}
          target="_blank"
          className="rounded-full bg-cream px-4 py-1.5 text-sm font-semibold text-ink transition hover:opacity-90"
        >
          ★ GitHub
        </a>
      </div>
    </nav>
  );
}

/* ── Hero ─────────────────────────────────────────────── */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <section id="top" ref={ref} className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pt-36 pb-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass mb-6 rounded-full px-4 py-1.5 text-xs font-medium text-cream/80"
      >
        🐾 A desk companion for Claude Code · macOS &amp; Windows
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl"
      >
        Your code has a <span className="text-gradient">pet</span> now.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="mt-6 max-w-xl text-lg text-cream/70"
      >
        A pixel creature that lives on your desktop and reacts to Claude Code in
        real time — showing what it&apos;s doing, and tapping you when it needs a hand.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="mt-9 flex flex-wrap items-center justify-center gap-3"
      >
        <a href="#install" className="group rounded-full bg-ember px-6 py-3 font-semibold text-ink shadow-lg shadow-ember/30 transition hover:brightness-110">
          Get the pet →
        </a>
        <a href={GITHUB} target="_blank" className="glass rounded-full px-6 py-3 font-semibold text-cream transition hover:bg-white/10">
          ★ Star on GitHub
        </a>
      </motion.div>

      {/* Live hero stage */}
      <motion.div
        style={{ y }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative mt-16 flex w-full flex-col items-center"
      >
        <LiveBubble />
        <div className="mt-2 animate-floaty">
          <PetSprite pet="clawd" state="work" size={168} />
        </div>
        <div className="mx-auto -mt-3 h-3 w-28 rounded-full bg-black/40 blur-md" />
      </motion.div>
    </section>
  );
}

/* Types through realistic statuses like the real pet */
function LiveBubble() {
  const lines = [
    { project: "distill-saas", detail: "Running · npm run test", dot: "#4cc38a", spin: true },
    { project: "portfolio", detail: "Editing · App.tsx", dot: "#4cc38a", spin: true },
    { project: "claude-code-pet", detail: "Needs your input · permission to run Bash", dot: "#f5a524", spin: false },
    { project: "artistly", detail: "Ready for review — all tests pass", dot: "#6e9bf5", spin: false },
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % lines.length), 2600);
    return () => clearInterval(id);
  }, [lines.length]);
  const l = lines[i];
  return (
    <motion.div
      key={i}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-[300px] rounded-2xl bg-white px-4 py-3 text-left text-ink shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold">{l.project}</span>
        {l.spin ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        ) : (
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: l.dot }} />
        )}
      </div>
      <div className="mt-1 truncate text-[12.5px] text-gray-500">{l.detail}</div>
    </motion.div>
  );
}

/* ── Reveal helper ────────────────────────────────────── */
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-ember">{eyebrow}</div>
      <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-cream/60">{sub}</p>}
    </Reveal>
  );
}

/* ── States ───────────────────────────────────────────── */
function StatesSection() {
  return (
    <section id="states" className="mx-auto max-w-5xl px-6 py-24">
      <SectionHead
        eyebrow="Real-time"
        title="It shows you what Claude is doing"
        sub="Every state maps to a real Claude Code event — no guessing, no fake activity."
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATES.map((s, idx) => (
          <Reveal key={s.state} delay={idx * 0.08}>
            <div className="card-glow glass flex h-full flex-col items-center rounded-2xl p-6 text-center">
              <div className="flex h-24 items-end">
                <PetSprite pet="clawd" state={s.state} size={92} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                <span className="font-semibold">{s.label}</span>
              </div>
              <p className="mt-1 text-sm text-cream/55">{s.sub}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Roster ───────────────────────────────────────────── */
function RosterSection() {
  return (
    <section id="pets" className="mx-auto max-w-5xl px-6 py-24">
      <SectionHead eyebrow="Nine to choose from" title="Pick your pixel sidekick" sub="All original art, animated per state. Or hatch your own from any image." />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {ROSTER.map((p, idx) => (
          <Reveal key={p.id} delay={(idx % 3) * 0.06}>
            <div className="card-glow glass group flex items-center gap-4 rounded-2xl p-4">
              <div className="grid h-16 w-16 shrink-0 place-items-end justify-center">
                <PetSprite pet={p.id} state="idle" size={58} className="transition-transform group-hover:scale-110" />
              </div>
              <div>
                <div className="font-bold">{p.name}</div>
                <div className="text-sm text-cream/55">{p.vibe}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Features ─────────────────────────────────────────── */
function FeaturesSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <SectionHead eyebrow="Everything it does" title="Small pet. Serious features." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, idx) => (
          <Reveal key={f.title} delay={(idx % 4) * 0.06}>
            <div className="card-glow glass h-full rounded-2xl p-5">
              <div className="text-2xl">{f.icon}</div>
              <div className="mt-3 font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-cream/55">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Install ──────────────────────────────────────────── */
function InstallSection() {
  const [os, setOs] = useState<"mac" | "win">("mac");
  useEffect(() => {
    if (typeof navigator !== "undefined" && /Win/.test(navigator.platform)) setOs("win");
  }, []);

  const mac = [
    "git clone https://github.com/ahfoysal/claude-code-pet.git",
    "cd claude-code-pet && npm install && npm run build",
    "./install.sh",
    "~/.claude-code-pet/claude-code-pet install-claude-hooks",
  ];
  const win = [
    "git clone https://github.com/ahfoysal/claude-code-pet.git",
    "cd claude-code-pet; npm install; npm run build",
    ".\\install.ps1",
    "claude-code-pet.exe install-claude-hooks",
  ];
  const cmds = os === "mac" ? mac : win;

  return (
    <section id="install" className="mx-auto max-w-3xl px-6 py-24">
      <SectionHead eyebrow="Two minutes" title="Bring it home" sub="Requires Rust, Node 18+, and Claude Code. Free forever." />
      <Reveal>
        <div className="glass overflow-hidden rounded-2xl">
          <div className="flex border-b border-white/10">
            {(["mac", "win"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setOs(k)}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                  os === k ? "bg-white/10 text-cream" : "text-cream/50 hover:text-cream"
                }`}
              >
                {k === "mac" ? "🍎 macOS" : "🪟 Windows"}
              </button>
            ))}
          </div>
          <div className="space-y-1 p-5 font-mono text-[13px] leading-relaxed">
            {cmds.map((c, i) => (
              <div key={i} className="flex gap-3">
                <span className="select-none text-ember/70">$</span>
                <span className="text-cream/90">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-cream/50">
          Then launch it — it re-opens automatically whenever you start a Claude Code session.
        </p>
      </Reveal>
    </section>
  );
}

/* ── Product Hunt CTA ─────────────────────────────────── */
function LaunchCTA() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <Reveal>
        <div className="card-glow glass relative overflow-hidden rounded-3xl px-8 py-14 text-center">
          <div className="mb-6 flex justify-center gap-3">
            {["quacks", "embyr", "clawd", "owlbert", "sprout"].map((p) => (
              <div key={p} className="animate-floaty" style={{ animationDelay: `${Math.random()}s` }}>
                <PetSprite pet={p} state="taskDone" size={54} />
              </div>
            ))}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Adopt your pet today</h2>
          <p className="mx-auto mt-3 max-w-md text-cream/60">
            Free, open source, and endlessly hackable. Give your Claude Code sessions a little life.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#install" className="rounded-full bg-ember px-6 py-3 font-semibold text-ink shadow-lg shadow-ember/30 transition hover:brightness-110">
              Get started
            </a>
            <a href={GITHUB} target="_blank" className="glass rounded-full px-6 py-3 font-semibold text-cream transition hover:bg-white/10">
              View source
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-cream/50 sm:flex-row">
        <div className="flex items-center gap-2">
          <PetSprite pet="clawd" state="idle" size={24} />
          <span>Claude Code Pet</span>
        </div>
        <div className="flex items-center gap-6">
          <a href={GITHUB} target="_blank" className="hover:text-cream">GitHub</a>
          <a href={`${GITHUB}/blob/main/LICENSE`} target="_blank" className="hover:text-cream">MIT License</a>
          <span>© {new Date().getFullYear()} ahfoysal</span>
        </div>
      </div>
    </footer>
  );
}

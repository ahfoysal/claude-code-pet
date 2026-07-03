"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import PetSprite from "../components/PetSprite";
import { AppleMark, WindowsMark, GithubMark } from "../components/Logos";

const GITHUB = "https://github.com/ahfoysal/claude-code-pet";

const ROSTER = [
  { id: "clawd", name: "CLAWD", vibe: "The original" },
  { id: "quacks", name: "QUACKS", vibe: "Calm days" },
  { id: "embyr", name: "EMBYR", vibe: "Fast iteration" },
  { id: "owlbert", name: "OWLBERT", vibe: "Sharp eyes" },
  { id: "boulder", name: "BOULDER", vibe: "Big diffs" },
  { id: "sprout", name: "SPROUT", vibe: "Fresh ideas" },
  { id: "stax", name: "STAX", vibe: "Deep work" },
  { id: "oops", name: "OOPS", vibe: "Crash charm" },
  { id: "voidling", name: "VOIDLING", vibe: "The void" },
];

const STATES = [
  { state: "work", label: "RUNNING", sub: "types while Claude works", color: "#8be04a" },
  { state: "notification", label: "NEEDS YOU", sub: "alerts for your input", color: "#ffd23f" },
  { state: "taskDone", label: "REVIEW", sub: "done — take a look", color: "#2de2e6" },
  { state: "stop", label: "IDLE", sub: "naps between tasks", color: "#a58fd0" },
];

const FEATURES = [
  ["ALWAYS ON TOP", "Floats over every window, Space, and fullscreen app."],
  ["REAL EVENTS", "Driven by Claude Code hooks & transcripts. No fake timers."],
  ["LIVE BUBBLE", "Chat name, Claude's latest reply, and the tool running now."],
  ["INPUT ALERTS", "A red ! and a chime the moment Claude waits for you."],
  ["ALL SESSIONS", "A badge counts active chats; a panel lists each one."],
  ["OPENS W/ CLAUDE", "Auto-launches when you start a Claude Code session."],
  ["9 PETS + YOURS", "Swap creatures or install any pet from a link."],
  ["OPEN SOURCE", "Local-only. MIT licensed. Fully auditable."],
];

export default function Page() {
  return (
    <main className="scanlines relative min-h-screen overflow-hidden">
      <div className="arcade-bg pointer-events-none fixed inset-0 -z-10" />
      <div className="grid-floor pointer-events-none fixed -z-10" />
      <Nav />
      <Hero />
      <HopBand />
      <StatesSection />
      <RosterSection />
      <FeaturesSection />
      <InstallSection />
      <CTASection />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full px-3 pt-3">
      <div className="panel mx-auto flex max-w-5xl items-center justify-between rounded-none px-4 py-2.5">
        <a href="#top" className="flex items-center gap-2">
          <PetSprite pet="clawd" state="idle" size={28} />
          <span className="pixel-font text-[11px] text-cream">CLAUDE CODE PET</span>
        </a>
        <div className="hidden items-center gap-6 text-xl text-cream/70 sm:flex">
          <a href="#states" className="hover:text-pink">how it works</a>
          <a href="#pets" className="hover:text-cyan">pets</a>
          <a href="#install" className="hover:text-gold">install</a>
        </div>
        <a href={GITHUB} target="_blank" className="btn-arcade rounded-none bg-cream text-night">
          <GithubMark size={16} /> STAR
        </a>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section id="top" className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pt-36 pb-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pixel-font mb-8 text-[10px] text-gold"
      >
        <span className="animate-blink">▸</span> INSERT COIN · MACOS &amp; WINDOWS
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
        className="pixel-font text-3xl leading-[1.5] sm:text-5xl"
      >
        <span className="neon">CLAUDE</span> <span className="neon-cyan">CODE</span>
        <br />
        <span className="neon-gold">PET</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mt-8 max-w-md text-2xl leading-snug text-cream/80"
      >
        A pixel creature that lives on your desktop and reacts to Claude Code in
        real time — showing what it&apos;s doing, and tapping you when it needs a hand.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <a href="#install" className="btn-arcade rounded-none bg-pink text-white">▶ GET THE PET</a>
        <a href={GITHUB} target="_blank" className="btn-arcade rounded-none bg-cyan text-night">
          <GithubMark size={16} /> STAR ON GITHUB
        </a>
      </motion.div>

      {/* Pet on a glowing platform */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="relative mt-16 flex flex-col items-center"
      >
        <div className="bubble-card mb-5 w-[300px] px-4 py-3 text-left text-night">
          <LiveLine />
        </div>
        <div className="animate-floaty">
          <PetSprite pet="clawd" state="work" size={150} />
        </div>
        <div className="mt-1 h-3 w-40 rounded-full bg-pink/40 blur-md" />
        <div className="mt-3 h-2 w-52 bg-gradient-to-r from-transparent via-cyan/60 to-transparent" />
      </motion.div>
    </section>
  );
}

function LiveLine() {
  const lines = [
    { p: "distill-saas", d: "Running · npm run test", spin: true, c: "#8be04a" },
    { p: "portfolio", d: "Editing · App.tsx", spin: true, c: "#8be04a" },
    { p: "claude-code-pet", d: "Needs your input · permission", spin: false, c: "#ffd23f" },
    { p: "artistly", d: "Ready for review — tests pass", spin: false, c: "#2de2e6" },
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % lines.length), 2400);
    return () => clearInterval(id);
  }, [lines.length]);
  const l = lines[i];
  return (
    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <span className="font-sans text-[15px] font-bold">{l.p}</span>
        {l.spin ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        ) : (
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: l.c }} />
        )}
      </div>
      <div className="mt-0.5 font-sans text-[12px] text-gray-500">{l.d}</div>
    </motion.div>
  );
}

/* Hopping pets marquee band */
function HopBand() {
  const pets = ["quacks", "embyr", "owlbert", "boulder", "sprout", "stax", "oops", "voidling", "clawd"];
  const row = [...pets, ...pets];
  return (
    <div className="relative my-6 overflow-hidden border-y-[3px] border-night/60 bg-night/40 py-4">
      <div className="flex w-max animate-marquee gap-10">
        {row.map((p, i) => (
          <div key={i} className="animate-floaty" style={{ animationDelay: `${(i % 5) * 0.2}s` }}>
            <PetSprite pet={p} state="idle" size={46} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Head({ tag, title, tagColor = "text-pink" }: { tag: string; title: string; tagColor?: string }) {
  return (
    <Reveal className="mb-12 text-center">
      <div className={`pixel-font mb-4 text-[10px] ${tagColor}`}>{tag}</div>
      <h2 className="pixel-font text-xl leading-relaxed text-cream sm:text-2xl">{title}</h2>
    </Reveal>
  );
}

function StatesSection() {
  return (
    <section id="states" className="mx-auto max-w-5xl px-6 py-20">
      <Head tag="▚ REAL-TIME" title="IT SHOWS WHAT CLAUDE IS DOING" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATES.map((s, i) => (
          <Reveal key={s.state} delay={i * 0.08}>
            <div className="panel flex h-full flex-col items-center rounded-none p-5 text-center">
              <div className="flex h-24 items-end">
                <PetSprite pet="clawd" state={s.state} size={88} />
              </div>
              <div className="pixel-font mt-4 text-[10px]" style={{ color: s.color }}>{s.label}</div>
              <p className="mt-2 text-lg leading-tight text-cream/55">{s.sub}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* Character-select — the arcade centerpiece */
function RosterSection() {
  const [sel, setSel] = useState(0);
  const p = ROSTER[sel];
  return (
    <section id="pets" className="mx-auto max-w-5xl px-6 py-20">
      <Head tag="▚ NINE FIGHTERS" title="SELECT YOUR PET" tagColor="text-cyan" />
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* grid */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
          {ROSTER.map((r, i) => (
            <button
              key={r.id}
              onMouseEnter={() => setSel(i)}
              onClick={() => setSel(i)}
              className={`panel flex flex-col items-center rounded-none p-3 transition ${
                sel === i ? "panel-pink -translate-y-1" : "hover:-translate-y-0.5"
              }`}
            >
              <div className="flex h-14 items-end">
                <PetSprite pet={r.id} state={sel === i ? "work" : "idle"} size={48} />
              </div>
              <span className="pixel-font mt-2 text-[7px] text-cream/80">{r.name}</span>
            </button>
          ))}
        </div>
        {/* selected card */}
        <div className="panel panel-pink flex flex-col items-center justify-center rounded-none p-8 text-center">
          <div className="animate-floaty">
            <PetSprite pet={p.id} state="taskDone" size={120} />
          </div>
          <div className="pixel-font mt-6 text-sm text-gold">{p.name}</div>
          <p className="mt-3 text-xl text-cream/70">{p.vibe}</p>
          <div className="pixel-font mt-5 animate-blink text-[8px] text-pink">▶ READY</div>
        </div>
      </div>
      <p className="mt-6 text-center text-lg text-cream/50">
        All original art · or hatch your own from any image via a{" "}
        <span className="text-cyan">claude-code-pet://</span> link.
      </p>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Head tag="▚ POWER-UPS" title="SMALL PET. SERIOUS FEATURES." tagColor="text-gold" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([t, b], i) => (
          <Reveal key={t} delay={(i % 4) * 0.06}>
            <div className="panel h-full rounded-none p-5">
              <div className="pixel-font text-[9px] leading-relaxed text-pink">{t}</div>
              <p className="mt-3 text-lg leading-tight text-cream/60">{b}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

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
    <section id="install" className="mx-auto max-w-3xl px-6 py-20">
      <Head tag="▚ TWO MINUTES" title="BRING IT HOME" />
      <Reveal>
        <div className="panel rounded-none">
          <div className="flex border-b-[3px] border-night/60">
            <button
              onClick={() => setOs("mac")}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-lg transition ${
                os === "mac" ? "bg-pink text-white" : "text-cream/50 hover:text-cream"
              }`}
            >
              <AppleMark size={17} /> macOS
            </button>
            <button
              onClick={() => setOs("win")}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-lg transition ${
                os === "win" ? "bg-cyan text-night" : "text-cream/50 hover:text-cream"
              }`}
            >
              <WindowsMark size={16} /> Windows
            </button>
          </div>
          <div className="space-y-1.5 p-5 text-lg">
            {cmds.map((c, i) => (
              <div key={i} className="flex gap-3">
                <span className="select-none text-pink">$</span>
                <span className="text-cream/90">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-5 text-center text-lg text-cream/55">
          Then it re-opens automatically whenever you start a Claude Code session.
        </p>
      </Reveal>
    </section>
  );
}

function CTASection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <Reveal>
        <div className="panel panel-pink rounded-none px-8 py-14 text-center">
          <div className="mb-8 flex justify-center gap-4">
            {["quacks", "embyr", "clawd", "owlbert", "sprout"].map((p, i) => (
              <div key={p} className="animate-floaty" style={{ animationDelay: `${i * 0.15}s` }}>
                <PetSprite pet={p} state="taskDone" size={52} />
              </div>
            ))}
          </div>
          <h2 className="pixel-font text-lg leading-relaxed text-cream sm:text-2xl">
            <span className="neon-gold">PLAYER 1</span> — READY?
          </h2>
          <p className="mx-auto mt-5 max-w-md text-xl text-cream/65">
            Free, open source, and endlessly hackable. Give your Claude Code sessions a little life.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <a href="#install" className="btn-arcade rounded-none bg-gold text-night">▶ GET STARTED</a>
            <a href={GITHUB} target="_blank" className="btn-arcade rounded-none bg-cream text-night">
              <GithubMark size={16} /> SOURCE
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-[3px] border-night/60 px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-lg text-cream/50 sm:flex-row">
        <div className="flex items-center gap-2">
          <PetSprite pet="clawd" state="idle" size={22} />
          <span className="pixel-font text-[8px]">CLAUDE CODE PET</span>
        </div>
        <div className="flex items-center gap-5">
          <a href={GITHUB} target="_blank" className="flex items-center gap-1.5 hover:text-cream">
            <GithubMark size={15} /> GitHub
          </a>
          <a href={`${GITHUB}/blob/main/LICENSE`} target="_blank" className="hover:text-cream">MIT</a>
          <span>© 2026 ahfoysal</span>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { ChevronLeft, House, Share2, Sparkles, Trophy, Volume2, Zap } from "lucide-react";
import { type CSSProperties, type ReactNode, type TouchEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { languageOptions, locales, type LocaleCode } from "../locales";

type Phase = "home" | "fullIntro" | "tournamentGroup" | "groupSelect" | "groupReveal" | "bestThirds" | "matchSelect" | "predictor" | "knockout" | "roundSet" | "championDecision" | "champion" | "builderGroup" | "builderThirds" | "builderBracket";
type Team = { name: string; rating: number; group: string; flag: string; code?: string };
type Group = { id: string; teams: Team[] };
type Standing = Team & { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number };
type Slot = { source: string; team: string };
type Match = { id: number; home: string; away: string; homeSource: string; awaySource: string; hs: number; as: number; winner: string; label: string };
type Flow = "full" | "group" | "singleMatch" | "knockout" | "manual";
type RoundKey = "roundOf32" | "roundOf16" | "quarterfinals" | "semifinals" | "thirdPlaceMatch" | "final";
type RoundSetKey = "roundOf16Set" | "quarterfinalsSet" | "semifinalsSet" | "finalSet";
type HybridStage = "intro" | "probability" | "headToHead" | "meter" | "decision" | "freeze" | "winner" | "engagement";
type LocaleText = (typeof locales)[LocaleCode];
type BuilderPick = { first?: string; second?: string; third?: string };
type ManualMatch = { id: number; home?: string; away?: string; homeSource: string; awaySource: string; winner?: string; label: string; ready: boolean };

const BRACKET_CANVAS_WIDTH = 3000;
const BRACKET_CANVAS_HEIGHT = 1540;

const flagEmoji: Record<string, string> = {
  "Mexico": "🇲🇽", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Czechia": "🇨🇿",
  "Canada": "🇨🇦", "Bosnia and Herzegovina": "🇧🇦", "Qatar": "🇶🇦", "Switzerland": "🇨🇭",
  "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🏴",
  "United States": "🇺🇸", "Paraguay": "🇵🇾", "Türkiye": "🇹🇷", "Australia": "🇦🇺",
  "Germany": "🇩🇪", "Curaçao": "🇨🇼", "Ecuador": "🇪🇨", "Ivory Coast": "🇨🇮",
  "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
  "Belgium": "🇧🇪", "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿",
  "Spain": "🇪🇸", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾", "Cape Verde": "🇨🇻",
  "France": "🇫🇷", "Senegal": "🇸🇳", "Norway": "🇳🇴", "Iraq": "🇮🇶",
  "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
  "Portugal": "🇵🇹", "DR Congo": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
  "England": "🏴", "Ghana": "🇬🇭", "Croatia": "🇭🇷", "Panama": "🇵🇦"
};

const flagCodes: Record<string, string> = {
  "Mexico": "mx", "South Africa": "za", "South Korea": "kr", "Czechia": "cz",
  "Canada": "ca", "Bosnia and Herzegovina": "ba", "Qatar": "qa", "Switzerland": "ch",
  "Brazil": "br", "Morocco": "ma", "Haiti": "ht", "Scotland": "gb-sct",
  "United States": "us", "Paraguay": "py", "Türkiye": "tr", "Australia": "au",
  "Germany": "de", "Curaçao": "cw", "Ecuador": "ec", "Ivory Coast": "ci",
  "Netherlands": "nl", "Japan": "jp", "Sweden": "se", "Tunisia": "tn",
  "Belgium": "be", "Egypt": "eg", "Iran": "ir", "New Zealand": "nz",
  "Spain": "es", "Saudi Arabia": "sa", "Uruguay": "uy", "Cape Verde": "cv",
  "France": "fr", "Senegal": "sn", "Norway": "no", "Iraq": "iq",
  "Argentina": "ar", "Algeria": "dz", "Austria": "at", "Jordan": "jo",
  "Portugal": "pt", "DR Congo": "cd", "Uzbekistan": "uz", "Colombia": "co",
  "England": "gb-eng", "Ghana": "gh", "Croatia": "hr", "Panama": "pa"
};

const groupSeed: Array<[string, Array<[string, number]>]> = [
  ["A", [["Mexico", 82], ["South Africa", 75], ["South Korea", 80], ["Czechia", 79]]],
  ["B", [["Canada", 79], ["Bosnia and Herzegovina", 78], ["Qatar", 76], ["Switzerland", 83]]],
  ["C", [["Brazil", 90], ["Morocco", 84], ["Haiti", 70], ["Scotland", 79]]],
  ["D", [["United States", 81], ["Paraguay", 78], ["Türkiye", 80], ["Australia", 77]]],
  ["E", [["Germany", 87], ["Curaçao", 70], ["Ecuador", 82], ["Ivory Coast", 80]]],
  ["F", [["Netherlands", 88], ["Japan", 83], ["Sweden", 81], ["Tunisia", 77]]],
  ["G", [["Belgium", 86], ["Egypt", 81], ["Iran", 78], ["New Zealand", 72]]],
  ["H", [["Spain", 91], ["Saudi Arabia", 76], ["Uruguay", 86], ["Cape Verde", 72]]],
  ["I", [["France", 91], ["Senegal", 82], ["Norway", 83], ["Iraq", 74]]],
  ["J", [["Argentina", 91], ["Algeria", 80], ["Austria", 82], ["Jordan", 71]]],
  ["K", [["Portugal", 89], ["DR Congo", 76], ["Uzbekistan", 74], ["Colombia", 84]]],
  ["L", [["England", 89], ["Ghana", 78], ["Croatia", 84], ["Panama", 73]]]
];

const groups: Group[] = groupSeed.map(([id, teams]) => ({
  id,
  teams: teams.map(([name, rating]) => ({ name, rating, group: id, flag: flagEmoji[name], code: flagCodes[name] }))
}));

const fixedR32 = [
  [73, "2A", "2B"], [74, "1C", "2F"], [75, "1E", "3ABCDF"], [76, "1F", "2C"],
  [77, "2E", "2I"], [78, "1I", "3CDFGH"], [79, "1A", "3CEFHI"], [80, "1L", "3EHIJK"],
  [81, "1D", "3BEFIJ"], [82, "1G", "3AEHIJ"], [83, "2K", "2L"], [84, "1H", "2J"],
  [85, "1B", "3EFGIJ"], [86, "1J", "2H"], [87, "1K", "3DEIJL"], [88, "2D", "2G"]
] as const;

const nextRounds = [
  [89, 73, 75], [90, 74, 77], [91, 76, 78], [92, 79, 80],
  [93, 83, 84], [94, 81, 82], [95, 86, 88], [96, 85, 87],
  [97, 89, 90], [98, 93, 94], [99, 91, 92], [100, 95, 96],
  [101, 97, 98], [102, 99, 100], [103, 101, 102], [104, 101, 102]
] as const;

const groupFixtures = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
const bracketLayout = {
  left: [[73, 75, 74, 77, 83, 84, 81, 82], [89, 90, 93, 94], [97, 98], [101]],
  right: [[76, 78, 79, 80, 86, 88, 85, 87], [91, 92, 95, 96], [99, 100], [102]]
} as const;
const mobileBracketStages = [
  { key: "roundOf32", ids: [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88] },
  { key: "roundOf16", ids: [89, 90, 91, 92, 93, 94, 95, 96] },
  { key: "quarterfinals", ids: [97, 98, 99, 100] },
  { key: "semifinals", ids: [101, 102] },
  { key: "final", ids: [104, 103] }
] as const;
const bracketRows = new Map<number, { row: number; span: number }>([
  [73, { row: 1, span: 2 }], [75, { row: 3, span: 2 }], [74, { row: 5, span: 2 }], [77, { row: 7, span: 2 }],
  [83, { row: 9, span: 2 }], [84, { row: 11, span: 2 }], [81, { row: 13, span: 2 }], [82, { row: 15, span: 2 }],
  [89, { row: 2, span: 2 }], [90, { row: 6, span: 2 }], [93, { row: 10, span: 2 }], [94, { row: 14, span: 2 }],
  [97, { row: 4, span: 2 }], [98, { row: 12, span: 2 }], [101, { row: 8, span: 2 }],
  [76, { row: 1, span: 2 }], [78, { row: 3, span: 2 }], [79, { row: 5, span: 2 }], [80, { row: 7, span: 2 }],
  [86, { row: 9, span: 2 }], [88, { row: 11, span: 2 }], [85, { row: 13, span: 2 }], [87, { row: 15, span: 2 }],
  [91, { row: 2, span: 2 }], [92, { row: 6, span: 2 }], [95, { row: 10, span: 2 }], [96, { row: 14, span: 2 }],
  [99, { row: 4, span: 2 }], [100, { row: 12, span: 2 }], [102, { row: 8, span: 2 }]
]);
const stageKeys = ["roundOf32", "roundOf16", "quarterfinals", "semifinals"] as const;

const dependencyByMatch = new Map<number, readonly [number, number]>(nextRounds.map(([id, a, b]) => [id, [a, b] as const]));
const allTeams = groups.flatMap((group) => group.teams);

function rngFrom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function goals(rating: number, opponent: number, rng: () => number) {
  const edge = Math.max(-0.9, Math.min(1.1, (rating - opponent) / 12));
  return Math.max(0, Math.floor(rng() * 3 + rng() * 2 + edge));
}

function decide(home: Team, away: Team, rng: () => number) {
  return { hs: goals(home.rating, away.rating, rng), as: goals(away.rating, home.rating, rng) };
}

function knockout(home: Slot, away: Slot, teams: Map<string, Team>, id: number, rng: () => number): Match {
  const ht = teams.get(home.team)!;
  const at = teams.get(away.team)!;
  let { hs, as } = decide(ht, at, rng);
  if (hs === as) {
    const swing = ht.rating - at.rating + (rng() - 0.5) * 28;
    swing >= 0 ? hs++ : as++;
  }
  return { id, home: home.team, away: away.team, homeSource: home.source, awaySource: away.source, hs, as, winner: hs > as ? home.team : away.team, label: `M${id}` };
}

function loser(match: Match) {
  return match.winner === match.home ? match.away : match.home;
}

function assignThirdPlaceSlots(bestThirds: Standing[]) {
  const thirdGroups = new Set(bestThirds.map((team) => team.group));
  const thirdSlots = fixedR32
    .flatMap(([, home, away]) => [home, away])
    .filter((code) => code.startsWith("3") && code.length > 2)
    .map((code) => ({ code, candidates: code.slice(1).split("").filter((group) => thirdGroups.has(group)) }))
    .sort((a, b) => a.candidates.length - b.candidates.length);
  const teamByGroup = new Map(bestThirds.map((team) => [team.group, team]));
  const assigned = new Map<string, Standing>();
  const used = new Set<string>();

  function place(index: number): boolean {
    if (index === thirdSlots.length) return true;
    const slot = thirdSlots[index];
    const candidates = bestThirds.map((team) => team.group).filter((group) => slot.candidates.includes(group) && !used.has(group));
    for (const group of candidates) {
      const team = teamByGroup.get(group);
      if (!team) continue;
      assigned.set(slot.code, team);
      used.add(group);
      if (place(index + 1)) return true;
      used.delete(group);
      assigned.delete(slot.code);
    }
    return false;
  }

  if (!place(0)) {
    thirdSlots.forEach((slot) => {
      const fallback = bestThirds.find((team) => !used.has(team.group));
      if (fallback) {
        assigned.set(slot.code, fallback);
        used.add(fallback.group);
      }
    });
  }

  return assigned;
}

function simulate(seed: number) {
  const rng = rngFrom(seed);
  const teams = new Map(groups.flatMap((g) => g.teams.map((t) => [t.name, t])));
  const tables = groups.map((group) => {
    const rows = new Map(group.teams.map((t) => [t.name, { ...t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 } as Standing]));
    groupFixtures.forEach(([h, a]) => {
      const home = group.teams[h];
      const away = group.teams[a];
      const { hs, as } = decide(home, away, rng);
      const hr = rows.get(home.name)!;
      const ar = rows.get(away.name)!;
      hr.played++; ar.played++; hr.gf += hs; hr.ga += as; ar.gf += as; ar.ga += hs;
      if (hs > as) { hr.won++; ar.lost++; hr.points += 3; }
      else if (as > hs) { ar.won++; hr.lost++; ar.points += 3; }
      else { hr.drawn++; ar.drawn++; hr.points++; ar.points++; }
      hr.gd = hr.gf - hr.ga; ar.gd = ar.gf - ar.ga;
    });
    const standings = [...rows.values()].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.rating - a.rating);
    return { group: group.id, standings };
  });

  const slots = new Map<string, Slot>();
  tables.forEach(({ group, standings }) => {
    slots.set(`1${group}`, { source: `1${group}`, team: standings[0].name });
    slots.set(`2${group}`, { source: `2${group}`, team: standings[1].name });
    slots.set(`3${group}`, { source: `3${group}`, team: standings[2].name });
  });

  const bestThirds = tables.map((t) => t.standings[2]).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.rating - a.rating).slice(0, 8);
  const thirdAssignments = assignThirdPlaceSlots(bestThirds);
  const resolve = (code: string) => {
    if (code.startsWith("3") && code.length > 2) {
      const picked = thirdAssignments.get(code)!;
      return { source: `3${picked.group}`, team: picked.name };
    }
    return slots.get(code)!;
  };

  const matches = new Map<number, Match>();
  fixedR32.forEach(([id, a, b]) => matches.set(id, knockout(resolve(a), resolve(b), teams, id, rng)));
  nextRounds.forEach(([id, a, b]) => {
    const isThirdPlace = id === 103;
    const ma = matches.get(a)!;
    const mb = matches.get(b)!;
    const home = { source: `${isThirdPlace ? "L" : "W"}${a}`, team: isThirdPlace ? loser(ma) : ma.winner };
    const away = { source: `${isThirdPlace ? "L" : "W"}${b}`, team: isThirdPlace ? loser(mb) : mb.winner };
    matches.set(id, knockout(home, away, teams, id, rng));
  });

  return { tables, bestThirds, matches: [...matches.values()].sort((a, b) => a.id - b.id), champion: matches.get(104)!.winner };
}

function buildGroupPredictionMatches(seed: number) {
  const rng = rngFrom(seed + 2026);
  let id = 1;
  return groups.flatMap((group) => groupFixtures.map(([h, a], fixtureIndex) => {
    const home = group.teams[h];
    const away = group.teams[a];
    let { hs, as } = decide(home, away, rng);
    if (hs === as) {
      const swing = home.rating - away.rating + (rng() - 0.5) * 18;
      swing >= 0 ? hs++ : as++;
    }
    return {
      id: id++,
      home: home.name,
      away: away.name,
      homeSource: `${group.id}${fixtureIndex + 1}`,
      awaySource: `${group.id}${fixtureIndex + 1}`,
      hs,
      as,
      winner: hs > as ? home.name : away.name,
      label: `G${group.id}-${fixtureIndex + 1}`
    };
  }));
}

function teamByName(name?: string) {
  return allTeams.find((item) => item.name === name);
}

function buildManualFirstSlots(picks: Record<string, BuilderPick>) {
  const slots = new Map<string, Slot>();
  groups.forEach((group) => {
    const pick = picks[group.id] || {};
    if (pick.first) slots.set(`1${group.id}`, { source: `1${group.id}`, team: pick.first });
    if (pick.second) slots.set(`2${group.id}`, { source: `2${group.id}`, team: pick.second });
    if (pick.third) slots.set(`3${group.id}`, { source: `3${group.id}`, team: pick.third });
  });
  return slots;
}

function buildManualThirdAssignments(picks: Record<string, BuilderPick>, thirdGroups: string[]) {
  const selected = thirdGroups
    .map((groupId) => {
      const name = picks[groupId]?.third;
      const selectedTeam = teamByName(name);
      if (!selectedTeam) return null;
      return { ...selectedTeam, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 } as Standing;
    })
    .filter((item): item is Standing => Boolean(item));
  return assignThirdPlaceSlots(selected);
}

function buildManualMatches(picks: Record<string, BuilderPick>, thirdGroups: string[], winners: Record<number, string>) {
  const slots = buildManualFirstSlots(picks);
  const thirdAssignments = buildManualThirdAssignments(picks, thirdGroups);
  const manualMatches = new Map<number, ManualMatch>();
  const resolve = (code: string): Slot | undefined => {
    if (code.startsWith("3") && code.length > 2) {
      const picked = thirdAssignments.get(code);
      return picked ? { source: `3${picked.group}`, team: picked.name } : undefined;
    }
    return slots.get(code);
  };

  fixedR32.forEach(([id, a, b]) => {
    const home = resolve(a);
    const away = resolve(b);
    manualMatches.set(id, {
      id,
      home: home?.team,
      away: away?.team,
      homeSource: home?.source || a,
      awaySource: away?.source || b,
      winner: winners[id],
      label: `M${id}`,
      ready: Boolean(home?.team && away?.team)
    });
  });

  nextRounds.forEach(([id, a, b]) => {
    const first = manualMatches.get(a);
    const second = manualMatches.get(b);
    const thirdPlace = id === 103;
    const home = thirdPlace && first?.winner ? (first.winner === first.home ? first.away : first.home) : winners[a];
    const away = thirdPlace && second?.winner ? (second.winner === second.home ? second.away : second.home) : winners[b];
    manualMatches.set(id, {
      id,
      home,
      away,
      homeSource: `${thirdPlace ? "L" : "W"}${a}`,
      awaySource: `${thirdPlace ? "L" : "W"}${b}`,
      winner: winners[id],
      label: `M${id}`,
      ready: Boolean(home && away)
    });
  });

  return manualMatches;
}

function team(name: string) {
  return groups.flatMap((group) => group.teams).find((item) => item.name === name)!;
}

function flag(name: string, size = "normal") {
  const selected = team(name);
  return (
    <span className={`flag ${size}`}>
      {selected.code ? <img src={`https://flagcdn.com/w80/${selected.code}.png`} alt={`${name} flag`} /> : selected.flag}
    </span>
  );
}

function roundKey(matchId: number): RoundKey {
  if (matchId <= 88) return "roundOf32";
  if (matchId <= 96) return "roundOf16";
  if (matchId <= 100) return "quarterfinals";
  if (matchId <= 102) return "semifinals";
  if (matchId === 103) return "thirdPlaceMatch";
  return "final";
}

function nextRoundSetKey(matchId: number): RoundSetKey | "" {
  if (matchId === 88) return "roundOf16Set";
  if (matchId === 96) return "quarterfinalsSet";
  if (matchId === 100) return "semifinalsSet";
  if (matchId === 102) return "finalSet";
  return "";
}

function playTone(frequency: number, duration = 0.12, type: OscillatorType = "sine") {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.frequency.value = frequency;
  osc.type = type;
  gain.gain.setValueAtTime(0.05, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + duration);
}

function playDrumRoll() {
  [0, 140, 280, 420, 560, 700, 840, 980, 1120, 1260, 1500, 1740, 1980, 2220, 2460, 2700, 3060, 3420].forEach((delay, index) => window.setTimeout(() => playTone(82 + index * 10, 0.08, "square"), delay));
}

function playWhoosh() {
  playTone(520, 0.16, "sawtooth");
  window.setTimeout(() => playTone(740, 0.14, "triangle"), 80);
}

function playStadiumAmbience() {
  [0, 1800, 3600, 5400, 7200, 9000, 12200, 15200, 18200, 21200, 24400, 28600, 32600, 35200].forEach((delay, index) => {
    window.setTimeout(() => playTone(95 + (index % 4) * 22, 0.18, index % 2 ? "triangle" : "sawtooth"), delay);
  });
}

function playCrowdExplosion() {
  [0, 80, 160, 240, 340, 460, 620, 820].forEach((delay, index) => {
    window.setTimeout(() => playTone(180 + index * 70, 0.16, index % 2 ? "triangle" : "sawtooth"), delay);
  });
}

function AppHeader({
  t,
  language,
  onLanguageChange,
  onHome
}: {
  t: LocaleText;
  language: LocaleCode;
  onLanguageChange: (language: LocaleCode) => void;
  onHome: () => void;
}) {
  return (
    <header className="app-header">
      <button className="home-button" onClick={onHome} aria-label={t.home}>
        <House size={18} />
        <span>{t.home}</span>
      </button>
      <img className="wc-logo" src="/worldcup-2026-logo.png" alt={t.logoAlt} />
      <div className="language-switcher" aria-label={t.languageLabel}>
        {languageOptions.map((option) => (
          <button type="button" className={language === option.code ? "active" : ""} key={option.code} onClick={() => onLanguageChange(option.code)}>
            <span>{option.flag}</span>
            <b>{option.label}</b>
          </button>
        ))}
      </div>
    </header>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<LocaleCode>("en");
  const [seed, setSeed] = useState(11);
  const [phase, setPhase] = useState<Phase>("home");
  const [flow, setFlow] = useState<Flow>("full");
  const [groupIndex, setGroupIndex] = useState(0);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [groupRevealed, setGroupRevealed] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupMessage, setGroupMessage] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchRevealed, setMatchRevealed] = useState(false);
  const [predictionReady, setPredictionReady] = useState(false);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionMessage, setPredictionMessage] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [hybridStage, setHybridStage] = useState<HybridStage>("intro");
  const [hybridHomeProb, setHybridHomeProb] = useState(50);
  const [hybridCardIndex, setHybridCardIndex] = useState(0);
  const [roundSetMessage, setRoundSetMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [revealedMatchIds, setRevealedMatchIds] = useState<Set<number>>(new Set());
  const [builderGroupIndex, setBuilderGroupIndex] = useState(0);
  const [builderPicks, setBuilderPicks] = useState<Record<string, BuilderPick>>({});
  const [builderThirdGroups, setBuilderThirdGroups] = useState<string[]>([]);
  const [manualWinners, setManualWinners] = useState<Record<number, string>>({});
  const [builderWarning, setBuilderWarning] = useState("");
  const [matchTeamFilter, setMatchTeamFilter] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [bracketZoom, setBracketZoom] = useState(1);
  const [bracketFitScale, setBracketFitScale] = useState(1);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [autoThirdRevealCount, setAutoThirdRevealCount] = useState(0);
  const [autoKnockoutStatus, setAutoKnockoutStatus] = useState<"overview" | "idle" | "loading" | "winner" | "championDecision">("idle");
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchZoomRef = useRef(1);
  const bracketScrollRef = useRef<HTMLDivElement | null>(null);
  const bracketViewportRef = useRef<HTMLDivElement | null>(null);
  const autoTimersRef = useRef<number[]>([]);
  const predictorTimersRef = useRef<number[]>([]);

  const result = useMemo(() => simulate(seed), [seed]);
  const groupPredictionMatches = useMemo(() => buildGroupPredictionMatches(seed), [seed]);
  const popularTeams = ["Morocco", "Argentina", "Brazil", "France", "Spain"];
  const selectedTeamMatches = selectedTeam
    ? groupPredictionMatches.filter((match) => match.home === selectedTeam || match.away === selectedTeam)
    : [];
  const featuredMatchIndex = useMemo(() => {
    const indexedMatches = groupPredictionMatches.map((match, index) => ({ match, index }));
    const selectedPool = selectedTeam
      ? indexedMatches.filter(({ match }) => match.home === selectedTeam || match.away === selectedTeam)
      : [];
    const featuredPool = indexedMatches.filter(({ match }) => popularTeams.includes(match.home) || popularTeams.includes(match.away));
    const pool = selectedPool.length ? selectedPool : featuredPool.length ? featuredPool : indexedMatches;
    return pool[Math.floor(rngFrom(seed + 2026 + selectedTeam.length * 17)() * pool.length)]?.index ?? 0;
  }, [groupPredictionMatches, seed, selectedTeam]);
  const featuredMatch = groupPredictionMatches[featuredMatchIndex];
  const filteredPredictionMatches = useMemo(() => {
    if (matchTeamFilter) {
      return groupPredictionMatches.filter((match) => match.home === matchTeamFilter || match.away === matchTeamFilter);
    }
    if (!selectedTeam) return groupPredictionMatches;
    const selected: Match[] = [];
    const rest: Match[] = [];
    groupPredictionMatches.forEach((match) => {
      (match.home === selectedTeam || match.away === selectedTeam ? selected : rest).push(match);
    });
    return [...selected, ...rest];
  }, [groupPredictionMatches, matchTeamFilter, selectedTeam]);
  const selectedTeamObject = allTeams.find((item) => item.name === selectedTeam);
  const selectedTeamGroupIndex = selectedTeam
    ? groups.findIndex((group) => group.teams.some((item) => item.name === selectedTeam))
    : -1;
  const teamSearchResults = allTeams.filter((item) => item.name.toLowerCase().includes(teamSearch.trim().toLowerCase()));
  const t = locales[language];
  const isRtl = t.dir === "rtl";
  const currentGroupIndex = flow === "group" ? selectedGroupIndex : groupIndex;
  const currentGroup = result.tables[currentGroupIndex];
  const knockoutMatches = result.matches;
  const currentMatch = flow === "singleMatch" ? groupPredictionMatches[matchIndex] : knockoutMatches[matchIndex];
  const champion = result.champion;
  const thirdQualified = new Set(result.bestThirds.map((item) => item.name));
  const matchById = new Map(knockoutMatches.map((match, index) => [match.id, { match, index }]));
  const manualMatches = buildManualMatches(builderPicks, builderThirdGroups, manualWinners);
  const manualChampion = manualWinners[104];
  const displayChampion = flow === "manual" && manualChampion ? manualChampion : champion;

  useEffect(() => {
    const saved = window.localStorage.getItem("worldcup-language") as LocaleCode | null;
    if (saved && saved in locales) setLanguage(saved);
    const savedTeam = window.localStorage.getItem("worldcup-selected-team");
    if (savedTeam && allTeams.some((item) => item.name === savedTeam)) setSelectedTeam(savedTeam);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("worldcup-language", language);
    document.documentElement.lang = t.langCode;
    document.documentElement.dir = t.dir;
  }, [language, t.dir, t.langCode]);

  useEffect(() => {
    if (selectedTeam) {
      window.localStorage.setItem("worldcup-selected-team", selectedTeam);
      return;
    }
    window.localStorage.removeItem("worldcup-selected-team");
  }, [selectedTeam]);

  useEffect(() => {
    pinchZoomRef.current = bracketZoom;
  }, [bracketZoom]);

  useEffect(() => {
    if (phase !== "championDecision") return;
    const timer = window.setTimeout(() => {
      playWhoosh();
      setPhase("champion");
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== "knockout" && phase !== "builderBracket") return;
    setBracketZoom(1);
    window.requestAnimationFrame(() => {
      const viewport = bracketScrollRef.current;
      if (!viewport) return;
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== "knockout" && phase !== "builderBracket") return;

    function updateBracketFit() {
      const viewport = bracketViewportRef.current;
      if (!viewport) return;
      const bounds = viewport.getBoundingClientRect();
      const widthScale = bounds.width / BRACKET_CANVAS_WIDTH;
      const heightScale = bounds.height / BRACKET_CANVAS_HEIGHT;
      setBracketFitScale(Math.min(widthScale, heightScale, 1));
    }

    updateBracketFit();
    window.addEventListener("resize", updateBracketFit);
    return () => window.removeEventListener("resize", updateBracketFit);
  }, [phase]);

  useEffect(() => () => {
    clearAutoTimers();
    clearPredictorTimers();
  }, []);

  useEffect(() => {
    if (flow !== "full" || !autoRunning || autoPaused) return;
    clearAutoTimers();

    if (phase === "tournamentGroup") {
      if (!groupLoading && !groupRevealed) {
        scheduleAutoTimer(() => revealGroup(), 450);
      }
      if (groupRevealed) {
        scheduleAutoTimer(() => {
          if (groupIndex < groups.length - 1) {
            setGroupIndex((current) => current + 1);
            setGroupRevealed(false);
          } else {
            setAutoThirdRevealCount(0);
            setPhase("bestThirds");
          }
        }, 1500);
      }
    }

    if (phase === "bestThirds") {
      if (autoThirdRevealCount < result.bestThirds.length) {
        scheduleAutoTimer(() => {
          playWhoosh();
          setAutoThirdRevealCount((current) => current + 1);
        }, 620);
      } else {
        scheduleAutoTimer(() => {
          setMatchIndex(0);
          setRevealedMatchIds(new Set());
          setAutoKnockoutStatus("overview");
          setPhase("knockout");
        }, 1200);
      }
    }

    if (phase === "knockout") {
      const match = knockoutMatches[matchIndex];
      if (!match) return;
      if (autoKnockoutStatus === "overview") {
        scheduleAutoTimer(() => showBracketOverview(), 150);
        scheduleAutoTimer(() => {
          setRoundSetMessage("");
          setAutoKnockoutStatus("idle");
        }, roundSetMessage ? 2200 : 2600);
      }
      if (autoKnockoutStatus === "idle" && isKnockoutMatchAvailable(match.id)) {
        scheduleAutoTimer(() => {
          focusBracketRound(roundKey(match.id));
          setAutoKnockoutStatus("loading");
          playDrumRoll();
        }, 700);
      }
      if (autoKnockoutStatus === "loading") {
        scheduleAutoTimer(() => {
          if (match.id !== 104) {
            setRevealedMatchIds((previous) => new Set(previous).add(match.id));
          }
          setAutoKnockoutStatus(match.id === 104 ? "championDecision" : "winner");
          playWhoosh();
        }, 4600);
      }
      if (autoKnockoutStatus === "championDecision") {
        scheduleAutoTimer(() => {
          setAutoRunning(false);
          setPhase("champion");
        }, 2200);
      }
      if (autoKnockoutStatus === "winner") {
        scheduleAutoTimer(() => {
          const nextIndex = matchIndex + 1;
          const nextMatch = knockoutMatches[nextIndex];
          const messageKey = nextRoundSetKey(match.id);
          if (messageKey) setRoundSetMessage(t[messageKey]);
          setMatchIndex(nextIndex);
          setAutoKnockoutStatus(nextMatch && roundKey(nextMatch.id) !== roundKey(match.id) ? "overview" : "idle");
        }, 1800);
      }
    }

    return () => clearAutoTimers();
  }, [phase, flow, autoRunning, autoPaused, groupLoading, groupRevealed, groupIndex, autoThirdRevealCount, autoKnockoutStatus, matchIndex, result.bestThirds.length, revealedMatchIds, roundSetMessage, t]);

  function tr(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
  }

  function clearAutoTimers() {
    autoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    autoTimersRef.current = [];
  }

  function scheduleAutoTimer(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    autoTimersRef.current.push(timer);
  }

  function clearPredictorTimers() {
    predictorTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    predictorTimersRef.current = [];
  }

  function schedulePredictorTimer(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    predictorTimersRef.current.push(timer);
  }

  function clampZoom(value: number) {
    return Math.min(1.6, Math.max(0.65, value));
  }

  function zoomBracket(delta: number) {
    setBracketZoom((current) => clampZoom(Number((current + delta).toFixed(2))));
  }

  function resetBracketView() {
    setBracketZoom(1);
    window.requestAnimationFrame(() => {
      const viewport = bracketScrollRef.current;
      if (!viewport) return;
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  }

  function showBracketOverview() {
    setBracketZoom(1);
    window.requestAnimationFrame(() => {
      const viewport = bracketScrollRef.current;
      if (!viewport) return;
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  }

  function focusBracketRound(key: RoundKey) {
    void key;
    setBracketZoom(1);
    window.requestAnimationFrame(() => {
      const viewport = bracketScrollRef.current;
      if (!viewport) return;
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  }

  function touchDistance(touches: React.TouchList) {
    const first = touches[0];
    const second = touches[1];
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  }

  function startBracketTouch(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      pinchDistanceRef.current = touchDistance(event.touches);
      pinchZoomRef.current = bracketZoom;
    }
  }

  function moveBracketTouch(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || !pinchDistanceRef.current) return;
    const ratio = touchDistance(event.touches) / pinchDistanceRef.current;
    setBracketZoom(clampZoom(Number((pinchZoomRef.current * ratio).toFixed(2))));
  }

  function endBracketTouch(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) pinchDistanceRef.current = null;
  }

  function reset(nextSeed = seed + 1) {
    setSeed(nextSeed);
    setPhase("home");
    setFlow("full");
    setGroupIndex(0);
    setSelectedGroupIndex(0);
    setGroupRevealed(false);
    setGroupLoading(false);
    setGroupMessage("");
    setMatchIndex(0);
    setMatchRevealed(false);
    setPredictionReady(false);
    setPredictionLoading(false);
    setPredictionMessage("");
    setCountdown(3);
    setHybridStage("intro");
    setHybridHomeProb(50);
    setHybridCardIndex(0);
    setRoundSetMessage("");
    setCopied(false);
    setRevealedMatchIds(new Set());
    setBuilderGroupIndex(0);
    setBuilderPicks({});
    setBuilderThirdGroups([]);
    setManualWinners({});
    setBuilderWarning("");
    setAutoRunning(false);
    setAutoPaused(false);
    setAutoThirdRevealCount(0);
    setAutoKnockoutStatus("idle");
    clearAutoTimers();
    clearPredictorTimers();
  }

  function openHomeCard(nextFlow: Flow) {
    setFlow(nextFlow);
    setGroupRevealed(false);
    setMatchRevealed(false);
    setPredictionReady(false);
    setPredictionLoading(false);
    setPredictionMessage("");
    setCountdown(3);
    setHybridStage("intro");
    setHybridHomeProb(50);
    setHybridCardIndex(0);
    if (nextFlow !== "singleMatch") setMatchTeamFilter("");
    if (nextFlow === "full") {
      setGroupIndex(0);
      setPhase("fullIntro");
    }
    if (nextFlow === "group") {
      if (selectedTeamGroupIndex >= 0) {
        setSelectedGroupIndex(selectedTeamGroupIndex);
        setPhase("groupReveal");
      } else {
        setPhase("groupSelect");
      }
    }
    if (nextFlow === "singleMatch") setPhase("matchSelect");
    if (nextFlow === "knockout") setPhase("knockout");
    if (nextFlow === "manual") {
      setBuilderGroupIndex(0);
      setBuilderPicks({});
      setBuilderThirdGroups([]);
      setManualWinners({});
      setBuilderWarning("");
      setPhase("builderGroup");
    }
  }

  function openTeamPredictions(team: string) {
    setMatchTeamFilter(team);
    openHomeCard("singleMatch");
  }

  function selectTeam(teamName: string) {
    setSelectedTeam(teamName);
    setMatchTeamFilter(teamName);
    setTeamSearch("");
  }

  function openSelectedTeamGroup() {
    if (selectedTeamGroupIndex >= 0) {
      setFlow("group");
      setSelectedGroupIndex(selectedTeamGroupIndex);
      setGroupRevealed(false);
      setGroupLoading(false);
      setGroupMessage("");
      setPhase("groupReveal");
      return;
    }
    openHomeCard("group");
  }

  function openFeaturedPrediction() {
    setMatchTeamFilter("");
    openPredictor(featuredMatchIndex, "singleMatch");
  }

  function startFullPrediction() {
    clearAutoTimers();
    setFlow("full");
    setGroupIndex(0);
    setSelectedGroupIndex(0);
    setGroupRevealed(false);
    setGroupLoading(false);
    setGroupMessage("");
    setMatchIndex(0);
    setRevealedMatchIds(new Set());
    setAutoThirdRevealCount(0);
    setAutoKnockoutStatus("idle");
    setAutoPaused(false);
    setAutoRunning(true);
    setPhase("tournamentGroup");
  }

  function revealGroup() {
    if (groupLoading || groupRevealed) return;
    setGroupLoading(true);
    playDrumRoll();
    t.groupSuspense.forEach((message, index) => window.setTimeout(() => setGroupMessage(message), index * 760));
    window.setTimeout(() => {
      setGroupLoading(false);
      setGroupRevealed(true);
      setGroupMessage("");
      playWhoosh();
    }, 2500);
  }

  function continueAfterGroup() {
    if (flow === "group") {
      setPhase("groupSelect");
      setGroupRevealed(false);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setGroupRevealed(false);
    } else {
      setPhase("knockout");
    }
  }

  function openPredictor(index: number, nextFlow: Flow) {
    setFlow(nextFlow);
    setMatchIndex(index);
    const selected = nextFlow === "knockout" ? knockoutMatches[index] : groupPredictionMatches[index];
    const alreadyRevealed = nextFlow === "knockout" && selected ? revealedMatchIds.has(selected.id) : false;
    setMatchRevealed(alreadyRevealed);
    setPredictionReady(alreadyRevealed);
    setPredictionLoading(false);
    setPredictionMessage("");
    setCountdown(3);
    setHybridStage("intro");
    setHybridHomeProb(50);
    setHybridCardIndex(0);
    setPhase("predictor");
  }

  function startPrediction() {
    if (predictionLoading || predictionReady) return;
    if (flow === "singleMatch") {
      startHybridPrediction();
      return;
    }
    setPredictionLoading(true);
    setPredictionReady(false);
    playDrumRoll();
    t.predictionSuspense.forEach((message, index) => window.setTimeout(() => {
      setPredictionMessage(message);
      setCountdown(3 - index);
    }, index * 1450));
    window.setTimeout(() => {
      setPredictionLoading(false);
      setPredictionReady(true);
      setPredictionMessage("");
      setCountdown(0);
      playWhoosh();
    }, 4500);
  }

  function startHybridPrediction() {
    clearPredictorTimers();
    setPredictionLoading(true);
    setPredictionReady(false);
    setHybridStage("intro");
    setHybridHomeProb(50);
    setHybridCardIndex(0);
    setCountdown(3);
    playStadiumAmbience();

    const battlePath = currentMatch.winner === currentMatch.home
      ? [50, 52, 49, 55, 61, 57, 63, 58, 62, 54, 60, 56, 64, 59, 66, 61, 68, 63, 70, 65, 72, 68, 74, 70, 76]
      : [50, 48, 51, 45, 39, 43, 37, 42, 38, 46, 40, 44, 36, 41, 34, 39, 32, 37, 30, 35, 28, 32, 26, 30, 24];

    schedulePredictorTimer(() => setHybridStage("probability"), 3000);

    battlePath.slice(0, 8).forEach((probability, index) => {
      schedulePredictorTimer(() => {
        setHybridHomeProb(probability);
        playDrumRoll();
      }, 3000 + index * 1000);
    });

    schedulePredictorTimer(() => setHybridStage("headToHead"), 10000);
    [0, 1, 2, 3].forEach((cardIndex) => {
      schedulePredictorTimer(() => {
        setHybridCardIndex(cardIndex);
        playTone(260 + cardIndex * 70, 0.08, "triangle");
      }, 10000 + cardIndex * 2000);
    });

    schedulePredictorTimer(() => setHybridStage("meter"), 18000);
    battlePath.slice(8, 16).forEach((probability, index) => {
      schedulePredictorTimer(() => {
        setHybridHomeProb(probability);
        playDrumRoll();
      }, 18000 + index * 900);
    });

    schedulePredictorTimer(() => setHybridStage("decision"), 25000);
    [25200, 26000, 26800, 27600, 28400, 29200, 30000, 31000, 32000, 33000, 34000].forEach((delay) => {
      schedulePredictorTimer(() => playTone(86, 0.12, "square"), delay);
    });
    battlePath.slice(16).forEach((probability, index) => {
      schedulePredictorTimer(() => setHybridHomeProb(probability), 25000 + index * 650);
    });

    schedulePredictorTimer(() => setHybridStage("freeze"), 35000);
    schedulePredictorTimer(() => playTone(150, 0.03, "sine"), 36000);
    schedulePredictorTimer(() => {
      setHybridStage("winner");
      playWhoosh();
      playCrowdExplosion();
    }, 40000);
    schedulePredictorTimer(() => setHybridStage("engagement"), 43000);
    schedulePredictorTimer(() => {
      setPredictionLoading(false);
      setPredictionReady(true);
      setCountdown(0);
    }, 45000);
  }

  function returnAfterPrediction() {
    if (flow === "knockout") {
      setRevealedMatchIds((previous) => new Set(previous).add(currentMatch.id));
    }
    setMatchRevealed(true);
    setPredictionReady(false);
    setPredictionLoading(false);
    setPredictionMessage("");
    clearPredictorTimers();
    if (flow === "knockout" && currentMatch.id === 104) {
      setPhase("champion");
    } else {
      setPhase(flow === "singleMatch" ? "matchSelect" : "knockout");
    }
  }

  function nextMatch() {
    const messageKey = nextRoundSetKey(currentMatch.id);
    const message = messageKey ? t[messageKey] : "";
    if (message && flow === "knockout") {
      setRoundSetMessage(message);
      setPhase("roundSet");
      return;
    }
    if (matchIndex < result.matches.length - 1) {
      setMatchIndex(matchIndex + 1);
      setMatchRevealed(false);
      setPredictionReady(false);
      setPhase(flow === "singleMatch" ? "matchSelect" : "knockout");
    } else {
      setPhase("champion");
    }
  }

  function continueRoundSet() {
    setRoundSetMessage("");
    if (matchIndex < result.matches.length - 1) {
      setMatchIndex(matchIndex + 1);
      setMatchRevealed(false);
      setPhase("knockout");
    } else {
      setPhase("champion");
    }
  }

  async function share(text: string) {
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
    else if (navigator.share) await navigator.share({ title: t.appTitle, text });
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function shareResult() {
    const url = typeof window !== "undefined" ? window.location.href : "https://github.com/aissadi/worldcup-simulator";
    share(tr(t.shareResultText, { team: displayChampion, url }));
  }

  function shareWinner() {
    const url = typeof window !== "undefined" ? window.location.href : "https://github.com/aissadi/worldcup-simulator";
    share(tr(t.shareWinnerText, { winner: currentMatch.winner, url }));
  }

  function runAgain() {
    const restartFullPrediction = flow === "full";
    reset(seed + 1);
    if (restartFullPrediction) setPhase("fullIntro");
  }

  function nextAfterWinner() {
    if (flow === "knockout") {
      setRevealedMatchIds((previous) => new Set(previous).add(currentMatch.id));
      setMatchRevealed(true);
      setPredictionReady(false);
      setPredictionLoading(false);
      setPredictionMessage("");
      clearPredictorTimers();
      setPhase(currentMatch.id === 104 ? "championDecision" : "knockout");
      return;
    }
    openPredictor(Math.min(matchIndex + 1, groupPredictionMatches.length - 1), "singleMatch");
  }

  function goHome() {
    clearAutoTimers();
    clearPredictorTimers();
    setAutoRunning(false);
    setAutoPaused(false);
    setPhase("home");
    setPredictionLoading(false);
    setPredictionReady(false);
    setGroupLoading(false);
  }

  function predictAnotherMatch() {
    clearPredictorTimers();
    setPredictionReady(false);
    setPredictionLoading(false);
    setMatchRevealed(false);
    setHybridStage("intro");
    setHybridHomeProb(50);
    setHybridCardIndex(0);
    setCountdown(3);
    setPhase("matchSelect");
  }

  function isKnockoutMatchAvailable(matchId: number) {
    if (matchId <= 88) return true;
    const dependencies = dependencyByMatch.get(matchId);
    return dependencies ? dependencies.every((id) => revealedMatchIds.has(id)) : false;
  }

  function openKnockoutMatch(matchId: number) {
    const item = matchById.get(matchId);
    if (!item || !isKnockoutMatchAvailable(matchId)) return;
    openPredictor(item.index, "knockout");
  }

  function sourceLabel(matchId: number, side: "home" | "away") {
    const item = matchById.get(matchId);
    if (!item) return "";
    const match = item.match;
    if (isKnockoutMatchAvailable(matchId)) return side === "home" ? match.home : match.away;
    return side === "home" ? match.homeSource : match.awaySource;
  }

  function setBuilderPick(groupId: string, place: keyof BuilderPick, name: string) {
    setBuilderPicks((previous) => {
      const nextGroup = { ...(previous[groupId] || {}) };
      const duplicate = Object.entries(nextGroup).some(([key, value]) => key !== place && value === name);
      if (duplicate) {
        setBuilderWarning(t.duplicatePickWarning);
        return previous;
      }
      setBuilderWarning("");
      nextGroup[place] = nextGroup[place] === name ? undefined : name;
      return { ...previous, [groupId]: nextGroup };
    });
  }

  function builderGroupComplete(groupId: string) {
    const pick = builderPicks[groupId];
    return Boolean(pick?.first && pick.second);
  }

  function continueBuilderGroup() {
    if (builderGroupIndex < groups.length - 1) {
      setBuilderGroupIndex(builderGroupIndex + 1);
      setBuilderWarning("");
      return;
    }
    setBuilderWarning("");
    setPhase("builderThirds");
  }

  function toggleBuilderThird(groupId: string) {
    setBuilderThirdGroups((previous) => {
      if (previous.includes(groupId)) return previous.filter((item) => item !== groupId);
      if (previous.length >= 8) return previous;
      return [...previous, groupId];
    });
  }

  function chooseManualWinner(matchId: number, winner: string) {
    const dependentIds = nextRounds.filter(([, a, b]) => a === matchId || b === matchId).map(([id]) => id);
    setManualWinners((previous) => {
      const next = { ...previous, [matchId]: winner };
      function clearDownstream(ids: number[]) {
        ids.forEach((id) => {
          delete next[id];
          const more = nextRounds.filter(([, a, b]) => a === id || b === id).map(([nextId]) => nextId);
          clearDownstream(more);
        });
      }
      clearDownstream(dependentIds);
      return next;
    });
  }

  function ratingMetric(name: string, metric: "attack" | "defense" | "form" | "momentum") {
    const selected = team(name);
    const weights = { attack: 1.04, defense: 0.96, form: 1, momentum: 1.02 };
    const offsets = { attack: 9, defense: 23, form: 37, momentum: 51 };
    const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), offsets[metric]);
    return Math.max(52, Math.min(96, Math.round(selected.rating * weights[metric] + (hash % 13) - 7)));
  }

  function metricRows(match: Match) {
    return (["attack", "defense", "form", "momentum"] as const).map((metric) => ({
      key: metric,
      label: t[metric],
      home: ratingMetric(match.home, metric),
      away: ratingMetric(match.away, metric)
    }));
  }

  function headToHeadCards(match: Match) {
    const homeRating = team(match.home).rating;
    const awayRating = team(match.away).rating;
    const homeHistory = 52 + ((homeRating + match.home.length) % 18);
    const awayHistory = 52 + ((awayRating + match.away.length) % 18);
    return [
      { title: t.worldCupHistory, icon: "🏆", home: homeHistory, away: awayHistory },
      { title: t.attackPower, icon: "⚽", home: ratingMetric(match.home, "attack"), away: ratingMetric(match.away, "attack") },
      { title: t.defensePower, icon: "🛡", home: ratingMetric(match.home, "defense"), away: ratingMetric(match.away, "defense") },
      { title: t.recentForm, icon: "🔥", home: ratingMetric(match.home, "form"), away: ratingMetric(match.away, "form") }
    ];
  }

  function upsetText(match: Match) {
    const winnerRating = team(match.winner).rating;
    const loserName = match.winner === match.home ? match.away : match.home;
    const loserRating = team(loserName).rating;
    return winnerRating < loserRating ? t.upsetHigh : t.expectedResult;
  }

  function BracketCard({ matchId, compact = false }: { matchId: number; compact?: boolean }) {
    const item = matchById.get(matchId);
    if (!item) return null;
    const match = item.match;
    const available = isKnockoutMatchAvailable(matchId);
    const revealed = revealedMatchIds.has(matchId);
    const isFocusActive = flow === "full" && phase === "knockout" && ["loading", "winner", "championDecision"].includes(autoKnockoutStatus);
    const isCurrent = isFocusActive && currentMatch?.id === matchId;
    const homeName = sourceLabel(matchId, "home");
    const awayName = sourceLabel(matchId, "away");
    const followsSelectedTeam = Boolean(selectedTeam && [homeName, awayName, match.winner].includes(selectedTeam));
    const placement = bracketRows.get(matchId);
    return (
      <button
        type="button"
        className={`${compact ? "bracket-card compact" : "bracket-card"} ${revealed ? "revealed" : ""} ${isCurrent ? "current-reveal" : ""} ${followsSelectedTeam ? "team-path" : ""}`}
        style={placement ? { gridRow: `${placement.row} / span ${placement.span}` } : undefined}
        onClick={() => openKnockoutMatch(matchId)}
        disabled={!available}
      >
        <span>{tr(t.matchNumber, { number: String(match.id) })}</span>
        <div className={revealed && match.winner === match.home ? "bracket-team winner" : "bracket-team"}>
          {available ? flag(homeName) : <i />}
          <strong>{homeName}</strong>
        </div>
        <em>{t.versus}</em>
        <div className={revealed && match.winner === match.away ? "bracket-team winner" : "bracket-team"}>
          {available ? flag(awayName) : <i />}
          <strong>{awayName}</strong>
        </div>
        {!available && <small>{t.locked}</small>}
        {revealed && <small>{t.winner}: {match.winner}</small>}
        {revealed && <span className="advance-chip">{flag(match.winner)} {t.advance}</span>}
      </button>
    );
  }

  function BracketBranch({ side }: { side: "left" | "right" }) {
    return (
      <div className={`bracket-branch ${side}`}>
        {bracketLayout[side].map((column, index) => (
          <div className="bracket-stage-column" key={`${side}-${index}`}>
            <h3>{t[stageKeys[index]]}</h3>
            <div className="bracket-column">
              {column.map((matchId) => <BracketCard key={matchId} matchId={matchId} compact={index > 1} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function ManualBracketCard({ matchId, compact = false }: { matchId: number; compact?: boolean }) {
    const match = manualMatches.get(matchId);
    if (!match) return null;
    const placement = bracketRows.get(matchId);
    const winner = match.winner;
    return (
      <div
        className={`${compact ? "bracket-card manual compact" : "bracket-card manual"} ${winner ? "revealed" : ""}`}
        style={placement ? { gridRow: `${placement.row} / span ${placement.span}` } : undefined}
      >
        <span>{tr(t.matchNumber, { number: String(match.id) })}</span>
        {(["home", "away"] as const).map((side) => {
          const name = match[side];
          return (
            <button
              type="button"
              className={winner === name ? "bracket-team winner" : "bracket-team"}
              key={side}
              onClick={() => name && match.ready && chooseManualWinner(match.id, name)}
              disabled={!name || !match.ready}
            >
              {name ? flag(name) : <i />}
              <strong>{name || (side === "home" ? match.homeSource : match.awaySource)}</strong>
            </button>
          );
        })}
        <small>{winner ? `${t.winner}: ${winner}` : match.ready ? t.tapWinner : t.locked}</small>
        {winner && <span className="advance-chip">{flag(winner)} {t.advance}</span>}
      </div>
    );
  }

  function ManualBranch({ side }: { side: "left" | "right" }) {
    return (
      <div className={`bracket-branch ${side}`}>
        {bracketLayout[side].map((column, index) => (
          <div className="bracket-stage-column" key={`manual-${side}-${index}`}>
            <h3>{t[stageKeys[index]]}</h3>
            <div className="bracket-column">
              {column.map((matchId) => <ManualBracketCard key={matchId} matchId={matchId} compact={index > 1} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function MobileKnockoutCard({ matchId }: { matchId: number }) {
    const match = matchById.get(matchId)?.match;
    const available = isKnockoutMatchAvailable(matchId);
    const revealed = revealedMatchIds.has(matchId);
    const isFocusActive = flow === "full" && phase === "knockout" && ["loading", "winner", "championDecision"].includes(autoKnockoutStatus);
    const isCurrent = isFocusActive && currentMatch?.id === matchId;
    const homeName = available && match ? match.home : "";
    const awayName = available && match ? match.away : "";
    const followsSelectedTeam = Boolean(selectedTeam && [homeName, awayName, match?.winner].includes(selectedTeam));

    return (
      <button
        type="button"
        className={`mobile-match-card ${revealed ? "revealed" : ""} ${isCurrent ? "current-reveal" : ""} ${followsSelectedTeam ? "team-path" : ""}`}
        onClick={() => openKnockoutMatch(matchId)}
        disabled={!available}
        aria-label={available ? `${tr(t.matchNumber, { number: String(matchId) })}: ${homeName} ${t.versus} ${awayName}` : `${tr(t.matchNumber, { number: String(matchId) })} ${t.locked}`}
      >
        <span>{`M${matchId}`}</span>
        <div className={`mobile-flag-row ${revealed && match?.winner === homeName ? "winner" : revealed ? "loser" : ""}`}>
          {homeName ? flag(homeName) : <i />}
        </div>
        <div className={`mobile-flag-row ${revealed && match?.winner === awayName ? "winner" : revealed ? "loser" : ""}`}>
          {awayName ? flag(awayName) : <i />}
        </div>
      </button>
    );
  }

  function MobileManualKnockoutCard({ matchId }: { matchId: number }) {
    const match = manualMatches.get(matchId);
    if (!match) return null;

    return (
      <div
        className={`mobile-match-card manual ${match.winner ? "revealed" : ""}`}
        aria-label={`${tr(t.matchNumber, { number: String(matchId) })}: ${match.home || match.homeSource} ${t.versus} ${match.away || match.awaySource}`}
      >
        <span>{`M${matchId}`}</span>
        {(["home", "away"] as const).map((side) => {
          const name = match[side];
          const state = match.winner === name ? "winner" : match.winner ? "loser" : "";
          return (
            <button
              type="button"
              className={`mobile-flag-row ${state}`}
              key={side}
              onClick={() => name && match.ready && chooseManualWinner(matchId, name)}
              disabled={!name || !match.ready}
              aria-label={name ? `${t.winner}: ${name}` : t.locked}
            >
              {name ? flag(name) : <i />}
            </button>
          );
        })}
      </div>
    );
  }

  function MobileKnockoutTree({ manual = false }: { manual?: boolean }) {
    return (
      <div className="mobile-bracket-tree">
        {mobileBracketStages.map((stage) => (
          <section className="mobile-bracket-stage" key={stage.key}>
            <h3>{t[stage.key]}</h3>
            <div className="mobile-stage-grid" style={{ "--match-count": stage.ids.length } as CSSProperties}>
              {stage.ids.map((matchId) => manual ? (
                <MobileManualKnockoutCard key={matchId} matchId={matchId} />
              ) : (
                <MobileKnockoutCard key={matchId} matchId={matchId} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function BracketViewport({ children, mobile }: { children: ReactNode; mobile: ReactNode }) {
    const scale = bracketFitScale * bracketZoom;
    return (
      <div className="bracket-viewport" ref={(node) => { bracketScrollRef.current = node; bracketViewportRef.current = node; }}>
        {mobile}
        <div className="bracket-canvas" style={{ width: `${BRACKET_CANVAS_WIDTH * scale}px`, height: `${BRACKET_CANVAS_HEIGHT * scale}px` }}>
          <div className="bracket-stage" style={{ transform: `scale(${scale})` }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  const groupScreen = (
    <section className="screen">
      <button className="back" onClick={() => flow === "group" ? setPhase("groupSelect") : goHome()}><ChevronLeft size={18} /> {t.back}</button>
      {flow === "full" && autoRunning && (
        <button className="secondary compact-action" onClick={() => setAutoPaused((current) => !current)}>
          {autoPaused ? t.resumePrediction : t.pausePrediction}
        </button>
      )}
      <p className="step">{t.group} {currentGroup.group}</p>
      <h2>{t.group} {currentGroup.group}</h2>
      {!groupRevealed ? (
        <div className="team-list">
          {groups[currentGroupIndex].teams.map((item) => (
            <div className={selectedTeam === item.name ? "team-row selected-team-row" : "team-row"} key={item.name}>
              {flag(item.name)}<strong>{item.name}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="standings">
          {currentGroup.standings.map((item, index) => {
            const third = index === 2 && thirdQualified.has(item.name);
            const label = index === 0 ? t.firstQualified : index === 1 ? t.secondQualified : third ? t.thirdQualified : t.eliminated;
            return (
              <article className={`${index < 2 ? "standing-card qualified" : third ? "standing-card third" : "standing-card out"} ${selectedTeam === item.name ? "selected-team-row" : ""}`} key={item.name} style={{ animationDelay: `${index * 190}ms` }}>
                <span className="place">{index + 1}</span>
                {flag(item.name)}
                <div><strong>{item.name}</strong><em>{label}</em></div>
                <b>{item.points} {t.pointsShort}</b>
              </article>
            );
          })}
        </div>
      )}
      {groupLoading && <div className="loading-card"><Volume2 size={20} /><strong>{groupMessage}</strong><i /></div>}
      {flow === "full" ? (
        <p className="auto-status">{autoPaused ? t.paused : groupLoading ? t.revealing : groupRevealed ? t.autoAdvancing : t.runningPrediction}</p>
      ) : !groupRevealed ? <button className="primary" disabled={groupLoading} onClick={revealGroup}>{groupLoading ? t.revealing : t.revealGroup}</button> : <button className="primary" onClick={continueAfterGroup}>{t.backToGroups}</button>}
    </section>
  );

  return (
    <main className={isRtl ? "app rtl" : "app"} dir={t.dir}>
      <AppHeader t={t} language={language} onLanguageChange={setLanguage} onHome={goHome} />
      {phase === "champion" && <div className="confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>}

      {phase === "home" && (
        <section className="screen landing">
          <div className="landing-atmosphere" aria-hidden="true"><i /><i /><i /></div>
          <div className="landing-trophy">
            <img className="landing-logo" src="/worldcup-2026-logo.png" alt={t.logoAlt} />
            <Trophy size={68} />
          </div>
          <h1><span>{t.homeTitleLine1}</span><span>{t.homeTitleLine2}</span><span>{t.homeTitleLine3}</span></h1>
          <p className="subtitle">{t.homeSubtitle}</p>
          <button className="quick-predict" onClick={startFullPrediction}>
            <Sparkles size={22} />
            <span>{t.quickPredict}</span>
          </button>
          <div className="home-grid">
            <button className="home-card" onClick={() => openHomeCard("full")}><span>🌎</span><b>{t.fullTournamentCardTitle}</b><em>{t.fullTournamentCardText}</em></button>
            <button className="home-card" onClick={() => openHomeCard("group")}><span>🏟</span><b>{t.groupsCardTitle}</b><em>{t.groupsCardText}</em></button>
            <button className="home-card" onClick={() => { setMatchTeamFilter(""); openHomeCard("singleMatch"); }}><span>⚽</span><b>{t.oneMatchCardTitle}</b><em>{t.oneMatchCardText}</em></button>
            <button className="home-card" onClick={() => openHomeCard("knockout")}><span>🏆</span><b>{t.knockoutsCardTitle}</b><em>{t.knockoutsCardText}</em></button>
            <button className="home-card" onClick={() => openHomeCard("manual")}><span>✍</span><b>{t.buildBracketCardTitle}</b><em>{t.buildBracketCardText}</em></button>
          </div>
          {featuredMatch && (
            <section className="featured-prediction">
              <p className="kicker">{t.featuredPrediction}</p>
              <div className="featured-match">
                <strong>{flag(featuredMatch.home)} {featuredMatch.home}</strong>
                <span>{t.versus}</span>
                <strong>{flag(featuredMatch.away)} {featuredMatch.away}</strong>
              </div>
              <button className="primary" onClick={openFeaturedPrediction}>{t.predictNow}</button>
            </section>
          )}
          <section className="team-selector-panel">
            <p className="kicker">{t.chooseYourTeam}</p>
            <h2>{t.chooseYourTeam}</h2>
            <p>{t.chooseTeamSubtitle}</p>
            <label className="team-search">
              <span>{t.searchTeams}</span>
              <input
                value={teamSearch}
                onChange={(event) => setTeamSearch(event.target.value)}
                placeholder={t.searchTeams}
              />
            </label>
            <div className="team-selector-grid">
              {teamSearchResults.map((item) => (
                <button
                  className={selectedTeam === item.name ? "selected" : ""}
                  key={item.name}
                  type="button"
                  onClick={() => selectTeam(item.name)}
                >
                  {flag(item.name)}
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
            {selectedTeam && <p className="selected-team-note">✓ {tr(t.teamSelected, { team: selectedTeam })}</p>}
          </section>
          {selectedTeam && selectedTeamObject && (
            <section className="team-hub">
              <p className="kicker">{t.myTeamHub}</p>
              <div className="team-hub-title">
                {flag(selectedTeam)}
                <strong>{selectedTeamObject.name}</strong>
              </div>
              <p>{tr(t.upcomingPredictionsCount, { count: String(selectedTeamMatches.length) })}</p>
              <div className="team-hub-list">
                {selectedTeamMatches.slice(0, 5).map((match) => {
                  const index = groupPredictionMatches.findIndex((item) => item.id === match.id);
                  return (
                    <button key={match.id} type="button" onClick={() => openPredictor(index, "singleMatch")}>
                      <span>{flag(match.home)} {match.home}</span>
                      <em>{t.versus}</em>
                      <span>{flag(match.away)} {match.away}</span>
                    </button>
                  );
                })}
              </div>
              <button className="primary" onClick={() => openTeamPredictions(selectedTeam)}>
                {tr(t.viewAllTeamPredictions, { team: selectedTeam })}
              </button>
            </section>
          )}
        </section>
      )}

      {phase === "fullIntro" && (
        <section className="screen champion-screen">
          <div className="trophy-glow"><Trophy size={80} /></div>
          <p className="kicker">{t.fullTournamentPrediction}</p>
          <h2>{t.fullIntroTitle}</h2>
          <p className="subtitle">{t.fullIntroSubtitle}</p>
          <button className="primary" onClick={startFullPrediction}>{t.startPrediction}</button>
          <button className="secondary" onClick={() => setPhase("home")}><ChevronLeft size={18} /> {t.back}</button>
        </section>
      )}

      {phase === "builderGroup" && (
        <section className="screen">
          <p className="kicker">{t.manualBuilderMode}</p>
          <h2>{t.group} {groups[builderGroupIndex].id}</h2>
          <p className="step">{t.selectGroupFinishers}</p>
          <div className="builder-board">
            {groups[builderGroupIndex].teams.map((item) => {
              const pick = builderPicks[groups[builderGroupIndex].id] || {};
              return (
                <article className="builder-team" key={item.name}>
                  <div>{flag(item.name)}<strong>{item.name}</strong></div>
                  <div className="builder-pick-row">
                    <button type="button" className={pick.first === item.name ? "pick-button first active" : "pick-button first"} onClick={() => setBuilderPick(groups[builderGroupIndex].id, "first", item.name)}>{t.firstPlace}</button>
                    <button type="button" className={pick.second === item.name ? "pick-button second active" : "pick-button second"} onClick={() => setBuilderPick(groups[builderGroupIndex].id, "second", item.name)}>{t.secondPlace}</button>
                    <button type="button" className={pick.third === item.name ? "pick-button third active" : "pick-button third"} onClick={() => setBuilderPick(groups[builderGroupIndex].id, "third", item.name)}>{t.thirdCandidate}</button>
                  </div>
                </article>
              );
            })}
          </div>
          {builderWarning && <p className="builder-warning">{builderWarning}</p>}
          <button className="primary" disabled={!builderGroupComplete(groups[builderGroupIndex].id)} onClick={continueBuilderGroup}>{builderGroupIndex === groups.length - 1 ? t.chooseBestThirds : t.nextGroup}</button>
        </section>
      )}

      {phase === "builderThirds" && (
        <section className="screen">
          <button className="back" onClick={() => setPhase("builderGroup")}><ChevronLeft size={18} /> {t.back}</button>
          <p className="kicker">{t.manualBuilderMode}</p>
          <h2>{t.chooseBestThirds}</h2>
          <p className="step">{tr(t.selectedCount, { count: String(builderThirdGroups.length), total: "8" })}</p>
          <div className="builder-board">
            {groups.map((group) => {
              const name = builderPicks[group.id]?.third;
              return (
                <button className={builderThirdGroups.includes(group.id) ? "third-select active" : "third-select"} disabled={!name} key={group.id} onClick={() => toggleBuilderThird(group.id)}>
                  <span>{t.group} {group.id}</span>
                  {name ? flag(name) : null}
                  <strong>{name || t.noThirdSelected}</strong>
                </button>
              );
            })}
          </div>
          <button className="primary" disabled={builderThirdGroups.length !== 8} onClick={() => setPhase("builderBracket")}>{t.buildBracket}</button>
        </section>
      )}

      {phase === "bestThirds" && (
        <section className="screen champion-screen">
          <button className="secondary compact-action" onClick={() => setAutoPaused((current) => !current)}>
            {autoPaused ? t.resumePrediction : t.pausePrediction}
          </button>
          <div className="trophy-glow"><Zap size={72} /></div>
          <p className="kicker">{t.wildcardDrama}</p>
          <h2>{t.bestThirdPlaceTeams}</h2>
          <div className="standings">
            {result.bestThirds.slice(0, autoThirdRevealCount).map((item, index) => (
              <article className="standing-card third" key={item.name} style={{ animationDelay: `${index * 120}ms` }}>
                <span className="place">{index + 1}</span>
                {flag(item.name)}
                <div><strong>{item.name}</strong><em>{t.thirdQualified}</em></div>
                <b>{item.points} {t.pointsShort}</b>
              </article>
            ))}
          </div>
          <p className="auto-status">{autoPaused ? t.paused : t.runningPrediction}</p>
        </section>
      )}

      {phase === "builderBracket" && (
        <section className="bracket-page">
          <BracketViewport mobile={<MobileKnockoutTree manual />}>
            <ManualBranch side="left" />
            <div className="bracket-center">
              <h3>{t.final}</h3>
              <div className="center-logo-wrap">
                <img src="/worldcup-2026-logo.png" alt={t.logoAlt} />
                <span>{t.trophyPath}</span>
              </div>
              <ManualBracketCard matchId={104} compact />
              <h3>{t.thirdPlaceShort}</h3>
              <ManualBracketCard matchId={103} compact />
            </div>
            <ManualBranch side="right" />
          </BracketViewport>
          {manualChampion && <button className="primary bracket-complete-action" onClick={() => setPhase("champion")}>{t.revealChampion}</button>}
        </section>
      )}

      {phase === "groupSelect" && (
        <section className="screen">
          <button className="back" onClick={() => setPhase("home")}><ChevronLeft size={18} /> {t.back}</button>
          <p className="kicker">{t.chooseYourGroup}</p>
          <h2>{t.groupReveal}</h2>
          <div className="group-grid">
            {groups.map((group, index) => <button key={group.id} onClick={() => { setSelectedGroupIndex(index); setGroupRevealed(false); setPhase("groupReveal"); }}>{t.group} {group.id}</button>)}
          </div>
        </section>
      )}

      {(phase === "tournamentGroup" || phase === "groupReveal") && groupScreen}

      {phase === "matchSelect" && (
        <section className="screen">
          <button className="back" onClick={() => setPhase("home")}><ChevronLeft size={18} /> {t.back}</button>
          <p className="kicker">{t.aiMode}</p>
          <h2>{t.matchPredictor}</h2>
          <p className="step">{t.groupStageMatchesOnly}</p>
          <div className="match-list">
            {matchTeamFilter && <p className="team-filter">{flag(matchTeamFilter)} {tr(t.predictionsInvolving, { team: matchTeamFilter })}</p>}
            {filteredPredictionMatches.map((match) => {
              const index = groupPredictionMatches.findIndex((item) => item.id === match.id);
              return (
              <button className="mini-match" key={match.id} onClick={() => openPredictor(index, "singleMatch")}>
                <span>{tr(t.groupMatchNumber, { group: match.homeSource[0], number: match.homeSource.slice(1) })}</span>
                <b>{flag(match.home)} {match.home}</b>
                <em>{t.versus}</em>
                <b>{flag(match.away)} {match.away}</b>
              </button>
            );})}
          </div>
        </section>
      )}

      {phase === "knockout" && (
        <section className={`bracket-page ${flow === "full" && ["loading", "winner", "championDecision"].includes(autoKnockoutStatus) ? "reveal-focus" : ""}`}>
          {flow === "full" && autoRunning && (
            <button className="simulation-pause-button" onClick={() => setAutoPaused((current) => !current)}>
              {autoPaused ? `▶ ${t.resumePrediction}` : `⏸ ${t.pausePrediction}`}
            </button>
          )}
          <BracketViewport mobile={<MobileKnockoutTree />}>
            <BracketBranch side="left" />
            <div className="bracket-center">
              <h3>{t.final}</h3>
              {flow === "full" && roundSetMessage && <div className="bracket-round-status">{roundSetMessage}</div>}
              <div className="center-logo-wrap">
                <img src="/worldcup-2026-logo.png" alt={t.logoAlt} />
                <span>{t.trophyPath}</span>
              </div>
              <BracketCard matchId={104} compact />
              <h3>{t.thirdPlaceShort}</h3>
              <BracketCard matchId={103} compact />
            </div>
            <BracketBranch side="right" />
          </BracketViewport>
        </section>
      )}

      {phase === "predictor" && currentMatch && (
        flow === "singleMatch" ? (
          <section className={`hybrid-predictor ${predictionLoading || predictionReady ? `stage-${hybridStage}` : ""}`}>
            {(["winner", "engagement"].includes(hybridStage) || predictionReady) && <div className="confetti local" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>}
            <button className="back hybrid-back" onClick={predictAnotherMatch}><ChevronLeft size={18} /> {t.back}</button>
            <div className="hybrid-stadium" aria-hidden="true" />
            {(!predictionLoading && !predictionReady) ? (
              <>
                <div className="hybrid-intro-card">
                  <div>{flag(currentMatch.home, "huge")}<strong>{currentMatch.home}</strong></div>
                  <span>{t.versus}</span>
                  <div>{flag(currentMatch.away, "huge")}<strong>{currentMatch.away}</strong></div>
                </div>
                <button className="primary hybrid-start" onClick={startPrediction}>{t.startPrediction}</button>
              </>
            ) : hybridStage === "winner" || hybridStage === "engagement" ? (
              <div className="hybrid-winner">
                <Trophy size={54} />
                <strong>{t.winner}</strong>
                {flag(currentMatch.winner, "huge")}
                <h2>{currentMatch.winner}</h2>
                {hybridStage === "engagement" && (
                  <div className="engagement-card">
                    <strong>{t.doYouAgree}</strong>
                    <span>{t.commentBelow}</span>
                    <b>{upsetText(currentMatch)}</b>
                  </div>
                )}
                {(predictionReady || hybridStage === "engagement") && (
                  <div className="hybrid-actions">
                    <button className="primary" onClick={shareWinner}><Share2 size={18} /> {t.sharePrediction}</button>
                    <button className="secondary" onClick={predictAnotherMatch}>{t.predictAnotherMatch}</button>
                    <button className="secondary" onClick={goHome}><House size={18} /> {t.home}</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="hybrid-versus">
                  <div>{flag(currentMatch.home, "large")}<strong>{currentMatch.home}</strong>{["probability", "meter", "decision"].includes(hybridStage) && <b>{hybridHomeProb}%</b>}</div>
                  <span>{t.versus}</span>
                  <div>{flag(currentMatch.away, "large")}<strong>{currentMatch.away}</strong>{["probability", "meter", "decision"].includes(hybridStage) && <b>{100 - hybridHomeProb}%</b>}</div>
                </div>
                {hybridStage === "intro" && (
                  <div className="ai-analyzing-card">
                    <strong>{t.aiIsAnalyzing}</strong>
                  </div>
                )}
                {(hybridStage === "probability" || hybridStage === "meter") && (
                  <div className="probability-battle">
                    <strong>{hybridStage === "meter" ? t.predictionMeter : t.winProbabilityBattle}</strong>
                    <div className="probability-row home">
                      <span>{currentMatch.home}</span>
                      <i style={{ width: `${hybridHomeProb}%` }} />
                      <b>{hybridHomeProb}%</b>
                    </div>
                    <div className="probability-row away">
                      <span>{currentMatch.away}</span>
                      <i style={{ width: `${100 - hybridHomeProb}%` }} />
                      <b>{100 - hybridHomeProb}%</b>
                    </div>
                  </div>
                )}
                {hybridStage === "headToHead" && (
                  <div className="head-card">
                    {(() => {
                      const card = headToHeadCards(currentMatch)[hybridCardIndex] || headToHeadCards(currentMatch)[0];
                      return (
                        <>
                          <strong><span>{card.icon}</span>{card.title}</strong>
                          <div>
                            <b>{currentMatch.home}</b>
                            <i style={{ width: `${card.home}%` }} />
                            <em>{card.home}</em>
                          </div>
                          <div>
                            <b>{currentMatch.away}</b>
                            <i style={{ width: `${card.away}%` }} />
                            <em>{card.away}</em>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                {hybridStage === "decision" && (
                  <div className="lights-out decision-card">
                    <strong>{t.finalAiDecision}</strong>
                    <i />
                  </div>
                )}
                {hybridStage === "freeze" && (
                  <div className="lights-out">
                    <strong>{t.freezeMoment}</strong>
                    <i />
                  </div>
                )}
              </>
            )}
            {copied && <p className="copied">{t.copied}</p>}
          </section>
        ) : (
          <section className="screen match-screen prediction-screen">
            <button className="back" onClick={() => setPhase("knockout")}><ChevronLeft size={18} /> {t.backToKnockoutBracket}</button>
            <p className="step">{t.aiMatchPrediction} · {tr(t.matchNumber, { number: String(currentMatch.id) })}</p>
            {!predictionReady ? (
              <>
                <div className={predictionLoading ? "versus-card suspense" : "versus-card"}>
                  <div className="team-side">{flag(currentMatch.home, "large")}<strong>{currentMatch.home}</strong></div>
                  <span className="vs">{t.versus}</span>
                  <div className="team-side">{flag(currentMatch.away, "large")}<strong>{currentMatch.away}</strong></div>
                  {predictionLoading && <div className="suspense-box"><strong>{countdown}</strong><span>{predictionMessage}</span><i /></div>}
                </div>
                <button className="primary" disabled={predictionLoading || matchRevealed} onClick={startPrediction}>{matchRevealed ? t.winner : predictionLoading ? t.predicting : t.aiPredictWinner}</button>
              </>
            ) : (
              <>
                <div className="winner-only-card">
                  <Trophy size={42} />
                  <strong>{t.winner}</strong>
                  {flag(currentMatch.winner, "huge")}
                  <h2>{currentMatch.winner}</h2>
                </div>
                <button className="primary" onClick={nextAfterWinner}>{t.nextMatch}</button>
                <button className="secondary" onClick={shareWinner}><Share2 size={18} /> {t.shareWinner}</button>
              </>
            )}
            {copied && <p className="copied">{t.copied}</p>}
          </section>
        )
      )}

      {phase === "roundSet" && (
        <section className="screen champion-screen">
          <div className="trophy-glow"><Zap size={72} /></div>
          <h2>{roundSetMessage}</h2>
          <button className="primary" onClick={continueRoundSet}>{t.continue}</button>
        </section>
      )}

      {phase === "championDecision" && (
        <section className="screen champion-decision-screen">
          <div className="trophy-glow"><Trophy size={88} /></div>
          <p className="kicker">{t.championDecision}</p>
          <h2>{t.finalAiDecisionLoading}</h2>
        </section>
      )}

      {phase === "champion" && (
        <section className="screen champion-screen final-champion-screen">
          <p className="kicker final-kicker">{t.worldCupFinal}</p>
          <div className="champion-trophy-showcase" aria-label={t.logoAlt}>
            <i />
            <i />
            <i />
            <img src="/worldcup-2026-logo.png" alt={t.logoAlt} />
          </div>
          <p className="kicker">{t.worldCupChampion}</p>
          <div className="champion-card-expanded">
            <strong>{t.worldCupChampion}</strong>
            {flag(displayChampion, "huge")}
            <h2>{displayChampion}</h2>
          </div>
          <button className="primary" onClick={shareResult}><Share2 size={18} /> {t.shareResult}</button>
          <button className="secondary" onClick={runAgain}><Sparkles size={18} /> {t.newSimulation}</button>
          <button className="secondary" onClick={goHome}><House size={18} /> {t.home}</button>
          {copied && <p className="copied">{t.copied}</p>}
        </section>
      )}
    </main>
  );
}

"use client";

import { ChevronLeft, House, Share2, Sparkles, Trophy, Volume2, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { languageOptions, locales, type LocaleCode } from "../locales";

type Phase = "home" | "tournamentGroup" | "groupSelect" | "groupReveal" | "matchSelect" | "predictor" | "knockout" | "roundSet" | "champion";
type Team = { name: string; rating: number; group: string; flag: string; code?: string };
type Group = { id: string; teams: Team[] };
type Standing = Team & { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number };
type Slot = { source: string; team: string };
type Match = { id: number; home: string; away: string; homeSource: string; awaySource: string; hs: number; as: number; winner: string; label: string };
type Flow = "full" | "group" | "singleMatch" | "knockout";
type RoundKey = "roundOf32" | "roundOf16" | "quarterfinals" | "semifinals" | "thirdPlaceMatch" | "final";
type RoundSetKey = "roundOf16Set" | "quarterfinalsSet" | "semifinalsSet" | "finalSet";
type LocaleText = (typeof locales)[LocaleCode];

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

function predictionReasonIndex(match: Match) {
  return (match.id + match.winner.length + match.hs + match.as) % locales.en.predictionReasons.length;
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
  const [roundSetMessage, setRoundSetMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [revealedMatchIds, setRevealedMatchIds] = useState<Set<number>>(new Set());

  const result = useMemo(() => simulate(seed), [seed]);
  const groupPredictionMatches = useMemo(() => buildGroupPredictionMatches(seed), [seed]);
  const t = locales[language];
  const isRtl = t.dir === "rtl";
  const currentGroupIndex = flow === "group" ? selectedGroupIndex : groupIndex;
  const currentGroup = result.tables[currentGroupIndex];
  const knockoutMatches = result.matches;
  const currentMatch = flow === "singleMatch" ? groupPredictionMatches[matchIndex] : knockoutMatches[matchIndex];
  const champion = result.champion;
  const thirdQualified = new Set(result.bestThirds.map((item) => item.name));
  const matchById = new Map(knockoutMatches.map((match, index) => [match.id, { match, index }]));

  useEffect(() => {
    const saved = window.localStorage.getItem("worldcup-language") as LocaleCode | null;
    if (saved && saved in locales) setLanguage(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("worldcup-language", language);
    document.documentElement.lang = t.langCode;
    document.documentElement.dir = t.dir;
  }, [language, t.dir, t.langCode]);

  function tr(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
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
    setRoundSetMessage("");
    setCopied(false);
    setRevealedMatchIds(new Set());
  }

  function openHomeCard(nextFlow: Flow) {
    setFlow(nextFlow);
    setGroupRevealed(false);
    setMatchRevealed(false);
    setPredictionReady(false);
    setPredictionLoading(false);
    setPredictionMessage("");
    setCountdown(3);
    if (nextFlow === "full") setPhase("tournamentGroup");
    if (nextFlow === "group") setPhase("groupSelect");
    if (nextFlow === "singleMatch") setPhase("matchSelect");
    if (nextFlow === "knockout") setPhase("knockout");
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
    setPhase("predictor");
  }

  function startPrediction() {
    if (predictionLoading || predictionReady) return;
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

  function returnAfterPrediction() {
    if (flow === "knockout") {
      setRevealedMatchIds((previous) => new Set(previous).add(currentMatch.id));
    }
    setMatchRevealed(true);
    setPredictionReady(false);
    setPredictionLoading(false);
    setPredictionMessage("");
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
    share(tr(t.shareResultText, { team: champion, url }));
  }

  function sharePrediction() {
    const url = typeof window !== "undefined" ? window.location.href : "https://github.com/aissadi/worldcup-simulator";
    share(tr(t.sharePredictionText, {
      winner: currentMatch.winner,
      loser: currentMatch.winner === currentMatch.home ? currentMatch.away : currentMatch.home,
      score: `${currentMatch.hs}-${currentMatch.as}`,
      url
    }));
  }

  function goHome() {
    setPhase("home");
    setPredictionLoading(false);
    setPredictionReady(false);
    setGroupLoading(false);
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

  function BracketCard({ matchId, compact = false }: { matchId: number; compact?: boolean }) {
    const item = matchById.get(matchId);
    if (!item) return null;
    const match = item.match;
    const available = isKnockoutMatchAvailable(matchId);
    const revealed = revealedMatchIds.has(matchId);
    const homeName = sourceLabel(matchId, "home");
    const awayName = sourceLabel(matchId, "away");
    const placement = bracketRows.get(matchId);
    return (
      <button
        type="button"
        className={`${compact ? "bracket-card compact" : "bracket-card"} ${revealed ? "revealed" : ""}`}
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

  const groupScreen = (
    <section className="screen">
      <button className="back" onClick={() => setPhase(flow === "group" ? "groupSelect" : "home")}><ChevronLeft size={18} /> {t.back}</button>
      <p className="step">{t.group} {currentGroup.group}</p>
      <h2>{t.group} {currentGroup.group}</h2>
      {!groupRevealed ? (
        <div className="team-list">
          {groups[currentGroupIndex].teams.map((item) => <div className="team-row" key={item.name}>{flag(item.name)}<strong>{item.name}</strong></div>)}
        </div>
      ) : (
        <div className="standings">
          {currentGroup.standings.map((item, index) => {
            const third = index === 2 && thirdQualified.has(item.name);
            const label = index === 0 ? t.firstQualified : index === 1 ? t.secondQualified : third ? t.thirdQualified : t.eliminated;
            return (
              <article className={index < 2 ? "standing-card qualified" : third ? "standing-card third" : "standing-card out"} key={item.name} style={{ animationDelay: `${index * 190}ms` }}>
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
      {!groupRevealed ? <button className="primary" disabled={groupLoading} onClick={revealGroup}>{groupLoading ? t.revealing : t.revealGroup}</button> : <button className="primary" onClick={continueAfterGroup}>{flow === "full" ? groupIndex === 11 ? t.startKnockouts : `${t.nextGroup} ${groups[groupIndex + 1].id}` : t.backToGroups}</button>}
    </section>
  );

  return (
    <main className={isRtl ? "app rtl" : "app"} dir={t.dir}>
      <AppHeader t={t} language={language} onLanguageChange={setLanguage} onHome={goHome} />
      {phase === "champion" && <div className="confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>}

      {phase === "home" && (
        <section className="screen landing">
          <img className="landing-logo" src="/worldcup-2026-logo.png" alt={t.logoAlt} />
          <div className="landing-graphic" aria-hidden="true"><Trophy size={74} /><span /></div>
          <h1>{t.homeTitle}</h1>
          <p className="subtitle">{t.homeSubtitle}</p>
          <div className="home-grid">
            <button className="home-card" onClick={() => openHomeCard("full")}><b>{t.startFullTournament}</b></button>
            <button className="home-card" onClick={() => openHomeCard("group")}><b>{t.chooseGroup}</b></button>
            <button className="home-card" onClick={() => openHomeCard("singleMatch")}><b>{t.predictOneMatch}</b></button>
            <button className="home-card" onClick={() => openHomeCard("knockout")}><b>{t.knockoutStagePredictions}</b></button>
            <button className="home-card" onClick={() => { reset(seed + 1); setFlow("knockout"); setPhase("knockout"); }}><b>{t.buildYourPredictions}</b></button>
          </div>
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
          <p className="kicker">{t.chooseOneMatch}</p>
          <h2>{t.matchPredictor}</h2>
          <p className="step">{t.groupStageMatchesOnly}</p>
          <div className="match-list">
            {groupPredictionMatches.map((match, index) => (
              <button className="mini-match" key={match.id} onClick={() => openPredictor(index, "singleMatch")}>
                <span>{tr(t.groupMatchNumber, { group: match.homeSource[0], number: match.homeSource.slice(1) })}</span>
                <b>{flag(match.home)} {match.home}</b>
                <em>{t.versus}</em>
                <b>{flag(match.away)} {match.away}</b>
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === "knockout" && (
        <section className="screen bracket-screen">
          <p className="kicker">{t.fullKnockoutPath}</p>
          <h2>{t.knockoutBracket}</h2>
          <p className="step">{t.tapAnyLiveMatch}</p>
          <div className="bracket-scroll">
            <div className="bracket-stage">
              <BracketBranch side="left" />
              <div className="bracket-center">
                <h3>{t.final}</h3>
                <div className="center-logo-wrap">
                  <img src="/worldcup-2026-logo.png" alt={t.logoAlt} />
                  <span>{t.trophyPath}</span>
                </div>
                <BracketCard matchId={104} compact />
                <h3>{t.thirdPlaceShort}</h3>
                <BracketCard matchId={103} compact />
              </div>
              <BracketBranch side="right" />
            </div>
          </div>
        </section>
      )}

      {phase === "predictor" && currentMatch && (
        <section className="screen match-screen prediction-screen">
          <button className="back" onClick={() => setPhase(flow === "singleMatch" ? "matchSelect" : "knockout")}><ChevronLeft size={18} /> {flow === "knockout" ? t.backToKnockoutBracket : t.backToTournament}</button>
          <p className="step">{t.aiMatchPrediction} · {flow === "singleMatch" ? currentMatch.label : tr(t.matchNumber, { number: String(currentMatch.id) })}</p>
          <div className={predictionLoading ? "versus-card suspense" : "versus-card"}>
            <div className={predictionReady && currentMatch.winner === currentMatch.home ? "team-side winner" : "team-side"}>{flag(currentMatch.home, "large")}<strong>{currentMatch.home}</strong>{predictionReady && flow === "singleMatch" && <b>{currentMatch.hs}</b>}</div>
            <span className="vs">{t.versus}</span>
            <div className={predictionReady && currentMatch.winner === currentMatch.away ? "team-side winner" : "team-side"}>{flag(currentMatch.away, "large")}<strong>{currentMatch.away}</strong>{predictionReady && flow === "singleMatch" && <b>{currentMatch.as}</b>}</div>
            {predictionLoading && <div className="suspense-box"><strong>{countdown}</strong><span>{predictionMessage}</span><i /></div>}
          </div>
          {predictionReady && <div className="prediction-result"><Trophy size={26} /><strong>{t.winner}: {flag(currentMatch.winner)} {currentMatch.winner}</strong>{flow === "singleMatch" && <em>{t.reason}: {t.predictionReasons[predictionReasonIndex(currentMatch)]}</em>}</div>}
          {!predictionReady ? <button className="primary" disabled={predictionLoading || matchRevealed} onClick={startPrediction}>{matchRevealed ? t.winner : predictionLoading ? t.predicting : t.aiPredictWinner}</button> : <button className="primary" onClick={matchRevealed ? () => setPhase("knockout") : returnAfterPrediction}>{matchRevealed ? t.backToKnockoutBracket : t.sendWinnerToBracket}</button>}
          {predictionReady && flow === "singleMatch" && <button className="secondary" onClick={sharePrediction}><Share2 size={18} /> {t.sharePrediction}</button>}
          {flow === "knockout" && !matchRevealed && <button className="secondary" onClick={() => setPhase("knockout")}><ChevronLeft size={18} /> {t.backToKnockoutBracket}</button>}
          {flow === "singleMatch" && predictionReady && <button className="secondary" onClick={() => openPredictor(Math.min(matchIndex + 1, groupPredictionMatches.length - 1), "singleMatch")}>{t.nextMatch}</button>}
          {copied && <p className="copied">{t.copied}</p>}
        </section>
      )}

      {phase === "roundSet" && (
        <section className="screen champion-screen">
          <div className="trophy-glow"><Zap size={72} /></div>
          <h2>{roundSetMessage}</h2>
          <button className="primary" onClick={continueRoundSet}>{t.continue}</button>
        </section>
      )}

      {phase === "champion" && (
        <section className="screen champion-screen">
          <div className="trophy-glow"><Trophy size={88} /></div>
          <h2>{flag(champion, "large")} {tr(t.championLine, { team: champion })}</h2>
          <button className="primary" onClick={shareResult}><Share2 size={18} /> {t.shareMyResult}</button>
          <button className="secondary" onClick={() => reset()}><Sparkles size={18} /> {t.tryAgain}</button>
          {copied && <p className="copied">{t.copied}</p>}
        </section>
      )}
    </main>
  );
}

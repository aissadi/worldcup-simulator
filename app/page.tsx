"use client";

import { ChevronLeft, Share2, Sparkles, Trophy, Volume2, Zap } from "lucide-react";
import { useMemo, useState } from "react";

type Phase = "home" | "tournamentGroup" | "groupSelect" | "groupReveal" | "matchSelect" | "predictor" | "knockout" | "roundSet" | "champion";
type Team = { name: string; rating: number; group: string; flag: string; code?: string };
type Group = { id: string; teams: Team[] };
type Standing = Team & { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number };
type Slot = { source: string; team: string };
type Match = { id: number; home: string; away: string; homeSource: string; awaySource: string; hs: number; as: number; winner: string; label: string };
type Flow = "full" | "group" | "singleMatch" | "knockout";

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
const groupSuspense = ["Calculating results...", "Checking goal difference...", "Ranking teams..."];
const predictionSuspense = ["Analyzing team form...", "Checking ratings...", "Running simulation..."];
const predictionReasons = ["higher attack rating", "better tournament form", "stronger knockout momentum", "more clinical finishing", "better defensive balance", "big-game experience"];

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

function roundName(matchId: number) {
  if (matchId <= 88) return "Round of 32";
  if (matchId <= 96) return "Round of 16";
  if (matchId <= 100) return "Quarterfinals";
  if (matchId <= 102) return "Semifinals";
  if (matchId === 103) return "Third Place Match";
  return "Final";
}

function nextRoundSetMessage(matchId: number) {
  if (matchId === 88) return "Round of 16 is set";
  if (matchId === 96) return "Quarterfinals are set";
  if (matchId === 100) return "Semifinals are set";
  if (matchId === 102) return "Final is set";
  return "";
}

function predictionReason(match: Match) {
  return predictionReasons[(match.id + match.winner.length + match.hs + match.as) % predictionReasons.length];
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
  [0, 180, 360, 540, 720, 900].forEach((delay, index) => window.setTimeout(() => playTone(92 + index * 12, 0.08, "square"), delay));
}

function playWhoosh() {
  playTone(520, 0.16, "sawtooth");
  window.setTimeout(() => playTone(740, 0.14, "triangle"), 80);
}

export default function Home() {
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

  const result = useMemo(() => simulate(seed), [seed]);
  const currentGroupIndex = flow === "group" ? selectedGroupIndex : groupIndex;
  const currentGroup = result.tables[currentGroupIndex];
  const currentMatch = result.matches[matchIndex];
  const champion = result.champion;
  const thirdQualified = new Set(result.bestThirds.map((item) => item.name));

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
  }

  function openHomeCard(nextFlow: Flow) {
    setFlow(nextFlow);
    setGroupRevealed(false);
    setMatchRevealed(false);
    setPredictionReady(false);
    if (nextFlow === "full") setPhase("tournamentGroup");
    if (nextFlow === "group") setPhase("groupSelect");
    if (nextFlow === "singleMatch") setPhase("matchSelect");
    if (nextFlow === "knockout") setPhase("knockout");
  }

  function revealGroup() {
    if (groupLoading || groupRevealed) return;
    setGroupLoading(true);
    playDrumRoll();
    groupSuspense.forEach((message, index) => window.setTimeout(() => setGroupMessage(message), index * 760));
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
    setMatchRevealed(false);
    setPredictionReady(false);
    setPredictionLoading(false);
    setPhase("predictor");
  }

  function startPrediction() {
    if (predictionLoading || predictionReady) return;
    setPredictionLoading(true);
    setPredictionReady(false);
    playDrumRoll();
    predictionSuspense.forEach((message, index) => window.setTimeout(() => {
      setPredictionMessage(message);
      setCountdown(3 - index);
    }, index * 900));
    window.setTimeout(() => {
      setPredictionLoading(false);
      setPredictionReady(true);
      setPredictionMessage("");
      setCountdown(0);
      playWhoosh();
    }, 2900);
  }

  function returnAfterPrediction() {
    setMatchRevealed(true);
    setPredictionReady(false);
    setPredictionLoading(false);
    setPredictionMessage("");
    setPhase(flow === "singleMatch" ? "matchSelect" : "knockout");
  }

  function nextMatch() {
    const message = nextRoundSetMessage(currentMatch.id);
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
    else if (navigator.share) await navigator.share({ title: "World Cup 2026 Simulator", text });
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function shareResult() {
    const url = typeof window !== "undefined" ? window.location.href : "https://github.com/aissadi/worldcup-simulator";
    share(`${champion} won my World Cup 2026 simulation 🏆 Try yours here: ${url}`);
  }

  function sharePrediction() {
    const url = typeof window !== "undefined" ? window.location.href : "https://github.com/aissadi/worldcup-simulator";
    share(`${currentMatch.winner} beat ${currentMatch.winner === currentMatch.home ? currentMatch.away : currentMatch.home} ${currentMatch.hs}-${currentMatch.as} in my World Cup 2026 prediction 🏆 Try yours here: ${url}`);
  }

  const groupScreen = (
    <section className="screen">
      <button className="back" onClick={() => setPhase(flow === "group" ? "groupSelect" : "home")}><ChevronLeft size={18} /> Back</button>
      <p className="step">Group {currentGroup.group}</p>
      <h2>Group {currentGroup.group}</h2>
      {!groupRevealed ? (
        <div className="team-list">
          {groups[currentGroupIndex].teams.map((item) => <div className="team-row" key={item.name}>{flag(item.name)}<strong>{item.name}</strong></div>)}
        </div>
      ) : (
        <div className="standings">
          {currentGroup.standings.map((item, index) => {
            const third = index === 2 && thirdQualified.has(item.name);
            const label = index === 0 ? "🥇 1st qualified" : index === 1 ? "🥈 2nd qualified" : third ? "🟡 3rd qualified" : "❌ eliminated";
            return (
              <article className={index < 2 ? "standing-card qualified" : third ? "standing-card third" : "standing-card out"} key={item.name} style={{ animationDelay: `${index * 190}ms` }}>
                <span className="place">{index + 1}</span>
                {flag(item.name)}
                <div><strong>{item.name}</strong><em>{label}</em></div>
                <b>{item.points} pts</b>
              </article>
            );
          })}
        </div>
      )}
      {groupLoading && <div className="loading-card"><Volume2 size={20} /><strong>{groupMessage}</strong><i /></div>}
      {!groupRevealed ? <button className="primary" disabled={groupLoading} onClick={revealGroup}>{groupLoading ? "Revealing..." : "Reveal Group"}</button> : <button className="primary" onClick={continueAfterGroup}>{flow === "full" ? groupIndex === 11 ? "Start Knockouts" : `Next: Group ${groups[groupIndex + 1].id}` : "Back To Groups"}</button>}
    </section>
  );

  return (
    <main className="app">
      {phase === "champion" && <div className="confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>}

      {phase === "home" && (
        <section className="screen landing">
          <p className="kicker"><Sparkles size={16} /> FIFA + Sofascore + ESPN energy</p>
          <h1>World Cup 2026 Simulator</h1>
          <div className="home-grid">
            <button className="home-card" onClick={() => openHomeCard("full")}><b>Full Tournament Simulation</b><span>Start at groups and reveal the champion.</span></button>
            <button className="home-card" onClick={() => openHomeCard("group")}><b>Group Reveal</b><span>Choose any group A-L.</span></button>
            <button className="home-card" onClick={() => openHomeCard("singleMatch")}><b>Match Predictor</b><span>Pick one fixture and run the AI reveal.</span></button>
            <button className="home-card" onClick={() => openHomeCard("knockout")}><b>Knockout Simulator</b><span>Start from the Round of 32.</span></button>
          </div>
        </section>
      )}

      {phase === "groupSelect" && (
        <section className="screen">
          <button className="back" onClick={() => setPhase("home")}><ChevronLeft size={18} /> Back</button>
          <p className="kicker">Choose your group</p>
          <h2>Group Reveal</h2>
          <div className="group-grid">
            {groups.map((group, index) => <button key={group.id} onClick={() => { setSelectedGroupIndex(index); setGroupRevealed(false); setPhase("groupReveal"); }}>Group {group.id}</button>)}
          </div>
        </section>
      )}

      {(phase === "tournamentGroup" || phase === "groupReveal") && groupScreen}

      {phase === "matchSelect" && (
        <section className="screen">
          <button className="back" onClick={() => setPhase("home")}><ChevronLeft size={18} /> Back</button>
          <p className="kicker">Choose one match</p>
          <h2>Match Predictor</h2>
          <div className="match-list">
            {result.matches.map((match, index) => (
              <button className="mini-match" key={match.id} onClick={() => openPredictor(index, "singleMatch")}>
                <span>M{match.id}</span>
                <b>{flag(match.home)} {match.home}</b>
                <em>vs</em>
                <b>{flag(match.away)} {match.away}</b>
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === "knockout" && currentMatch && (
        <section className="screen match-screen">
          <p className="step">{roundName(currentMatch.id)} · M{currentMatch.id}</p>
          <h2>{roundName(currentMatch.id)}</h2>
          <button className={matchRevealed ? "match-open-card revealed" : "match-open-card"} onClick={() => setPhase("predictor")} disabled={matchRevealed}>
            <span>Tap match card to open prediction</span>
            <div>{flag(currentMatch.home)}<strong>{currentMatch.home}</strong></div>
            <b>VS</b>
            <div>{flag(currentMatch.away)}<strong>{currentMatch.away}</strong></div>
          </button>
          {matchRevealed && <div className="winner-reveal"><Trophy size={26} /><strong>{flag(currentMatch.winner)} {currentMatch.winner} advance</strong></div>}
          {matchRevealed ? <button className="primary" onClick={nextMatch}>{currentMatch.id === 104 ? "Reveal Champion" : "Next Match"}</button> : <button className="primary" onClick={() => setPhase("predictor")}>Open Match Prediction</button>}
        </section>
      )}

      {phase === "predictor" && currentMatch && (
        <section className="screen match-screen prediction-screen">
          <button className="back" onClick={() => setPhase(flow === "singleMatch" ? "matchSelect" : "knockout")}><ChevronLeft size={18} /> Back To Tournament</button>
          <p className="step">AI Match Prediction · M{currentMatch.id}</p>
          <div className={predictionLoading ? "versus-card suspense" : "versus-card"}>
            <div className={predictionReady && currentMatch.winner === currentMatch.home ? "team-side winner" : "team-side"}>{flag(currentMatch.home, "large")}<strong>{currentMatch.home}</strong>{predictionReady && <b>{currentMatch.hs}</b>}</div>
            <span className="vs">VS</span>
            <div className={predictionReady && currentMatch.winner === currentMatch.away ? "team-side winner" : "team-side"}>{flag(currentMatch.away, "large")}<strong>{currentMatch.away}</strong>{predictionReady && <b>{currentMatch.as}</b>}</div>
            {predictionLoading && <div className="suspense-box"><strong>{countdown}</strong><span>{predictionMessage}</span><i /></div>}
          </div>
          {predictionReady && <div className="prediction-result"><Trophy size={26} /><strong>{flag(currentMatch.winner)} {currentMatch.winner} predicted to win</strong><em>Reason: {predictionReason(currentMatch)}</em></div>}
          {!predictionReady ? <button className="primary" disabled={predictionLoading} onClick={startPrediction}>{predictionLoading ? "Predicting..." : "AI Predict Winner"}</button> : <button className="primary" onClick={returnAfterPrediction}>Send Winner To Bracket</button>}
          {predictionReady && <button className="secondary" onClick={sharePrediction}><Share2 size={18} /> Share Prediction</button>}
          {flow === "singleMatch" && predictionReady && <button className="secondary" onClick={() => openPredictor(Math.min(matchIndex + 1, result.matches.length - 1), "singleMatch")}>Next Match</button>}
          {copied && <p className="copied">Copied to clipboard.</p>}
        </section>
      )}

      {phase === "roundSet" && (
        <section className="screen champion-screen">
          <div className="trophy-glow"><Zap size={72} /></div>
          <h2>{roundSetMessage}</h2>
          <button className="primary" onClick={continueRoundSet}>Continue</button>
        </section>
      )}

      {phase === "champion" && (
        <section className="screen champion-screen">
          <div className="trophy-glow"><Trophy size={88} /></div>
          <h2>{flag(champion, "large")} {champion} won my World Cup 2026 simulation 🏆</h2>
          <button className="primary" onClick={shareResult}><Share2 size={18} /> Share My Result</button>
          <button className="secondary" onClick={() => reset()}><Sparkles size={18} /> Try Again</button>
          {copied && <p className="copied">Copied to clipboard.</p>}
        </section>
      )}
    </main>
  );
}

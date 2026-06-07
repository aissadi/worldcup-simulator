"use client";

import { Crown, Maximize2, Minimize2, RotateCcw, Share2, Shuffle, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { useMemo, useState } from "react";

type Mode = "simulation" | "manual";
type Team = { name: string; rating: number; group: string; flag: string };
type Group = { id: string; teams: Team[] };
type Standing = Team & { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number };
type Slot = { source: string; team: string };
type Match = { id: number; home: string; away: string; homeSource: string; awaySource: string; hs?: number; as?: number; winner?: string; label: string };
type Round = { name: string; matches: Match[] };

const flags: Record<string, string> = {
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
  teams: teams.map(([name, rating]) => ({ name, rating, group: id, flag: flags[name] ?? "🏳️" }))
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
const roundNames = ["Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Third Place Match", "Final"] as const;

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
    const matches = groupFixtures.map(([h, a]) => {
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
      return `${home.flag} ${home.name} ${hs}-${as} ${away.name} ${away.flag}`;
    });
    const standings = [...rows.values()].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.rating - a.rating);
    return { group: group.id, standings, matches };
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
    const home = { source: `${isThirdPlace ? "L" : "W"}${a}`, team: isThirdPlace ? loser(ma) : ma.winner! };
    const away = { source: `${isThirdPlace ? "L" : "W"}${b}`, team: isThirdPlace ? loser(mb) : mb.winner! };
    matches.set(id, knockout(home, away, teams, id, rng));
  });

  return { tables, bestThirds, matches: [...matches.values()].sort((a, b) => a.id - b.id), champion: matches.get(104)!.winner! };
}

function blankMatch(id: number, homeSource: string, awaySource: string, home = "", away = ""): Match {
  return { id, home, away, homeSource, awaySource, label: `M${id}` };
}

function isPlaceholderTeam(team: string) {
  return team === "Qualified team" || team.startsWith("Winner M") || team.startsWith("Loser M");
}

function roundFor(matchId: number) {
  if (matchId <= 88) return 0;
  if (matchId <= 96) return 1;
  if (matchId <= 100) return 2;
  if (matchId <= 102) return 3;
  if (matchId === 103) return 4;
  return 5;
}

function groupRounds(matches: Match[]): Round[] {
  return roundNames.map((name, index) => ({ name, matches: matches.filter((match) => roundFor(match.id) === index) }));
}

function buildProgressMatches(autoMatches: Match[], revealed: Set<number>, allGroupsRevealed: boolean) {
  const autoById = new Map(autoMatches.map((match) => [match.id, match]));
  const visible = new Map<number, Match>();

  fixedR32.forEach(([id]) => {
    const match = autoById.get(id)!;
    visible.set(id, allGroupsRevealed ? { ...match, winner: revealed.has(id) ? match.winner : undefined, hs: revealed.has(id) ? match.hs : undefined, as: revealed.has(id) ? match.as : undefined } : blankMatch(id, "Qual.", "Qual.", "Qualified team", "Qualified team"));
  });

  nextRounds.forEach(([id, a, b]) => {
    const auto = autoById.get(id)!;
    const isThirdPlace = id === 103;
    const leftReady = revealed.has(a);
    const rightReady = revealed.has(b);
    const homeTeam = leftReady ? (isThirdPlace ? loser(autoById.get(a)!) : autoById.get(a)!.winner!) : `${isThirdPlace ? "Loser" : "Winner"} M${a}`;
    const awayTeam = rightReady ? (isThirdPlace ? loser(autoById.get(b)!) : autoById.get(b)!.winner!) : `${isThirdPlace ? "Loser" : "Winner"} M${b}`;
    const complete = revealed.has(id);
    visible.set(id, { ...auto, home: homeTeam, away: awayTeam, homeSource: `${isThirdPlace ? "L" : "W"}${a}`, awaySource: `${isThirdPlace ? "L" : "W"}${b}`, winner: complete ? auto.winner : undefined, hs: complete ? auto.hs : undefined, as: complete ? auto.as : undefined });
  });

  return [...visible.values()].sort((a, b) => a.id - b.id);
}

function buildManualMatches(baseMatches: Match[], picks: Record<number, string>, allGroupsRevealed: boolean) {
  const base = new Map(baseMatches.map((match) => [match.id, match]));
  const matches = new Map<number, Match>();

  fixedR32.forEach(([id]) => {
    const match = base.get(id)!;
    matches.set(id, allGroupsRevealed ? { ...match, hs: undefined, as: undefined, winner: picks[id] } : blankMatch(id, "Qual.", "Qual.", "Qualified team", "Qualified team"));
  });

  nextRounds.forEach(([id, a, b]) => {
    const isThirdPlace = id === 103;
    const prevA = matches.get(a)!;
    const prevB = matches.get(b)!;
    const home = isThirdPlace
      ? prevA.winner ? (prevA.winner === prevA.home ? prevA.away : prevA.home) : `Loser M${a}`
      : prevA.winner ?? `Winner M${a}`;
    const away = isThirdPlace
      ? prevB.winner ? (prevB.winner === prevB.home ? prevB.away : prevB.home) : `Loser M${b}`
      : prevB.winner ?? `Winner M${b}`;
    const ready = !isPlaceholderTeam(home) && !isPlaceholderTeam(away);
    matches.set(id, { id, home, away, homeSource: `${isThirdPlace ? "L" : "W"}${a}`, awaySource: `${isThirdPlace ? "L" : "W"}${b}`, winner: ready ? picks[id] : undefined, label: `M${id}` });
  });

  return [...matches.values()].sort((a, b) => a.id - b.id);
}

function TeamMark({ team, source }: { team: string; source?: string }) {
  const isPlaceholder = isPlaceholderTeam(team);
  return (
    <span className={isPlaceholder ? "team-mark placeholder-team" : "team-mark"}>
      <span className="flag">{isPlaceholder ? "•" : flags[team] ?? "🏳️"}</span>
      <span className="team-name">{team}</span>
      {source && <span className="seed-tag">{source}</span>}
    </span>
  );
}

function MatchCard({
  match,
  mode,
  suspenseId,
  onSimulate,
  onPick,
  allGroupsRevealed
}: {
  match: Match;
  mode: Mode;
  suspenseId?: number;
  onSimulate: (id: number) => void;
  onPick: (id: number, team: string) => void;
  allGroupsRevealed: boolean;
}) {
  const isSuspense = suspenseId === match.id;
  const canPlay = allGroupsRevealed && !match.winner && !isPlaceholderTeam(match.home) && !isPlaceholderTeam(match.away);
  const scoreVisible = typeof match.hs === "number" && typeof match.as === "number";

  return (
    <article className={isSuspense ? "match-card suspense" : match.winner ? "match-card complete" : "match-card"}>
      <div className="match-topline">
        <b>M{match.id}</b>
        {match.winner ? <span>Winner locked</span> : <span>{mode === "manual" ? "Pick winner" : "Awaiting whistle"}</span>}
      </div>
      <button className={match.winner === match.home ? "team-button winner" : "team-button"} disabled={mode === "simulation" || !canPlay} onClick={() => onPick(match.id, match.home)}>
        <TeamMark team={match.home} source={match.homeSource} />
        <strong>{scoreVisible ? match.hs : ""}</strong>
      </button>
      <div className="versus">VS</div>
      <button className={match.winner === match.away ? "team-button winner" : "team-button"} disabled={mode === "simulation" || !canPlay} onClick={() => onPick(match.id, match.away)}>
        <TeamMark team={match.away} source={match.awaySource} />
        <strong>{scoreVisible ? match.as : ""}</strong>
      </button>
      {mode === "simulation" && !match.winner && (
        <button className="simulate-match" disabled={!canPlay || isSuspense} onClick={() => onSimulate(match.id)}>
          {isSuspense ? "Crowd is rising..." : "Simulate Match"}
        </button>
      )}
      {isSuspense && <div className="energy-bar"><span /></div>}
    </article>
  );
}

export default function Home() {
  const [seed, setSeed] = useState(7);
  const [creator, setCreator] = useState(false);
  const [mode, setMode] = useState<Mode>("simulation");
  const [revealedGroups, setRevealedGroups] = useState(0);
  const [revealedMatches, setRevealedMatches] = useState<Record<number, boolean>>({});
  const [manualPicks, setManualPicks] = useState<Record<number, string>>({});
  const [suspenseId, setSuspenseId] = useState<number>();
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => simulate(seed), [seed]);
  const allGroupsRevealed = revealedGroups >= groups.length;
  const revealedSet = useMemo(() => new Set(Object.keys(revealedMatches).map(Number)), [revealedMatches]);
  const visibleMatches = mode === "simulation"
    ? buildProgressMatches(result.matches, revealedSet, allGroupsRevealed)
    : buildManualMatches(result.matches, manualPicks, allGroupsRevealed);
  const rounds = groupRounds(visibleMatches);
  const roundOf32 = rounds[0].matches;
  const roundOf16 = rounds[1].matches;
  const quarterfinals = rounds[2].matches;
  const semifinals = rounds[3].matches;
  const thirdPlaceMatch = rounds[4].matches[0];
  const finalMatch = rounds[5].matches[0];
  const currentGroup = groups[revealedGroups];
  const champion = mode === "manual" ? manualPicks[104] : revealedMatches[104] ? result.champion : "";
  const thirdPlaceWinner = mode === "manual" ? manualPicks[103] : revealedMatches[103] ? result.matches.find((match) => match.id === 103)?.winner : "";

  function resetTournament(nextSeed = seed) {
    setSeed(nextSeed);
    setRevealedGroups(0);
    setRevealedMatches({});
    setManualPicks({});
    setSuspenseId(undefined);
    setCopied(false);
  }

  function revealNextGroup() {
    setRevealedGroups((count) => Math.min(groups.length, count + 1));
  }

  function simulateMatch(id: number) {
    if (suspenseId) return;
    setSuspenseId(id);
    window.setTimeout(() => {
      setRevealedMatches((matches) => ({ ...matches, [id]: true }));
      setSuspenseId(undefined);
    }, 3000);
  }

  function pickWinner(id: number, team: string) {
    if (!team || isPlaceholderTeam(team)) return;
    const downstream = new Set<number>();
    const collectDownstream = (matchId: number) => {
      nextRounds.forEach(([nextId, a, b]) => {
        if ((a === matchId || b === matchId) && !downstream.has(nextId)) {
          downstream.add(nextId);
          collectDownstream(nextId);
        }
      });
    };
    collectDownstream(id);
    setManualPicks((picks) => {
      const next = { ...picks, [id]: team };
      downstream.forEach((matchId) => delete next[matchId]);
      return next;
    });
  }

  async function share() {
    const winner = champion || "A champion is waiting to be revealed";
    const url = typeof window !== "undefined" ? window.location.href : "https://github.com/aissadi/worldcup-simulator";
    const text = `${winner} won my World Cup 2026 simulation 🏆 Try yours here: ${url}`;
    if (navigator.share) await navigator.share({ title: "World Cup 2026 Simulator", text });
    else await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className={creator ? "app creator" : "app"}>
      {champion && <div className="confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>}
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker"><Sparkles size={16} /> World Cup 2026 Studio</p>
          <h1>Build Your Bracket Moment</h1>
          <p className="lede">Reveal groups, send qualifiers into a cinematic knockout path, and crown a champion with broadcast-style suspense.</p>
          <div className="mode-switch" aria-label="Simulator mode">
            <button className={mode === "simulation" ? "active" : ""} onClick={() => { setMode("simulation"); setManualPicks({}); }}>Simulation</button>
            <button className={mode === "manual" ? "active" : ""} onClick={() => { setMode("manual"); setRevealedMatches({}); setSuspenseId(undefined); }}>Manual Picks</button>
          </div>
        </div>
        <div className="hero-panel">
          <div className="trophy-orbit"><Trophy size={70} /></div>
          <span>Champion</span>
          <strong>{champion || "Awaiting Final"}</strong>
          {thirdPlaceWinner && <em>Third place: {flags[thirdPlaceWinner]} {thirdPlaceWinner}</em>}
        </div>
        <div className="controls">
          <button onClick={() => resetTournament(seed + 1)}><Shuffle size={18} /> New Draw</button>
          <button onClick={() => resetTournament(7)}><RotateCcw size={18} /> Reset</button>
          <button onClick={share}><Share2 size={18} /> Share My Result</button>
          <button onClick={() => setCreator(!creator)}>{creator ? <Minimize2 size={18} /> : <Maximize2 size={18} />} Creator Mode</button>
        </div>
        {copied && <p className="toast">Result copied for sharing.</p>}
      </section>

      <section className="reveal-stage">
        <div className="stage-header">
          <div>
            <p className="kicker"><Users size={16} /> Group Stage Reveal Mode</p>
            <h2>{currentGroup ? `Reveal Group ${currentGroup.id}` : "All Groups Revealed"}</h2>
          </div>
          <button className="big-action" onClick={revealNextGroup} disabled={!currentGroup}>
            {currentGroup ? `Reveal Group ${currentGroup.id}` : "Knockouts Ready"}
          </button>
        </div>
        <div className="group-filmstrip">
          {result.tables.map((table, index) => {
            const revealed = index < revealedGroups;
            return (
              <article className={revealed ? "group-card revealed" : "group-card locked"} key={table.group}>
                <div className="group-title">
                  <b>Group {table.group}</b>
                  <span>{revealed ? "Final table" : "Locked"}</span>
                </div>
                {revealed ? table.standings.map((team, place) => {
                  const thirdQualified = place === 2 && result.bestThirds.some((third) => third.name === team.name);
                  return (
                    <div className={place < 2 ? "standing qualified" : thirdQualified ? "standing third-qualified" : "standing"} key={team.name}>
                      <span>{place + 1}</span>
                      <TeamMark team={team.name} />
                      <em>{team.points} pts</em>
                    </div>
                  );
                }) : groups[index].teams.map((team) => (
                  <div className="standing ghost" key={team.name}>
                    <span>{team.flag}</span>
                    <b>{team.name}</b>
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      </section>

      <section className="qualified-lane">
        <p className="kicker"><Zap size={16} /> Qualified Teams</p>
        <div>
          {allGroupsRevealed ? result.tables.flatMap((table) => table.standings.slice(0, 2)).concat(result.bestThirds).map((team) => (
            <span key={`${team.group}-${team.name}`}><span>{team.flag}</span>{team.name}<em>{team.group}</em></span>
          )) : <strong>Reveal all groups to fill the Round of 32 bracket.</strong>}
        </div>
      </section>

      <section className="bracket-hero">
        <div>
          <p className="kicker"><Crown size={16} /> Knockout Suspense Mode</p>
          <h2>{mode === "manual" ? "Tap a team to advance them" : "Simulate each match and watch winners move"}</h2>
        </div>
        <div className="final-spot">
          <Trophy size={42} />
          <span>M104 Final</span>
          <b>{champion || "Champion path"}</b>
        </div>
      </section>

      <section className="cinema-bracket" aria-label="World Cup knockout bracket">
        <div className="branch branch-left">
          <div className="branch-column r32-column">
            <h3>Round of 32</h3>
            {roundOf32.slice(0, 8).map((match) => (
              <MatchCard key={match.id} match={match} mode={mode} suspenseId={suspenseId} allGroupsRevealed={allGroupsRevealed} onSimulate={simulateMatch} onPick={pickWinner} />
            ))}
          </div>
          <div className="branch-column r16-column">
            <h3>Round of 16</h3>
            {roundOf16.slice(0, 4).map((match) => (
              <MatchCard key={match.id} match={match} mode={mode} suspenseId={suspenseId} allGroupsRevealed={allGroupsRevealed} onSimulate={simulateMatch} onPick={pickWinner} />
            ))}
          </div>
          <div className="branch-column qf-column">
            <h3>Quarterfinals</h3>
            {quarterfinals.slice(0, 2).map((match) => (
              <MatchCard key={match.id} match={match} mode={mode} suspenseId={suspenseId} allGroupsRevealed={allGroupsRevealed} onSimulate={simulateMatch} onPick={pickWinner} />
            ))}
          </div>
          <div className="branch-column sf-column">
            <h3>Semifinal</h3>
            {semifinals.slice(0, 1).map((match) => (
              <MatchCard key={match.id} match={match} mode={mode} suspenseId={suspenseId} allGroupsRevealed={allGroupsRevealed} onSimulate={simulateMatch} onPick={pickWinner} />
            ))}
          </div>
        </div>

        <div className="center-lane">
          <div className="world-cup-silhouette">
            <Trophy size={82} />
            <span>FIFA</span>
          </div>
          <div className="center-match final-center">
            <p>Final</p>
            <MatchCard match={finalMatch} mode={mode} suspenseId={suspenseId} allGroupsRevealed={allGroupsRevealed} onSimulate={simulateMatch} onPick={pickWinner} />
          </div>
          <div className="center-match third-center">
            <p>3rd Place Match</p>
            <MatchCard match={thirdPlaceMatch} mode={mode} suspenseId={suspenseId} allGroupsRevealed={allGroupsRevealed} onSimulate={simulateMatch} onPick={pickWinner} />
          </div>
        </div>

        <div className="branch branch-right">
          <div className="branch-column sf-column">
            <h3>Semifinal</h3>
            {semifinals.slice(1, 2).map((match) => (
              <MatchCard key={match.id} match={match} mode={mode} suspenseId={suspenseId} allGroupsRevealed={allGroupsRevealed} onSimulate={simulateMatch} onPick={pickWinner} />
            ))}
          </div>
          <div className="branch-column qf-column">
            <h3>Quarterfinals</h3>
            {quarterfinals.slice(2, 4).map((match) => (
              <MatchCard key={match.id} match={match} mode={mode} suspenseId={suspenseId} allGroupsRevealed={allGroupsRevealed} onSimulate={simulateMatch} onPick={pickWinner} />
            ))}
          </div>
          <div className="branch-column r16-column">
            <h3>Round of 16</h3>
            {roundOf16.slice(4, 8).map((match) => (
              <MatchCard key={match.id} match={match} mode={mode} suspenseId={suspenseId} allGroupsRevealed={allGroupsRevealed} onSimulate={simulateMatch} onPick={pickWinner} />
            ))}
          </div>
          <div className="branch-column r32-column">
            <h3>Round of 32</h3>
            {roundOf32.slice(8, 16).map((match) => (
              <MatchCard key={match.id} match={match} mode={mode} suspenseId={suspenseId} allGroupsRevealed={allGroupsRevealed} onSimulate={simulateMatch} onPick={pickWinner} />
            ))}
          </div>
        </div>
      </section>

      <section className="mobile-bracket" aria-label="Mobile World Cup knockout bracket">
        {rounds.map((round) => (
          <div className="round" key={round.name}>
            <h3>{round.name}</h3>
            <div className="round-stack">
              {round.matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  mode={mode}
                  suspenseId={suspenseId}
                  allGroupsRevealed={allGroupsRevealed}
                  onSimulate={simulateMatch}
                  onPick={pickWinner}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

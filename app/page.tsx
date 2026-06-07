"use client";

import { Maximize2, Minimize2, RotateCcw, Share2, Shuffle, Trophy, Tv } from "lucide-react";
import { useMemo, useState } from "react";

type Team = { name: string; rating: number; group: string };
type Group = { id: string; teams: Team[] };
type Standing = Team & { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number };
type Match = { id: number; home: string; away: string; homeSource: string; awaySource: string; hs: number; as: number; winner: string; label: string };
type Slot = { source: string; team: string };

const groups: Group[] = [
  { id: "A", teams: [["Mexico", 82], ["South Africa", 75], ["South Korea", 80], ["Czechia", 79]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "A" })) },
  { id: "B", teams: [["Canada", 79], ["Bosnia and Herzegovina", 78], ["Qatar", 76], ["Switzerland", 83]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "B" })) },
  { id: "C", teams: [["Brazil", 90], ["Morocco", 84], ["Haiti", 70], ["Scotland", 79]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "C" })) },
  { id: "D", teams: [["United States", 81], ["Paraguay", 78], ["Türkiye", 80], ["Australia", 77]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "D" })) },
  { id: "E", teams: [["Germany", 87], ["Curaçao", 70], ["Ecuador", 82], ["Ivory Coast", 80]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "E" })) },
  { id: "F", teams: [["Netherlands", 88], ["Japan", 83], ["Sweden", 81], ["Tunisia", 77]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "F" })) },
  { id: "G", teams: [["Belgium", 86], ["Egypt", 81], ["Iran", 78], ["New Zealand", 72]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "G" })) },
  { id: "H", teams: [["Spain", 91], ["Saudi Arabia", 76], ["Uruguay", 86], ["Cape Verde", 72]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "H" })) },
  { id: "I", teams: [["France", 91], ["Senegal", 82], ["Norway", 83], ["Iraq", 74]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "I" })) },
  { id: "J", teams: [["Argentina", 91], ["Algeria", 80], ["Austria", 82], ["Jordan", 71]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "J" })) },
  { id: "K", teams: [["Portugal", 89], ["DR Congo", 76], ["Uzbekistan", 74], ["Colombia", 84]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "K" })) },
  { id: "L", teams: [["England", 89], ["Ghana", 78], ["Croatia", 84], ["Panama", 73]].map(([name, rating]) => ({ name: name as string, rating: rating as number, group: "L" })) }
];

// Round of 32 pairings follow the official FIFA knockout structure.
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
  const hs = goals(home.rating, away.rating, rng);
  const as = goals(away.rating, home.rating, rng);
  return { hs, as };
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
    .map((code) => ({
      code,
      candidates: code.slice(1).split("").filter((group) => thirdGroups.has(group))
    }))
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
      return `${home.name} ${hs}-${as} ${away.name}`;
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
  const chooseThird = (code: string) => {
    const picked = thirdAssignments.get(code)!;
    return { source: `3${picked.group}`, team: picked.name };
  };
  const resolve = (code: string) => code.startsWith("3") && code.length > 2 ? chooseThird(code) : slots.get(code)!;

  const matches = new Map<number, Match>();
  fixedR32.forEach(([id, a, b]) => matches.set(id, knockout(resolve(a), resolve(b), teams, id, rng)));
  nextRounds.forEach(([id, a, b]) => {
    const semiPairing = id === 103;
    const home = { source: `${semiPairing ? "L" : "W"}${a}`, team: semiPairing ? loser(matches.get(a)!) : matches.get(a)!.winner };
    const away = { source: `${semiPairing ? "L" : "W"}${b}`, team: semiPairing ? loser(matches.get(b)!) : matches.get(b)!.winner };
    matches.set(id, knockout(home, away, teams, id, rng));
  });

  return { tables, bestThirds, matches: [...matches.values()].sort((a, b) => a.id - b.id), champion: matches.get(104)!.winner };
}

export default function Home() {
  const [seed, setSeed] = useState(1);
  const [creator, setCreator] = useState(false);
  const result = useMemo(() => simulate(seed), [seed]);
  const rounds = [
    ["Round of 32", result.matches.slice(0, 16)],
    ["Round of 16", result.matches.slice(16, 24)],
    ["Quarterfinals", result.matches.slice(24, 28)],
    ["Semifinals", result.matches.slice(28, 30)],
    ["Third Place Match", result.matches.slice(30, 31)],
    ["Final", result.matches.slice(31, 32)]
  ] as const;

  async function share() {
    const text = `My World Cup 2026 simulator champion: ${result.champion}.`;
    if (navigator.share) await navigator.share({ title: "World Cup 2026 Simulator", text });
    else await navigator.clipboard.writeText(text);
  }

  return (
    <main className={creator ? "app creator" : "app"}>
      <section className="hero">
        <div>
          <p className="kicker"><Tv size={16} /> Live simulator desk</p>
          <h1>World Cup 2026 Simulator</h1>
          <p className="lede">Official A-L groups, top two plus the eight best third-place teams, and the FIFA Round of 32 route through to a champion reveal.</p>
        </div>
        <div className="controls">
          <button onClick={() => setSeed(seed + 1)}><Shuffle size={18} /> Simulate</button>
          <button onClick={() => setSeed(1)}><RotateCcw size={18} /> Reset</button>
          <button onClick={share}><Share2 size={18} /> Share</button>
          <button onClick={() => setCreator(!creator)}>{creator ? <Minimize2 size={18} /> : <Maximize2 size={18} />} Creator</button>
        </div>
      </section>

      <section className="champion">
        <Trophy size={44} />
        <div>
          <span>Champion Reveal</span>
          <strong>{result.champion}</strong>
        </div>
      </section>

      <section className="grid groups">
        {result.tables.map((table) => (
          <article className="panel" key={table.group}>
            <header><b>Group {table.group}</b><span>Pts GD GF</span></header>
            {table.standings.map((team, index) => (
              <div className={index < 2 ? "row qualified" : result.bestThirds.some((t) => t.name === team.name) ? "row third" : "row"} key={team.name}>
                <span>{index + 1}. {team.name}</span>
                <em>{team.points} {team.gd >= 0 ? "+" : ""}{team.gd} {team.gf}</em>
              </div>
            ))}
            <details>
              <summary>Match log</summary>
              {table.matches.map((match) => <small key={match}>{match}</small>)}
            </details>
          </article>
        ))}
      </section>

      <section className="thirds">
        <h2>Best Third-Place Teams</h2>
        <div>{result.bestThirds.map((t) => <span key={t.name}>{t.group}: {t.name}</span>)}</div>
      </section>

      <section className="bracket-head">
        <p className="kicker">Interactive Knockout Bracket</p>
        <h2>Simulated Path To The Trophy</h2>
      </section>

      <section className="bracket">
        {rounds.map(([name, matches]) => (
          <div className="round" key={name}>
            <h2>{name}</h2>
            {matches.map((m) => (
              <article className="match" key={m.id}>
                <b>M{m.id}</b>
                <p className={m.winner === m.home ? "win" : ""}><small>{m.homeSource}</small>{m.home}<span>{m.hs}</span></p>
                <p className={m.winner === m.away ? "win" : ""}><small>{m.awaySource}</small>{m.away}<span>{m.as}</span></p>
              </article>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}

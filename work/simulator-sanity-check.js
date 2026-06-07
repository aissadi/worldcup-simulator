const groups = [
  ["A", ["Mexico", "South Africa", "South Korea", "Czechia"]],
  ["B", ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"]],
  ["C", ["Brazil", "Morocco", "Haiti", "Scotland"]],
  ["D", ["United States", "Paraguay", "Türkiye", "Australia"]],
  ["E", ["Germany", "Curaçao", "Ecuador", "Ivory Coast"]],
  ["F", ["Netherlands", "Japan", "Sweden", "Tunisia"]],
  ["G", ["Belgium", "Egypt", "Iran", "New Zealand"]],
  ["H", ["Spain", "Saudi Arabia", "Uruguay", "Cape Verde"]],
  ["I", ["France", "Senegal", "Norway", "Iraq"]],
  ["J", ["Argentina", "Algeria", "Austria", "Jordan"]],
  ["K", ["Portugal", "DR Congo", "Uzbekistan", "Colombia"]],
  ["L", ["England", "Ghana", "Croatia", "Panama"]]
];

const fixedR32 = [
  [73, "2A", "2B"], [74, "1C", "2F"], [75, "1E", "3ABCDF"], [76, "1F", "2C"],
  [77, "2E", "2I"], [78, "1I", "3CDFGH"], [79, "1A", "3CEFHI"], [80, "1L", "3EHIJK"],
  [81, "1D", "3BEFIJ"], [82, "1G", "3AEHIJ"], [83, "2K", "2L"], [84, "1H", "2J"],
  [85, "1B", "3EFGIJ"], [86, "1J", "2H"], [87, "1K", "3DEIJL"], [88, "2D", "2G"]
];

const nextRounds = [
  [89, 73, 75], [90, 74, 77], [91, 76, 78], [92, 79, 80],
  [93, 83, 84], [94, 81, 82], [95, 86, 88], [96, 85, 87],
  [97, 89, 90], [98, 93, 94], [99, 91, 92], [100, 95, 96],
  [101, 97, 98], [102, 99, 100], [103, 101, 102], [104, 101, 102]
];

const groupIds = new Set(groups.map(([id]) => id));
const allTeams = groups.flatMap(([, teams]) => teams);
const thirdSlots = fixedR32.flatMap(([, a, b]) => [a, b]).filter((slot) => slot.startsWith("3"));
const fixedSlots = fixedR32.flatMap(([, a, b]) => [a, b]).filter((slot) => !slot.startsWith("3"));

if (groups.length !== 12) throw new Error("Expected 12 groups");
if (allTeams.length !== 48 || new Set(allTeams).size !== 48) throw new Error("Expected 48 unique teams");
if (fixedR32.length !== 16) throw new Error("Expected 16 Round of 32 matches");
if (thirdSlots.length !== 8) throw new Error("Expected 8 third-place Round of 32 slots");
if (fixedSlots.length !== 24) throw new Error("Expected 24 automatic qualifier Round of 32 slots");
if (nextRounds.length !== 16) throw new Error("Expected 16 knockout progression matches including third-place match and final");
for (const slot of fixedSlots) {
  if (!["1", "2"].includes(slot[0]) || !groupIds.has(slot[1])) throw new Error(`Invalid fixed slot ${slot}`);
}
for (const slot of thirdSlots) {
  for (const group of slot.slice(1)) {
    if (!groupIds.has(group)) throw new Error(`Invalid third-place group in ${slot}`);
  }
}

console.log("Simulator sanity check passed: 48 teams, 32 qualifiers, 16 R32 matches, full knockout path.");

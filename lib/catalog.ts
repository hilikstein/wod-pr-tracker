export type MovementGroup = "benchmark" | "lift";
export type ScoreKind = "time" | "reps" | "rounds_reps" | "weight" | "points";
export type Better = "lower" | "higher";

export type Movement = {
  id: string;
  group: MovementGroup;
  family?: "girls" | "heroes" | "classic";
  name: string;
  aliases: string[];
  scoreKind: ScoreKind;
  better: Better;
  prescription: string;
  liftReps: number[];
};

const girls: Movement[] = [
  { id: "angie", group: "benchmark", family: "girls", name: "Angie", aliases: [], scoreKind: "time", better: "lower", prescription: "For time\n100 pull-ups\n100 push-ups\n100 sit-ups\n100 squats", liftReps: [] },
  { id: "barbara", group: "benchmark", family: "girls", name: "Barbara", aliases: [], scoreKind: "time", better: "lower", prescription: "5 rounds for time\n20 pull-ups\n30 push-ups\n40 sit-ups\n50 squats\nRest 3 minutes between rounds", liftReps: [] },
  { id: "chelsea", group: "benchmark", family: "girls", name: "Chelsea", aliases: [], scoreKind: "rounds_reps", better: "higher", prescription: "EMOM 30 minutes\n5 pull-ups\n10 push-ups\n15 squats\nScore rounds completed", liftReps: [] },
  { id: "diane", group: "benchmark", family: "girls", name: "Diane", aliases: [], scoreKind: "time", better: "lower", prescription: "21-15-9 reps for time\nDeadlift 225/155 lb\nHandstand push-ups", liftReps: [] },
  { id: "elizabeth", group: "benchmark", family: "girls", name: "Elizabeth", aliases: [], scoreKind: "time", better: "lower", prescription: "21-15-9 reps for time\nClean 135/95 lb\nRing dips", liftReps: [] },
  { id: "fran", group: "benchmark", family: "girls", name: "Fran", aliases: [], scoreKind: "time", better: "lower", prescription: "21-15-9 reps for time\nThrusters 95/65 lb\nPull-ups", liftReps: [] },
  { id: "grace", group: "benchmark", family: "girls", name: "Grace", aliases: [], scoreKind: "time", better: "lower", prescription: "For time\n30 clean and jerks 135/95 lb", liftReps: [] },
  { id: "helen", group: "benchmark", family: "girls", name: "Helen", aliases: [], scoreKind: "time", better: "lower", prescription: "3 rounds for time\n400 m run\n21 kettlebell swings 24/16 kg (53/35 lb)\n12 pull-ups", liftReps: [] },
  { id: "isabel", group: "benchmark", family: "girls", name: "Isabel", aliases: [], scoreKind: "time", better: "lower", prescription: "For time\n30 snatches 135/95 lb", liftReps: [] },
  { id: "jackie", group: "benchmark", family: "girls", name: "Jackie", aliases: [], scoreKind: "time", better: "lower", prescription: "For time\n1,000 m row\n50 thrusters 45/35 lb\n30 pull-ups", liftReps: [] },
  { id: "karen", group: "benchmark", family: "girls", name: "Karen", aliases: [], scoreKind: "time", better: "lower", prescription: "For time\n150 wall-ball shots 20/14 lb to 10/9 ft", liftReps: [] },
  { id: "linda", group: "benchmark", family: "girls", name: "Linda", aliases: ["three bars of death"], scoreKind: "time", better: "lower", prescription: "10-9-8-7-6-5-4-3-2-1 reps for time\nDeadlift 1.5 × bodyweight\nBench press 1 × bodyweight\nClean 0.75 × bodyweight", liftReps: [] },
  { id: "mary", group: "benchmark", family: "girls", name: "Mary", aliases: [], scoreKind: "rounds_reps", better: "higher", prescription: "20-minute AMRAP\n5 handstand push-ups\n10 pistols\n15 pull-ups", liftReps: [] },
  { id: "nancy", group: "benchmark", family: "girls", name: "Nancy", aliases: [], scoreKind: "time", better: "lower", prescription: "5 rounds for time\n400 m run\n15 overhead squats 95/65 lb", liftReps: [] },
  { id: "annie", group: "benchmark", family: "girls", name: "Annie", aliases: [], scoreKind: "time", better: "lower", prescription: "50-40-30-20-10 reps for time\nDouble-unders\nSit-ups", liftReps: [] },
  { id: "eva", group: "benchmark", family: "girls", name: "Eva", aliases: [], scoreKind: "time", better: "lower", prescription: "5 rounds for time\n800 m run\n30 kettlebell swings 32/24 kg (70/53 lb)\n30 pull-ups", liftReps: [] },
  { id: "kelly", group: "benchmark", family: "girls", name: "Kelly", aliases: [], scoreKind: "time", better: "lower", prescription: "5 rounds for time\n400 m run\n30 box jumps 24/20 in\n30 wall-ball shots 20/14 lb", liftReps: [] },
  { id: "lynne", group: "benchmark", family: "girls", name: "Lynne", aliases: [], scoreKind: "reps", better: "higher", prescription: "5 rounds for max reps\nBodyweight bench press\nPull-ups\nScore total reps", liftReps: [] },
  { id: "nicole", group: "benchmark", family: "girls", name: "Nicole", aliases: [], scoreKind: "reps", better: "higher", prescription: "20-minute AMRAP\n400 m run\nMax-rep pull-ups\nScore total pull-ups", liftReps: [] },
  { id: "amanda", group: "benchmark", family: "girls", name: "Amanda", aliases: [], scoreKind: "time", better: "lower", prescription: "9-7-5 reps for time\nMuscle-ups\nSquat snatches 135/95 lb", liftReps: [] },
];

const heroes: Movement[] = [
  { id: "murph", group: "benchmark", family: "heroes", name: "Murph", aliases: ["body armor"], scoreKind: "time", better: "lower", prescription: "For time\n1 mile run\n100 pull-ups\n200 push-ups\n300 squats\n1 mile run\nRx: 20/14 lb vest", liftReps: [] },
  { id: "cindy", group: "benchmark", family: "classic", name: "Cindy", aliases: [], scoreKind: "rounds_reps", better: "higher", prescription: "20-minute AMRAP\n5 pull-ups\n10 push-ups\n15 squats", liftReps: [] },
  { id: "dt", group: "benchmark", family: "heroes", name: "DT", aliases: [], scoreKind: "time", better: "lower", prescription: "5 rounds for time\n12 deadlifts\n9 hang power cleans\n6 push jerks\n155/105 lb", liftReps: [] },
  { id: "randy", group: "benchmark", family: "heroes", name: "Randy", aliases: [], scoreKind: "time", better: "lower", prescription: "For time\n75 power snatches 75/55 lb", liftReps: [] },
  { id: "jt", group: "benchmark", family: "heroes", name: "JT", aliases: ["j.t."], scoreKind: "time", better: "lower", prescription: "21-15-9 reps for time\nHandstand push-ups\nRing dips\nPush-ups", liftReps: [] },
  { id: "nate", group: "benchmark", family: "heroes", name: "Nate", aliases: [], scoreKind: "rounds_reps", better: "higher", prescription: "20-minute AMRAP\n2 muscle-ups\n4 handstand push-ups\n8 kettlebell swings 32/24 kg (70/53 lb)", liftReps: [] },
  { id: "the-chief", group: "benchmark", family: "classic", name: "The Chief", aliases: ["chief"], scoreKind: "rounds_reps", better: "higher", prescription: "5 cycles\n3-minute AMRAP: 3 power cleans 135/95 lb, 6 push-ups, 9 squats\nRest 1 minute between cycles\nScore total rounds + reps", liftReps: [] },
  { id: "fight-gone-bad", group: "benchmark", family: "classic", name: "Fight Gone Bad", aliases: ["fgb"], scoreKind: "points", better: "higher", prescription: "3 rounds for points\n1 minute each: wall-ball 20/14 lb, sumo deadlift high pull 75/55 lb, box jump 20 in, push press 75/55 lb, calorie row\n1 minute rest between rounds", liftReps: [] },
  { id: "filthy-fifty", group: "benchmark", family: "classic", name: "Filthy Fifty", aliases: ["filthy 50"], scoreKind: "time", better: "lower", prescription: "For time, 50 reps of each\nBox jumps 24/20 in\nJumping pull-ups\nKettlebell swings 16/12 kg\nWalking lunges\nKnees-to-elbows\nPush press 45/35 lb\nBack extensions\nWall-ball shots 20/14 lb\nBurpees\nDouble-unders", liftReps: [] },
  { id: "three-lift-total", group: "benchmark", family: "classic", name: "Three-lift total", aliases: ["total", "big three"], scoreKind: "weight", better: "higher", prescription: "Sum of three 1RMs\nBack squat\nShoulder press\nDeadlift", liftReps: [] },
];

const liftNames: Array<[string, string, string[]]> = [
  ["back-squat", "Back squat", ["bs"]],
  ["front-squat", "Front squat", ["fs"]],
  ["overhead-squat", "Overhead squat", ["ohs"]],
  ["deadlift", "Deadlift", ["dl"]],
  ["sumo-deadlift", "Sumo deadlift", ["sdl"]],
  ["bench-press", "Bench press", ["bp"]],
  ["strict-press", "Strict press", ["shoulder press", "press", "sp"]],
  ["push-press", "Push press", ["pp"]],
  ["push-jerk", "Push jerk", ["pj"]],
  ["split-jerk", "Split jerk", ["sj"]],
  ["clean", "Clean", []],
  ["power-clean", "Power clean", ["pc"]],
  ["hang-clean", "Hang clean", ["hc"]],
  ["clean-and-jerk", "Clean & jerk", ["c&j", "clean jerk"]],
  ["snatch", "Snatch", []],
  ["power-snatch", "Power snatch", ["ps"]],
  ["hang-snatch", "Hang snatch", ["hs"]],
  ["thruster", "Thruster", []],
  ["cluster", "Cluster", ["squat clean thruster"]],
  ["weighted-pull-up", "Weighted pull-up", ["weighted pullup", "wpu"]],
  ["weighted-dip", "Weighted dip", ["wdip"]],
];

const lifts: Movement[] = liftNames.map(([id, name, aliases]) => ({
  id,
  group: "lift" as const,
  name,
  aliases,
  scoreKind: "weight" as const,
  better: "higher" as const,
  prescription: "Record the best successful set in kilograms. Track 1RM, 3RM and 5RM.",
  liftReps: [1, 3, 5],
}));

export const CATALOG: Movement[] = [...girls, ...heroes, ...lifts];
export const MOVEMENTS_BY_ID = new Map(CATALOG.map((m) => [m.id, m]));

export function movement(id: string): Movement | undefined {
  return MOVEMENTS_BY_ID.get(id);
}

export function searchMovements(group: MovementGroup | "all", query: string): Movement[] {
  const q = normalize(query);
  return CATALOG.filter((m) => group === "all" || m.group === group)
    .filter((m) => !q || [m.name, m.id, ...m.aliases].some((s) => normalize(s).includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalize(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

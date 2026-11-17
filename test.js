const assert = require("assert");

// Mock localStorage for Node.js
global.localStorage = {
  _data: {},
  getItem(key) {
    return this._data[key] || null;
  },
  setItem(key, value) {
    this._data[key] = value;
  },
  clear() {
    this._data = {};
  },
};

// Mock document for Node.js
global.document = {
  getElementById: () => ({ textContent: "", innerHTML: "" }),
  createElement: () => ({ className: "", classList: { add: () => {} } }),
  addEventListener: () => {},
};

// Mock navigator for Node.js
global.navigator = {};

// Mock PocketBase data layer (plan lives in PocketBase, not in code)
const VARIANTS = {
  v_std: {
    id: "v_std",
    name: "Tydzień standardowy",
    monday: [{ id: "solve3bld", text: "3BLD", detail: "10 prób" }],
    tuesday: [
      { id: "speed_memo", text: "Speed memo" },
      { id: "solve3bld_extra", text: "3BLD extra" },
    ],
    wednesday: [{ id: "solve3bld", text: "3BLD" }],
    thursday: [{ id: "4bld", text: "4BLD", detail: "3 próby" }],
    friday: [{ id: "rest", text: "Odpoczynek" }],
    saturday: [{ id: "solve3bld", text: "3BLD" }],
    sunday: [{ id: "solve3bld", text: "3BLD" }],
  },
  v_big: {
    id: "v_big",
    name: "Nacisk na 4/5BLD",
    monday: [{ id: "solve3bld", text: "3BLD", detail: "20–25 prób" }],
    wednesday: [{ id: "wed_5bld", text: "5BLD" }],
    thursday: [{ id: "4bld", text: "4BLD" }],
  },
};
const SCHEDULE = {
  "2026-06-29": { week_start: "2026-06-29", variant: "v_std" },
  "2026-07-06": { week_start: "2026-07-06", variant: "v_std" },
  "2026-07-13": { week_start: "2026-07-13", variant: "v_big" },
};
const OVERRIDES = {
  "2026-07-18": { date: "2026-07-18", new_tasks: "rest", reason: "wyjazd" },
};
global.pbGetSchedule = (week) => SCHEDULE[week] || null;
global.pbGetVariantById = (id) => VARIANTS[id] || null;
global.pbGetOverride = (date) => OVERRIDES[date] || null;
global.pbGetProgressDates = () => ["2026-07-03", "2026-07-01", "2026-07-02"];
global.pbGetScheduleWeeks = () => Object.keys(SCHEDULE);

const {
  formatDateKey,
  getTasksForDay,
  getTasksForDate,
  getWeekVariant,
  isDayComplete,
  calculateStreak,
  setTestToday,
  getWeekOfProgram,
  getWeekStart,
  updateStartDate,
} = require("./app.js");

updateStartDate(); // earliest progress date → 1 lipca 2026

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  ${e.message}`);
    failed++;
  }
}

// formatDateKey tests
test("formatDateKey: formats date correctly", () => {
  const date = new Date(2026, 6, 15); // 15 lipca 2026
  assert.strictEqual(formatDateKey(date), "2026-07-15");
});

test("formatDateKey: pads single digit month and day", () => {
  const date = new Date(2026, 0, 5); // 5 stycznia 2026
  assert.strictEqual(formatDateKey(date), "2026-01-05");
});

// getTasksForDay tests
test("getTasksForDay: returns monday tasks from scheduled variant", () => {
  const tasks = getTasksForDay(new Date(2026, 6, 6));
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].id, "solve3bld");
});

test("getTasksForDay: returns tuesday tasks in order", () => {
  const tasks = getTasksForDay(new Date(2026, 6, 7));
  assert.deepStrictEqual(tasks.map((t) => t.id), ["speed_memo", "solve3bld_extra"]);
});

test("getTasksForDay: returns empty list for day missing in variant", () => {
  const tasks = getTasksForDay(new Date(2026, 6, 14)); // wtorek w v_big
  assert.strictEqual(tasks.length, 0);
});

test("getTasksForDay: returns empty list for unscheduled week", () => {
  const tasks = getTasksForDay(new Date(2026, 8, 7)); // 7 września — brak harmonogramu
  assert.strictEqual(tasks.length, 0);
});

// getWeekVariant tests
test("getWeekVariant: returns scheduled variant", () => {
  assert.strictEqual(getWeekVariant(new Date(2026, 6, 15)).name, "Nacisk na 4/5BLD");
});

test("getWeekVariant: returns empty object when week not scheduled", () => {
  assert.deepStrictEqual(getWeekVariant(new Date(2026, 8, 7)), {});
});

// getTasksForDate (overrides)
test("getTasksForDate: override 'rest' replaces variant tasks", () => {
  const tasks = getTasksForDate(new Date(2026, 6, 18));
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].id, "rest");
  assert.strictEqual(tasks[0].detail, "wyjazd");
});

test("getTasksForDate: no override → variant tasks", () => {
  const tasks = getTasksForDate(new Date(2026, 6, 13));
  assert.strictEqual(tasks[0].detail, "20–25 prób");
});

// isDayComplete tests
test("isDayComplete: returns full=false, partial=false for empty day", () => {
  localStorage.clear();
  const status = isDayComplete(new Date(2026, 6, 6));
  assert.strictEqual(status.full, false);
  assert.strictEqual(status.partial, false);
});

test("isDayComplete: returns full=true when all tasks done", () => {
  localStorage.clear();
  localStorage.setItem("day:2026-07-06", JSON.stringify({ solve3bld: true }));
  const status = isDayComplete(new Date(2026, 6, 6));
  assert.strictEqual(status.full, true);
  assert.strictEqual(status.partial, false);
});

test("isDayComplete: returns partial=true when some tasks done", () => {
  localStorage.clear();
  localStorage.setItem(
    "day:2026-07-07",
    JSON.stringify({ speed_memo: true, solve3bld_extra: false })
  );
  const status = isDayComplete(new Date(2026, 6, 7));
  assert.strictEqual(status.full, false);
  assert.strictEqual(status.partial, true);
});

// calculateStreak tests
test("calculateStreak: counts back to program start", () => {
  localStorage.clear();
  setTestToday(new Date(2026, 6, 5)); // "dziś" 5 lipca, start 1 lipca
  localStorage.setItem("day:2026-07-01", JSON.stringify({ solve3bld: true }));
  localStorage.setItem("day:2026-07-02", JSON.stringify({ "4bld": true }));
  localStorage.setItem("day:2026-07-03", JSON.stringify({ rest: true }));
  localStorage.setItem("day:2026-07-04", JSON.stringify({ solve3bld: true }));
  localStorage.setItem("day:2026-07-05", JSON.stringify({ solve3bld: true }));
  assert.strictEqual(calculateStreak(), 5);
  setTestToday(null);
});

test("calculateStreak: returns 0 when today not completed", () => {
  localStorage.clear();
  setTestToday(new Date(2026, 6, 3));
  assert.strictEqual(calculateStreak(), 0);
  setTestToday(null);
});

// getWeekOfProgram tests
test("getWeekOfProgram: returns 0 for first week", () => {
  assert.strictEqual(getWeekOfProgram(new Date(2026, 6, 3)), 0);
});

test("getWeekOfProgram: returns 1 for second week", () => {
  assert.strictEqual(getWeekOfProgram(new Date(2026, 6, 10)), 1);
});

// getWeekStart tests
test("getWeekStart: returns Monday for any day in week", () => {
  const weekStart = getWeekStart(new Date(2026, 6, 8));
  assert.strictEqual(weekStart.getDay(), 1);
  assert.strictEqual(weekStart.getDate(), 6);
});

test("getWeekStart: returns same Monday when input is Monday", () => {
  assert.strictEqual(getWeekStart(new Date(2026, 6, 6)).getDate(), 6);
});

test("getWeekStart: handles Sunday correctly (returns previous Monday)", () => {
  const weekStart = getWeekStart(new Date(2026, 6, 12));
  assert.strictEqual(weekStart.getDay(), 1);
  assert.strictEqual(weekStart.getDate(), 6);
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

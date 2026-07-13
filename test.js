const assert = require("assert");

// Load PLAN first (app.js depends on it being global)
global.PLAN = require("./plan.js");

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

const {
  formatDateKey,
  expandDayTasks,
  getTasksForDay,
  getTasksForDate,
  getWeekVariant,
  isDayComplete,
  calculateStreak,
  setTestToday,
  getWeekOfProgram,
  getWeekStart,
} = require("./app.js");

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

// expandDayTasks tests
test("expandDayTasks: expands 4bld_ramp with count", () => {
  const dayTasks = [
    { type: "4bld_ramp", idPrefix: "p4", text: "4BLD próba", count: 2 },
  ];
  const tasks = expandDayTasks(dayTasks);
  assert.strictEqual(tasks.length, 2);
  assert.strictEqual(tasks[0].id, "p4_1");
  assert.strictEqual(tasks[1].id, "p4_2");
});

test("expandDayTasks: defaults count to 1 when not specified", () => {
  const dayTasks = [
    { type: "4bld_ramp", idPrefix: "p4", text: "4BLD próba" },
  ];
  const tasks = expandDayTasks(dayTasks);
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].id, "p4_1");
});

test("expandDayTasks: passes through regular tasks", () => {
  const dayTasks = [
    { id: "solve3bld", text: "3BLD solvy", detail: "15 prób" },
  ];
  const tasks = expandDayTasks(dayTasks);
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].id, "solve3bld");
  assert.strictEqual(tasks[0].detail, "15 prób");
});

// getTasksForDay tests
test("getTasksForDay: returns monday tasks (focus_3bld variant)", () => {
  // 6 lipca 2026 jest w tygodniu focus_3bld wg WEEK_SCHEDULE
  const monday = new Date(2026, 6, 6);
  const tasks = getTasksForDay(monday);
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].id, "solve3bld");
});

test("getTasksForDay: returns tuesday tasks (focus_3bld variant)", () => {
  // 7 lipca 2026 jest w tygodniu focus_3bld - wtorek ma speed-memo + solve3bld_extra
  const tuesday = new Date(2026, 6, 7);
  const tasks = getTasksForDay(tuesday);
  assert.strictEqual(tasks.length, 2);
  assert.strictEqual(tasks[0].id, "speed_memo");
  assert.strictEqual(tasks[1].id, "solve3bld_extra");
});

test("getTasksForDay: expands 4bld_ramp based on count in variant", () => {
  // 2 lipca 2026 (czwartek) jest w tygodniu default - count: 4
  const thursday = new Date(2026, 6, 2);
  const tasks = getTasksForDay(thursday);
  const p4Tasks = tasks.filter((t) => t.id.startsWith("p4_"));
  assert.strictEqual(p4Tasks.length, 4);
});

test("getTasksForDay: uses variant-specific 4bld count (focus_duze thursday = 2)", () => {
  // 16 lipca 2026 (czwartek) w tygodniu focus_duze - count: 2
  const thursday = new Date(2026, 6, 16);
  const tasks = getTasksForDay(thursday);
  const p4Tasks = tasks.filter((t) => t.id.startsWith("p4_"));
  assert.strictEqual(p4Tasks.length, 2);
});

// isDayComplete tests
test("isDayComplete: returns full=false, partial=false for empty day", () => {
  localStorage.clear();
  const monday = new Date(2026, 6, 6);
  const status = isDayComplete(monday);
  assert.strictEqual(status.full, false);
  assert.strictEqual(status.partial, false);
});

test("isDayComplete: returns full=true when all tasks done", () => {
  localStorage.clear();
  // 6 lipca 2026 (poniedziałek) w focus_3bld - ma tylko solve3bld
  const monday = new Date(2026, 6, 6);
  localStorage.setItem("day:2026-07-06", JSON.stringify({
    solve3bld: true
  }));
  const status = isDayComplete(monday);
  assert.strictEqual(status.full, true);
  assert.strictEqual(status.partial, false);
});

test("isDayComplete: returns partial=true when some tasks done", () => {
  localStorage.clear();
  // 7 lipca (wtorek) w focus_3bld ma 2 taski: speed_memo + solve3bld_extra
  const tuesday = new Date(2026, 6, 7);
  localStorage.setItem(
    "day:2026-07-07",
    JSON.stringify({ speed_memo: true, solve3bld_extra: false })
  );
  const status = isDayComplete(tuesday);
  assert.strictEqual(status.full, false);
  assert.strictEqual(status.partial, true);
});

// calculateStreak tests
test("calculateStreak: includes today when completed", () => {
  localStorage.clear();
  setTestToday(new Date(2026, 6, 5)); // Mock: "dziś" to 5 lipca
  // Tydzień default (29 cze - 5 lip):
  // 1 lipca (środa): corners_warmup_wed + solve3bld
  // 2 lipca (czwartek): p4_1..p4_4 (4 próby) + thu_5bld + centers
  // 3 lipca (piątek): rest (odpoczynek)
  // 4 lipca (sobota): edges_sat + solve3bld + sat_p4_1..sat_p4_4
  // 5 lipca (niedziela): edges_sun + solve3bld + sun_p4_1..sun_p4_4 + centers_review
  localStorage.setItem("day:2026-07-01", JSON.stringify({
    corners_warmup_wed: true,
    solve3bld: true
  }));
  localStorage.setItem("day:2026-07-02", JSON.stringify({
    p4_1: true, p4_2: true, p4_3: true, p4_4: true,
    thu_5bld: true,
    centers: true
  }));
  localStorage.setItem("day:2026-07-03", JSON.stringify({ rest: true }));
  localStorage.setItem("day:2026-07-04", JSON.stringify({
    edges_sat: true,
    solve3bld: true,
    sat_p4_1: true, sat_p4_2: true, sat_p4_3: true, sat_p4_4: true
  }));
  localStorage.setItem("day:2026-07-05", JSON.stringify({
    edges_sun: true,
    solve3bld: true,
    sun_p4_1: true, sun_p4_2: true, sun_p4_3: true, sun_p4_4: true,
    centers_review: true
  }));

  // Streak powinien być 5 (1-5 lipca)
  const streak = calculateStreak();
  assert.strictEqual(streak, 5);
  setTestToday(null); // Reset mock
});

test("calculateStreak: returns 0 when today not completed", () => {
  localStorage.clear();
  setTestToday(new Date(2026, 6, 3)); // Mock: "dziś" to 3 lipca (piątek)
  // 3 lipca (piątek): rest — nieukończony
  // day:2026-07-03 brak = nieukończony

  const streak = calculateStreak();
  assert.strictEqual(streak, 0);
  setTestToday(null);
});

// getWeekOfProgram tests
test("getWeekOfProgram: returns 0 for first week", () => {
  const date = new Date(2026, 6, 3); // 3 lipca 2026
  assert.strictEqual(getWeekOfProgram(date), 0);
});

test("getWeekOfProgram: returns 1 for second week", () => {
  const date = new Date(2026, 6, 10); // 10 lipca 2026
  assert.strictEqual(getWeekOfProgram(date), 1);
});

// getWeekStart tests
test("getWeekStart: returns Monday for any day in week", () => {
  const wednesday = new Date(2026, 6, 8); // 8 lipca 2026 (środa)
  const weekStart = getWeekStart(wednesday);
  assert.strictEqual(weekStart.getDay(), 1); // Monday
  assert.strictEqual(weekStart.getDate(), 6); // 6 lipca
});

test("getWeekStart: returns same Monday when input is Monday", () => {
  const monday = new Date(2026, 6, 6); // 6 lipca 2026 (poniedziałek)
  const weekStart = getWeekStart(monday);
  assert.strictEqual(weekStart.getDate(), 6);
});

test("getWeekStart: handles Sunday correctly (returns previous Monday)", () => {
  const sunday = new Date(2026, 6, 12); // 12 lipca 2026 (niedziela)
  const weekStart = getWeekStart(sunday);
  assert.strictEqual(weekStart.getDay(), 1); // Monday
  assert.strictEqual(weekStart.getDate(), 6); // 6 lipca (poprzedni poniedziałek)
});

// getWeekVariant tests
test("getWeekVariant: returns 'default' when no entry in WEEK_SCHEDULE", () => {
  // Używamy daty spoza zdefiniowanych tygodni
  const monday = new Date(2026, 8, 7); // 7 września 2026 - brak wpisu
  assert.strictEqual(getWeekVariant(monday), "default");
});

test("getWeekVariant: returns scheduled variant from WEEK_SCHEDULE", () => {
  const originalValue = PLAN.WEEK_SCHEDULE["2026-07-13"];
  PLAN.WEEK_SCHEDULE["2026-07-13"] = "focus_3bld";
  const wednesday = new Date(2026, 6, 15); // 15 lipca (środa w tygodniu 13-19 lipca)
  assert.strictEqual(getWeekVariant(wednesday), "focus_3bld");
  PLAN.WEEK_SCHEDULE["2026-07-13"] = originalValue;
});

test("getTasksForDate: uses focus_3bld variant tasks", () => {
  const originalValue = PLAN.WEEK_SCHEDULE["2026-07-13"];
  PLAN.WEEK_SCHEDULE["2026-07-13"] = "focus_3bld";
  const monday = new Date(2026, 6, 13); // 13 lipca (poniedziałek)
  const tasks = getTasksForDate(monday);
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].id, "solve3bld");
  assert.strictEqual(tasks[0].detail, "20–25 prób");
  PLAN.WEEK_SCHEDULE["2026-07-13"] = originalValue;
});

test("getTasksForDate: uses focus_duze variant tasks", () => {
  const wednesday = new Date(2026, 6, 15); // 15 lipca (środa) - tydzień focus_duze
  const tasks = getTasksForDate(wednesday);
  const taskIds = tasks.map(t => t.id);
  assert.ok(taskIds.includes("wed_5bld"));
  assert.ok(taskIds.includes("centers_wed"));
});

test("getTasksForDate: DAY_OVERRIDES takes precedence over variant", () => {
  // 18 lipca 2026 (sobota) ma override na odpoczynek
  const saturday = new Date(2026, 6, 18);
  const tasks = getTasksForDate(saturday);
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].id, "rest");
  assert.ok(tasks[0].detail.includes("jednorazowa"));
});

test("getTasksForDate: returns normal tasks when no override", () => {
  // 19 lipca 2026 (niedziela) - brak override, normalne zadania z focus_duze
  const sunday = new Date(2026, 6, 19);
  const tasks = getTasksForDate(sunday);
  const taskIds = tasks.map(t => t.id);
  assert.ok(taskIds.includes("centers_review"));
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

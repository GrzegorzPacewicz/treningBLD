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
  get4BLDCount,
  getTasksForDay,
  getTasksForDate,
  getWeekVariant,
  isDayComplete,
  calculateStreak,
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

// get4BLDCount tests
test("get4BLDCount: returns 2 for dates in dates2attempts", () => {
  const date = new Date(2026, 6, 2); // 2026-07-02
  assert.strictEqual(get4BLDCount(date), 2);
});

test("get4BLDCount: returns 4 after fullRampStart", () => {
  const date = new Date(2026, 6, 20); // 20 lipca 2026 (po 16 lipca)
  assert.strictEqual(get4BLDCount(date), 4);
});

test("get4BLDCount: returns 0 for early dates not in ramp", () => {
  const date = new Date(2026, 6, 1); // 1 lipca 2026 (nie w dates2attempts, przed fullRampStart)
  assert.strictEqual(get4BLDCount(date), 0);
});

test("get4BLDCount: returns 4 exactly on fullRampStart date", () => {
  const date = new Date(2026, 6, 16); // 16 lipca 2026
  assert.strictEqual(get4BLDCount(date), 4);
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

test("getTasksForDay: expands 4bld_ramp to correct number of attempts", () => {
  const thursday = new Date(2026, 6, 2); // 2 lipca 2026 (czwartek, 2 próby)
  const tasks = getTasksForDay(thursday);
  const p4Tasks = tasks.filter((t) => t.id.startsWith("p4_"));
  assert.strictEqual(p4Tasks.length, 2);
});

test("getTasksForDay: expands 4bld_ramp to 4 attempts after fullRampStart", () => {
  const thursday = new Date(2026, 6, 23); // 23 lipca 2026 (czwartek po 16 lipca)
  const tasks = getTasksForDay(thursday);
  const p4Tasks = tasks.filter((t) => t.id.startsWith("p4_"));
  assert.strictEqual(p4Tasks.length, 4);
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
  const monday = new Date(2026, 6, 6);
  localStorage.setItem("day:2026-07-06", JSON.stringify({
    corners_warmup_mon: true,
    solve3bld: true,
    mon_5bld: true
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
  // Nowy plan z wariantami:
  // 1 lipca (środa): corners_warmup_wed + solve3bld
  // 2 lipca (czwartek): p4_1, p4_2 (2 próby 4BLD) + thu_5bld + centers
  // 3 lipca (piątek): rest (odpoczynek)
  // 4 lipca (sobota): edges_sat + solve3bld + sat_p4_1 + sat_p4_2 (sobota, 2 próby 4BLD)
  // 5 lipca (niedziela): edges_sun + solve3bld + sun_p4_1 + sun_p4_2 + centers_review
  localStorage.setItem("day:2026-07-01", JSON.stringify({
    corners_warmup_wed: true,
    solve3bld: true
  }));
  localStorage.setItem("day:2026-07-02", JSON.stringify({
    p4_1: true,
    p4_2: true,
    thu_5bld: true,
    centers: true
  }));
  localStorage.setItem("day:2026-07-03", JSON.stringify({ rest: true }));
  localStorage.setItem("day:2026-07-04", JSON.stringify({
    edges_sat: true,
    solve3bld: true,
    sat_p4_1: true,
    sat_p4_2: true
  }));
  localStorage.setItem("day:2026-07-05", JSON.stringify({
    edges_sun: true,
    solve3bld: true,
    sun_p4_1: true,
    sun_p4_2: true,
    centers_review: true
  }));

  // Streak powinien być 5 (1-5 lipca)
  const streak = calculateStreak();
  assert.strictEqual(streak, 5);
});

test("calculateStreak: returns 0 when today not completed", () => {
  localStorage.clear();
  // 3 lipca nie ukończony, ale 1-2 lipca tak
  localStorage.setItem("day:2026-07-01", JSON.stringify({ solve3bld: true }));
  localStorage.setItem(
    "day:2026-07-02",
    JSON.stringify({ p4_1: true, p4_2: true, centers: true })
  );
  // day:2026-07-03 brak = nieukończony

  const streak = calculateStreak();
  assert.strictEqual(streak, 0);
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
  PLAN.WEEK_SCHEDULE["2026-07-13"] = "focus_3bld";
  const wednesday = new Date(2026, 6, 15); // 15 lipca (środa w tygodniu 13-19 lipca)
  assert.strictEqual(getWeekVariant(wednesday), "focus_3bld");
  delete PLAN.WEEK_SCHEDULE["2026-07-13"];
});

test("getTasksForDate: uses focus_3bld variant tasks", () => {
  PLAN.WEEK_SCHEDULE["2026-07-13"] = "focus_3bld";
  const monday = new Date(2026, 6, 13); // 13 lipca (poniedziałek)
  const tasks = getTasksForDate(monday);
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].id, "solve3bld");
  assert.strictEqual(tasks[0].detail, "20–25 prób");
  delete PLAN.WEEK_SCHEDULE["2026-07-13"];
});

test("getTasksForDate: uses focus_duze variant tasks", () => {
  PLAN.WEEK_SCHEDULE["2026-07-20"] = "focus_duze";
  const wednesday = new Date(2026, 6, 22); // 22 lipca (środa)
  const tasks = getTasksForDate(wednesday);
  const taskIds = tasks.map(t => t.id).filter(Boolean);
  assert.ok(taskIds.includes("centers"));
  delete PLAN.WEEK_SCHEDULE["2026-07-20"];
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

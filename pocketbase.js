const PB_URL = "https://gp1.pecet.it";
const COLLECTION = "training_overrides";

let _pbOverrides = null;

async function pbFetchOverrides() {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/${COLLECTION}/records?sort=-created&perPage=500`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const byDate = {};
    for (const record of data.items) {
      if (!byDate[record.date]) {
        byDate[record.date] = record;
      }
    }
    _pbOverrides = byDate;
    return byDate;
  } catch (err) {
    console.warn("PocketBase fetch failed, using local plan:", err);
    _pbOverrides = {};
    return {};
  }
}

function pbGetOverride(dateKey) {
  if (!_pbOverrides) return null;
  return _pbOverrides[dateKey] || null;
}

async function pbSaveOverride(dateKey, tasks, reason, originalTasks) {
  const body = {
    date: dateKey,
    action: tasks === "rest" ? "rest" : "custom",
    original_tasks: originalTasks,
    new_tasks: tasks,
    reason: reason || ""
  };

  const res = await fetch(`${PB_URL}/api/collections/${COLLECTION}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Save failed: ${err}`);
  }

  const record = await res.json();
  _pbOverrides[dateKey] = record;
  return record;
}

async function pbDeleteOverride(dateKey) {
  const record = _pbOverrides[dateKey];
  if (!record) return;

  const res = await fetch(
    `${PB_URL}/api/collections/${COLLECTION}/records/${record.id}`,
    { method: "DELETE" }
  );

  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status}`);
  }

  delete _pbOverrides[dateKey];
}

// Training progress (completed tasks + error tags)
const PROGRESS_COLLECTION = "training_progress";
let _pbProgress = {};
let _pbProgressIds = {};

async function pbFetchProgress() {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/${PROGRESS_COLLECTION}/records?perPage=500`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    for (const record of data.items) {
      _pbProgress[record.date] = {
        tasks: record.tasks || {},
        tags: record.tags || {}
      };
      _pbProgressIds[record.date] = record.id;
    }
    return _pbProgress;
  } catch (err) {
    console.warn("PocketBase progress fetch failed:", err);
    return {};
  }
}

function pbGetProgress(dateKey) {
  return _pbProgress[dateKey] || { tasks: {}, tags: {} };
}

async function pbSaveProgress(dateKey, tasks, tags) {
  const body = { date: dateKey, tasks, tags };
  const existingId = _pbProgressIds[dateKey];

  const url = existingId
    ? `${PB_URL}/api/collections/${PROGRESS_COLLECTION}/records/${existingId}`
    : `${PB_URL}/api/collections/${PROGRESS_COLLECTION}/records`;

  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error("Progress save failed:", await res.text());
    return;
  }

  const record = await res.json();
  _pbProgress[dateKey] = { tasks, tags };
  _pbProgressIds[dateKey] = record.id;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    pbFetchOverrides, pbGetOverride, pbSaveOverride, pbDeleteOverride,
    pbFetchProgress, pbGetProgress, pbSaveProgress,
    PB_URL, COLLECTION, PROGRESS_COLLECTION
  };
}

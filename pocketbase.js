const PB_URL = "https://gp1.pecet.it";
const COLLECTION = "training_overrides";

let _pbOverrides = null;
let _pbAuthToken = localStorage.getItem("pb_auth_token") || null;
let _pbAuthModel = JSON.parse(localStorage.getItem("pb_auth_model") || "null");

function pbIsLoggedIn() {
  return !!_pbAuthToken;
}

function pbGetUser() {
  return _pbAuthModel;
}

async function pbLogin(email, password) {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Błąd logowania");
  }

  const data = await res.json();
  _pbAuthToken = data.token;
  _pbAuthModel = data.record;
  localStorage.setItem("pb_auth_token", data.token);
  localStorage.setItem("pb_auth_model", JSON.stringify(data.record));
  return data.record;
}

function pbLogout() {
  _pbAuthToken = null;
  _pbAuthModel = null;
  localStorage.removeItem("pb_auth_token");
  localStorage.removeItem("pb_auth_model");
}

function pbAuthHeaders() {
  if (!_pbAuthToken) return {};
  return { "Authorization": _pbAuthToken };
}

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
  if (!_pbAuthToken) {
    throw new Error("Musisz być zalogowany, żeby edytować plan");
  }

  const body = {
    date: dateKey,
    action: tasks === "rest" ? "rest" : "custom",
    original_tasks: originalTasks,
    new_tasks: tasks,
    reason: reason || ""
  };

  const res = await fetch(`${PB_URL}/api/collections/${COLLECTION}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...pbAuthHeaders() },
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
  if (!_pbAuthToken) {
    throw new Error("Musisz być zalogowany, żeby usuwać override");
  }

  const record = _pbOverrides[dateKey];
  if (!record) return;

  const res = await fetch(
    `${PB_URL}/api/collections/${COLLECTION}/records/${record.id}`,
    { method: "DELETE", headers: pbAuthHeaders() }
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
  if (!_pbAuthToken) {
    console.warn("Not logged in, skipping PocketBase save");
    return;
  }

  const body = { date: dateKey, tasks, tags };
  const existingId = _pbProgressIds[dateKey];

  const url = existingId
    ? `${PB_URL}/api/collections/${PROGRESS_COLLECTION}/records/${existingId}`
    : `${PB_URL}/api/collections/${PROGRESS_COLLECTION}/records`;

  const res = await fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json", ...pbAuthHeaders() },
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

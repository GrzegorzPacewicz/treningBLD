const PB_URL = "https://gp1.pecet.it";
const COLLECTION = "training_overrides";

let _pbOverrides = null;
let _pbAuthToken = localStorage.getItem("pb_auth_token") || null;
let _pbAuthModel = JSON.parse(localStorage.getItem("pb_auth_model") || "null");

function pbIsLoggedIn() {
  if (!_pbAuthToken) return false;
  // Check if token looks expired (JWT tokens have 3 parts)
  try {
    const parts = _pbAuthToken.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token expired, clear it
        pbLogout();
        return false;
      }
    }
  } catch (e) {
    // If token parsing fails, assume it's still valid and let server decide
  }
  return true;
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
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
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
    if (typeof handleApiError === "function" && err.status) {
      handleApiError(err, "pobieranie planów");
    }
    _pbOverrides = {};
    return {};
  }
}

function pbGetOverride(dateKey) {
  if (!_pbOverrides) return null;
  return _pbOverrides[dateKey] || null;
}

async function pbSaveOverride(dateKey, tasks, reason, originalTasks) {
  if (!pbIsLoggedIn()) {
    const err = new Error("Musisz być zalogowany, żeby edytować plan");
    err.status = 401;
    throw err;
  }

  const body = {
    date: dateKey,
    action: tasks === "rest" ? "rest" : "custom",
    original_tasks: originalTasks,
    new_tasks: tasks,
    reason: reason || "",
    user: _pbAuthModel?.id
  };

  const res = await fetch(`${PB_URL}/api/collections/${COLLECTION}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...pbAuthHeaders() },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const err = new Error(errData.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = errData;
    throw err;
  }

  const record = await res.json();
  _pbOverrides[dateKey] = record;
  return record;
}

async function pbDeleteOverride(dateKey) {
  if (!pbIsLoggedIn()) {
    const err = new Error("Musisz być zalogowany, żeby usuwać override");
    err.status = 401;
    throw err;
  }

  const record = _pbOverrides[dateKey];
  if (!record) return;

  const res = await fetch(
    `${PB_URL}/api/collections/${COLLECTION}/records/${record.id}`,
    { method: "DELETE", headers: pbAuthHeaders() }
  );

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
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
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
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
    if (typeof handleApiError === "function" && err.status) {
      handleApiError(err, "pobieranie postępu");
    }
    return {};
  }
}

function pbGetProgress(dateKey) {
  return _pbProgress[dateKey] || { tasks: {}, tags: {} };
}

async function pbSaveProgress(dateKey, tasks, tags) {
  if (!pbIsLoggedIn()) {
    console.warn("Not logged in, skipping PocketBase save");
    return;
  }

  const body = { date: dateKey, tasks, tags, user: _pbAuthModel?.id };
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
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    if (typeof handleApiError === "function") {
      handleApiError(err, "zapis postępu");
    } else {
      console.error("Progress save failed:", res.status);
    }
    return;
  }

  const record = await res.json();
  _pbProgress[dateKey] = { tasks, tags };
  _pbProgressIds[dateKey] = record.id;
}

// Weekly variants (templates)
const VARIANTS_COLLECTION = "weekly_variants";
let _pbVariants = [];

async function pbFetchVariants() {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/${VARIANTS_COLLECTION}/records?perPage=100`,
      { headers: pbAuthHeaders() }
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    _pbVariants = data.items;
    return _pbVariants;
  } catch (err) {
    console.warn("PocketBase variants fetch failed:", err);
    if (typeof handleApiError === "function" && err.status) {
      handleApiError(err, "pobieranie wariantów");
    }
    return [];
  }
}

function pbGetVariants() {
  return _pbVariants;
}

function pbGetVariantById(id) {
  return _pbVariants.find(v => v.id === id) || null;
}

async function pbSaveVariant(variant) {
  if (!pbIsLoggedIn()) {
    const err = new Error("Musisz być zalogowany");
    err.status = 401;
    throw err;
  }

  const isUpdate = !!variant.id;
  const url = isUpdate
    ? `${PB_URL}/api/collections/${VARIANTS_COLLECTION}/records/${variant.id}`
    : `${PB_URL}/api/collections/${VARIANTS_COLLECTION}/records`;

  const body = { ...variant, user: _pbAuthModel?.id };
  const res = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json", ...pbAuthHeaders() },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const record = await res.json();
  if (isUpdate) {
    const idx = _pbVariants.findIndex(v => v.id === record.id);
    if (idx >= 0) _pbVariants[idx] = record;
  } else {
    _pbVariants.push(record);
  }
  return record;
}

async function pbDeleteVariant(id) {
  if (!pbIsLoggedIn()) {
    const err = new Error("Musisz być zalogowany");
    err.status = 401;
    throw err;
  }

  const res = await fetch(
    `${PB_URL}/api/collections/${VARIANTS_COLLECTION}/records/${id}`,
    { method: "DELETE", headers: pbAuthHeaders() }
  );

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  _pbVariants = _pbVariants.filter(v => v.id !== id);
}

// Weekly schedule (week -> variant mapping)
const SCHEDULE_COLLECTION = "weekly_schedule";
let _pbSchedule = {};

async function pbFetchSchedule() {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/${SCHEDULE_COLLECTION}/records?perPage=200`,
      { headers: pbAuthHeaders() }
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    _pbSchedule = {};
    for (const record of data.items) {
      _pbSchedule[record.week_start] = record;
    }
    return _pbSchedule;
  } catch (err) {
    console.warn("PocketBase schedule fetch failed:", err);
    if (typeof handleApiError === "function" && err.status) {
      handleApiError(err, "pobieranie harmonogramu");
    }
    return {};
  }
}

function pbGetSchedule(weekStart) {
  return _pbSchedule[weekStart] || null;
}

async function pbSaveSchedule(weekStart, variantId) {
  if (!pbIsLoggedIn()) {
    const err = new Error("Musisz być zalogowany");
    err.status = 401;
    throw err;
  }

  const existing = _pbSchedule[weekStart];
  const url = existing
    ? `${PB_URL}/api/collections/${SCHEDULE_COLLECTION}/records/${existing.id}`
    : `${PB_URL}/api/collections/${SCHEDULE_COLLECTION}/records`;

  const res = await fetch(url, {
    method: existing ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json", ...pbAuthHeaders() },
    body: JSON.stringify({ week_start: weekStart, variant: variantId, user: _pbAuthModel?.id })
  });

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const record = await res.json();
  _pbSchedule[weekStart] = record;
  return record;
}

// Training focus (global rules)
const FOCUS_COLLECTION = "training_focus";
let _pbFocus = [];

async function pbFetchFocus() {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/${FOCUS_COLLECTION}/records?sort=order&perPage=50`,
      { headers: pbAuthHeaders() }
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    _pbFocus = data.items;
    return _pbFocus;
  } catch (err) {
    console.warn("PocketBase focus fetch failed:", err);
    if (typeof handleApiError === "function" && err.status) {
      handleApiError(err, "pobieranie zasad");
    }
    return [];
  }
}

function pbGetFocus() {
  return _pbFocus;
}

async function pbSaveFocusItem(item) {
  if (!pbIsLoggedIn()) {
    const err = new Error("Musisz być zalogowany");
    err.status = 401;
    throw err;
  }

  const isUpdate = !!item.id;
  const url = isUpdate
    ? `${PB_URL}/api/collections/${FOCUS_COLLECTION}/records/${item.id}`
    : `${PB_URL}/api/collections/${FOCUS_COLLECTION}/records`;

  const body = { ...item, user: _pbAuthModel?.id };
  const res = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json", ...pbAuthHeaders() },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const record = await res.json();
  if (isUpdate) {
    const idx = _pbFocus.findIndex(f => f.id === record.id);
    if (idx >= 0) _pbFocus[idx] = record;
  } else {
    _pbFocus.push(record);
  }
  _pbFocus.sort((a, b) => (a.order || 0) - (b.order || 0));
  return record;
}

async function pbDeleteFocusItem(id) {
  if (!pbIsLoggedIn()) {
    const err = new Error("Musisz być zalogowany");
    err.status = 401;
    throw err;
  }

  const res = await fetch(
    `${PB_URL}/api/collections/${FOCUS_COLLECTION}/records/${id}`,
    { method: "DELETE", headers: pbAuthHeaders() }
  );

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  _pbFocus = _pbFocus.filter(f => f.id !== id);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    pbFetchOverrides, pbGetOverride, pbSaveOverride, pbDeleteOverride,
    pbFetchProgress, pbGetProgress, pbSaveProgress,
    pbFetchVariants, pbGetVariants, pbGetVariantById, pbSaveVariant, pbDeleteVariant,
    pbFetchSchedule, pbGetSchedule, pbSaveSchedule,
    pbFetchFocus, pbGetFocus, pbSaveFocusItem, pbDeleteFocusItem,
    PB_URL, COLLECTION, PROGRESS_COLLECTION, VARIANTS_COLLECTION, SCHEDULE_COLLECTION, FOCUS_COLLECTION
  };
}

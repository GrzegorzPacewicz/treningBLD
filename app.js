// Toast notification system
function showToast(options) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${options.type || "error"}`;

  let actionsHtml = "";
  if (options.actions && options.actions.length) {
    actionsHtml = `<div class="toast-actions">
      ${options.actions.map(a => `<button class="toast-action ${a.primary ? "primary" : ""}" data-action="${a.id}">${a.label}</button>`).join("")}
    </div>`;
  }

  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-content">
        <div class="toast-title">${options.title}</div>
        <div class="toast-message">${options.message}</div>
      </div>
      <button class="toast-close">&times;</button>
    </div>
    ${actionsHtml}
  `;

  toast.querySelector(".toast-close").onclick = () => hideToast(toast);

  if (options.actions) {
    toast.querySelectorAll(".toast-action").forEach(btn => {
      btn.onclick = () => {
        const action = options.actions.find(a => a.id === btn.dataset.action);
        if (action && action.handler) action.handler();
        hideToast(toast);
      };
    });
  }

  container.appendChild(toast);

  const timeout = options.timeout ?? 8000;
  if (timeout > 0) {
    setTimeout(() => hideToast(toast), timeout);
  }

  return toast;
}

function hideToast(toast) {
  if (!toast || toast.classList.contains("toast-hiding")) return;
  toast.classList.add("toast-hiding");
  setTimeout(() => toast.remove(), 200);
}

// Error handling
const ERROR_MESSAGES = {
  400: {
    title: "Sesja wygasła",
    message: "Twoje dane logowania są nieaktualne. Wyloguj się i zaloguj ponownie.",
    action: "logout"
  },
  401: {
    title: "Brak autoryzacji",
    message: "Nie jesteś zalogowany lub sesja wygasła. Zaloguj się ponownie.",
    action: "login"
  },
  403: {
    title: "Brak dostępu",
    message: "Nie masz uprawnień do tej operacji.",
    action: null
  },
  404: {
    title: "Nie znaleziono",
    message: "Żądany zasób nie istnieje.",
    action: null
  },
  500: {
    title: "Błąd serwera",
    message: "Coś poszło nie tak po stronie serwera. Spróbuj ponownie za chwilę.",
    action: "retry"
  },
  502: {
    title: "Serwer niedostępny",
    message: "Serwer tymczasowo nie odpowiada. Spróbuj za kilka minut.",
    action: null
  },
  503: {
    title: "Serwer przeciążony",
    message: "Serwer jest chwilowo niedostępny. Spróbuj ponownie później.",
    action: null
  },
  network: {
    title: "Brak połączenia",
    message: "Sprawdź połączenie z internetem i spróbuj ponownie.",
    action: "retry"
  }
};

function handleApiError(error, context = "") {
  let errorInfo;
  let statusCode = null;

  if (error instanceof TypeError && error.message.includes("fetch")) {
    errorInfo = ERROR_MESSAGES.network;
  } else if (error.message && error.message.match(/HTTP (\d+)/)) {
    statusCode = parseInt(error.message.match(/HTTP (\d+)/)[1]);
    errorInfo = ERROR_MESSAGES[statusCode] || {
      title: `Błąd ${statusCode}`,
      message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
      action: null
    };
  } else if (error.status) {
    statusCode = error.status;
    errorInfo = ERROR_MESSAGES[statusCode] || {
      title: `Błąd ${statusCode}`,
      message: error.message || "Wystąpił nieoczekiwany błąd.",
      action: null
    };
  } else {
    errorInfo = {
      title: "Błąd",
      message: error.message || "Wystąpił nieoczekiwany błąd.",
      action: null
    };
  }

  const actions = [];

  if (errorInfo.action === "logout" || statusCode === 400) {
    actions.push({
      id: "logout",
      label: "Wyloguj się",
      primary: true,
      handler: () => {
        pbLogout();
        updateAuthButton();
        showToast({
          type: "success",
          title: "Wylogowano",
          message: "Zaloguj się ponownie.",
          timeout: 3000
        });
      }
    });
  } else if (errorInfo.action === "login" || statusCode === 401) {
    actions.push({
      id: "login",
      label: "Zaloguj się",
      primary: true,
      handler: () => showLoginModal()
    });
  }

  const toastOptions = {
    type: "error",
    title: errorInfo.title,
    message: context ? `${errorInfo.message} (${context})` : errorInfo.message,
    actions: actions.length ? actions : undefined
  };

  showToast(toastOptions);
  console.error(`[${context || "API"}]`, error);
}

// Constants from PLAN
const START_DATE = PLAN.startDate;

const DAY_NAMES = ["Nd", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"];
const DAY_NAMES_FULL = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];
const MONTH_NAMES = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

const DAY_MAP = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// Helper functions
function formatDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStorageKey(date) {
  return `day:${formatDateKey(date)}`;
}

function getDayData(date) {
  const dateKey = formatDateKey(date);
  if (typeof pbGetProgress === "function") {
    return pbGetProgress(dateKey).tasks;
  }
  const key = getStorageKey(date);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : {};
}

function setDayData(date, data) {
  const dateKey = formatDateKey(date);
  const key = getStorageKey(date);
  localStorage.setItem(key, JSON.stringify(data));

  if (typeof pbSaveProgress === "function") {
    const tags = getErrorTags(date);
    pbSaveProgress(dateKey, data, tags);
  }
}

function getErrorTagsKey(date) {
  return `tags:${formatDateKey(date)}`;
}

function getErrorTags(date) {
  const dateKey = formatDateKey(date);
  if (typeof pbGetProgress === "function") {
    return pbGetProgress(dateKey).tags;
  }
  const key = getErrorTagsKey(date);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : {};
}

function setErrorTags(date, tags) {
  const dateKey = formatDateKey(date);
  const key = getErrorTagsKey(date);
  localStorage.setItem(key, JSON.stringify(tags));

  if (typeof pbSaveProgress === "function") {
    const tasks = getDayData(date);
    pbSaveProgress(dateKey, tasks, tags);
  }
}

function getWeekVariant(date) {
  const weekStart = getWeekStart(date);
  const weekKey = formatDateKey(weekStart);

  // Try PocketBase schedule first
  if (typeof pbGetSchedule === "function") {
    const schedule = pbGetSchedule(weekKey);
    if (schedule && schedule.variant) {
      const variant = typeof pbGetVariantById === "function"
        ? pbGetVariantById(schedule.variant)
        : null;
      if (variant) return variant;
    }
  }

  // Fallback to plan.js
  const variantName = PLAN.WEEK_SCHEDULE[weekKey] || "default";
  return PLAN.WEEK_VARIANTS[variantName] || PLAN.WEEK_VARIANTS.default;
}

function getBaseTasks(date) {
  const dayOfWeek = date.getDay();
  const dayName = DAY_MAP[dayOfWeek];
  const variant = getWeekVariant(date);
  return variant[dayName] || [];
}

function getTasksForDate(date) {
  const dateKey = formatDateKey(date);

  // Check PocketBase overrides first
  const pbOverride = typeof pbGetOverride === "function" ? pbGetOverride(dateKey) : null;
  if (pbOverride && pbOverride.new_tasks) {
    if (pbOverride.new_tasks === "rest") {
      return [{ id: "rest", text: "Odpoczynek", detail: pbOverride.reason || "override" }];
    }
    return pbOverride.new_tasks;
  }

  // Then check local DAY_OVERRIDES
  if (PLAN.DAY_OVERRIDES && PLAN.DAY_OVERRIDES[dateKey]) {
    return PLAN.DAY_OVERRIDES[dateKey];
  }

  return getBaseTasks(date);
}

function getTasksForDay(date) {
  return getTasksForDate(date);
}

function isDayComplete(date) {
  const tasks = getTasksForDay(date);
  const data = getDayData(date);

  if (tasks.length === 0) return { full: false, partial: false };

  let completedCount = 0;
  let totalTasks = 0;

  for (const task of tasks) {
    if (task.or) {
      // OR task: one of them must be done
      totalTasks++;
      if (data[task.id] || data[task.or.id]) completedCount++;
    } else {
      totalTasks++;
      if (data[task.id]) completedCount++;
    }
  }

  return {
    full: completedCount === totalTasks,
    partial: completedCount > 0 && completedCount < totalTasks,
    completed: completedCount,
    total: totalTasks,
  };
}

function calculateStreak() {
  const today = getEffectiveToday();
  let streak = 0;
  let checkDate = new Date(today);

  while (checkDate >= START_DATE) {
    const status = isDayComplete(checkDate);
    if (status.full) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

var _testTodayOverride = null;

function getEffectiveToday() {
  if (_testTodayOverride) {
    return new Date(_testTodayOverride);
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (now < START_DATE) {
    return new Date(START_DATE);
  }
  return now;
}

function setTestToday(date) {
  _testTodayOverride = date ? new Date(date) : null;
}

function getWeekOfProgram(date) {
  const weekStart = getWeekStart(date);
  const firstMonday = getWeekStart(START_DATE);
  const diffTime = weekStart - firstMonday;
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff));
}

// Render functions
function renderStatsBar() {
  const today = getEffectiveToday();
  const weekStart = getWeekStart(today);

  // Count total completed days since start
  let totalComplete = 0;
  const daysSinceStart = Math.floor((today - START_DATE) / (1000 * 60 * 60 * 24)) + 1;
  for (let i = 0; i < daysSinceStart; i++) {
    const date = new Date(START_DATE);
    date.setDate(date.getDate() + i);
    if (isDayComplete(date).full) totalComplete++;
  }

  document.getElementById("total-days").textContent = totalComplete;
  document.getElementById("streak-count").textContent = calculateStreak();

  // Week progress (Monday-Sunday)
  const weekProgressEl = document.getElementById("week-progress");
  weekProgressEl.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);

    const dot = document.createElement("div");
    dot.className = "day-dot";

    if (dayDate >= START_DATE) {
      const status = isDayComplete(dayDate);
      if (status.full) dot.classList.add("full");
      else if (status.partial) dot.classList.add("partial");
    }

    weekProgressEl.appendChild(dot);
  }
}

function renderWeeklyPlan() {
  const container = document.getElementById("weekly-plan-content");
  container.innerHTML = "";
  const today = getEffectiveToday();
  const weekStart = getWeekStart(today);
  const variant = getWeekVariant(today);

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayNamesPolish = {
    monday: "Poniedziałek",
    tuesday: "Wtorek",
    wednesday: "Środa",
    thursday: "Czwartek",
    friday: "Piątek",
    saturday: "Sobota",
    sunday: "Niedziela"
  };

  const variantHeader = document.createElement("div");
  variantHeader.className = "weekly-plan-variant";
  const variantName = variant.name || "Plan tygodniowy";
  const variantDesc = variant.description || "";
  variantHeader.innerHTML = `
    <div class="variant-name">${variantName}</div>
    ${variantDesc ? `<div class="variant-desc">${variantDesc}</div>` : ""}
  `;
  container.appendChild(variantHeader);

  for (let i = 0; i < 7; i++) {
    const dayName = dayOrder[i];
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const isToday = formatDateKey(dayDate) === formatDateKey(today);

    const tasks = variant[dayName] || [];
    if (tasks.length === 0) continue;

    const dayDiv = document.createElement("div");
    dayDiv.className = "weekly-plan-day";
    if (isToday) dayDiv.classList.add("is-today");

    const taskTexts = tasks.map(t => {
      const detail = t.detail ? ` (${t.detail})` : "";
      return `${t.text}${detail}`;
    }).filter(Boolean);

    dayDiv.innerHTML = `
      <div class="weekly-plan-day-header">${dayNamesPolish[dayName]}</div>
      <div class="weekly-plan-day-tasks">${taskTexts.join(" • ")}</div>
    `;

    container.appendChild(dayDiv);
  }
}

function toggleWeeklyPlan() {
  document.getElementById("weekly-plan-card").classList.toggle("collapsed");
}

function renderFocusCard() {
  const container = document.getElementById("focus-content");
  container.innerHTML = "";

  // Try PocketBase focus first, fallback to plan.js
  const focusItems = (typeof pbGetFocus === "function" && pbGetFocus().length > 0)
    ? pbGetFocus()
    : PLAN.focus;

  for (const item of focusItems) {
    const div = document.createElement("div");
    div.className = "focus-item";
    div.innerHTML = `
      <strong>${item.title}</strong>
      <p>${item.description}</p>
    `;
    container.appendChild(div);
  }
}

function renderTaskItem(task, data, date, container, isModal = false) {
  const item = document.createElement("div");
  item.className = "task-item";
  if (data[task.id]) item.classList.add("done");

  item.innerHTML = `
  <div class="checkbox"><i class="ti ti-check"></i></div>
  <div class="task-text">
    ${task.text}
    ${task.detail ? `<small>${task.detail}</small>` : ""}
  </div>
`;

  item.onclick = () => {
    data[task.id] = !data[task.id];
    if (task.or && data[task.id]) {
      data[task.or.id] = false;
    }
    setDayData(date, data);
    renderAll();
    if (isModal) openDayModal(date);
  };

  container.appendChild(item);

  if (task.or) {
    const orLabel = document.createElement("div");
    orLabel.className = "task-or";
    orLabel.textContent = "lub";
    container.appendChild(orLabel);

    const orItem = document.createElement("div");
    orItem.className = "task-item";
    if (data[task.or.id]) orItem.classList.add("done");

    orItem.innerHTML = `
    <div class="checkbox"><i class="ti ti-check"></i></div>
    <div class="task-text">
      ${task.or.text}
      ${task.or.detail ? `<small>${task.or.detail}</small>` : ""}
    </div>
  `;

    orItem.onclick = () => {
      data[task.or.id] = !data[task.or.id];
      if (data[task.or.id]) {
        data[task.id] = false;
      }
      setDayData(date, data);
      renderAll();
      if (isModal) openDayModal(date);
    };

    container.appendChild(orItem);
  }
}

function renderTodayCard() {
  const today = getEffectiveToday();
  const dayName = DAY_NAMES_FULL[today.getDay()];
  const dateStr = `${today.getDate()} ${MONTH_NAMES[today.getMonth()]}`;
  const dateKey = formatDateKey(today);
  const hasOverride = typeof pbGetOverride === "function" && pbGetOverride(dateKey);

  const headerEl = document.querySelector("#today-card .card-header");
  headerEl.innerHTML = `
    <div>
      <h2>Dzisiaj ${hasOverride ? '<span class="override-badge">zmieniony</span>' : ''}</h2>
      <span class="date mono" id="today-date">${dayName}, ${dateStr}</span>
    </div>
    <button class="edit-btn" onclick="openEditModal(getEffectiveToday())" title="Edytuj plan">
      <i class="ti ti-edit"></i>
    </button>
  `;

  const tasks = getTasksForDay(today);
  const data = getDayData(today);
  const container = document.getElementById("today-tasks");
  container.innerHTML = "";

  for (const task of tasks) {
    renderTaskItem(task, data, today, container);
  }
}

function renderHistory() {
  const container = document.getElementById("history-content");
  container.innerHTML = "";
  const today = getEffectiveToday();
  const currentWeek = getWeekOfProgram(today);

  // Calculate days from start to end of current week
  const weekEnd = new Date(getWeekStart(today));
  weekEnd.setDate(weekEnd.getDate() + 6);
  const totalDays = Math.floor((weekEnd - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

  // Group days by month and week
  const months = {};

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(START_DATE);
    date.setDate(date.getDate() + i);

    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const weekNum = getWeekOfProgram(date);

    if (!months[monthKey]) {
      months[monthKey] = {
        name: MONTH_NAMES[date.getMonth()],
        weeks: {},
      };
    }

    if (!months[monthKey].weeks[weekNum]) {
      months[monthKey].weeks[weekNum] = [];
    }

    months[monthKey].weeks[weekNum].push(date);
  }

  for (const [monthKey, monthData] of Object.entries(months)) {
    const monthGroup = document.createElement("div");
    monthGroup.className = "month-group";

    const monthTitle = document.createElement("div");
    monthTitle.className = "month-title";
    monthTitle.textContent = monthData.name;
    monthGroup.appendChild(monthTitle);

    for (const [weekNum, days] of Object.entries(monthData.weeks)) {
      const isCurrentWeek = parseInt(weekNum) === currentWeek;
      const weekAccordion = document.createElement("div");
      weekAccordion.className = "week-accordion";
      if (!isCurrentWeek) weekAccordion.classList.add("collapsed");

      const startDay = days[0].getDate();
      const endDay = days[days.length - 1].getDate();
      const weekLabel = `${startDay}–${endDay} ${MONTH_NAMES[days[0].getMonth()]}`;

      // Get variant for this week
      const weekVariant = getWeekVariant(days[0]);
      const variantName = weekVariant.name || "Plan";

      // Week progress mini
      let progressHtml = '<div class="week-progress-mini">';
      for (const day of days) {
        const status = isDayComplete(day);
        let cls = "day-mini";
        if (status.full) cls += " full";
        else if (status.partial) cls += " partial";
        progressHtml += `<div class="${cls}"></div>`;
      }
      progressHtml += "</div>";

      weekAccordion.innerHTML = `
      <div class="week-header" onclick="toggleWeek(this)">
        <div class="week-title-group">
          <span class="week-title">Tydzień ${parseInt(weekNum) + 1}</span>
          <span class="week-variant-badge">${variantName}</span>
        </div>
        <div class="week-meta">
          ${progressHtml}
          <i class="ti ti-chevron-down"></i>
        </div>
      </div>
      <div class="week-content"></div>
    `;

      const weekContent = weekAccordion.querySelector(".week-content");

      for (const day of days) {
        const isToday = formatDateKey(day) === formatDateKey(today);
        const isFuture = day > today;
        const status = isDayComplete(day);

        let statusIcon = "ti-circle";
        let statusClass = "";
        if (status.full) {
          statusIcon = "ti-check";
          statusClass = "full";
        } else if (status.partial) {
          statusIcon = "ti-circle-half-filled";
          statusClass = "partial";
        }

        const dayRow = document.createElement("div");
        dayRow.className = "day-row";
        if (isToday) dayRow.classList.add("is-today");
        if (isFuture) dayRow.classList.add("is-future");

        dayRow.innerHTML = `
        <span class="day-name">${DAY_NAMES[day.getDay()]}</span>
        <span class="day-date mono">${day.getDate()}</span>
        <i class="ti ${statusIcon} day-status ${statusClass}"></i>
      `;

        dayRow.onclick = () => {
          if (isToday) {
            document
              .getElementById("today-card")
              .scrollIntoView({ behavior: "smooth" });
          } else {
            openDayModal(day);
          }
        };

        weekContent.appendChild(dayRow);
      }

      monthGroup.appendChild(weekAccordion);
    }

    container.appendChild(monthGroup);
  }
}

function toggleWeek(header) {
  header.parentElement.classList.toggle("collapsed");
}

function openDayModal(date) {
  const modal = document.getElementById("modal");
  const dayName = DAY_NAMES_FULL[date.getDay()];
  const dateStr = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
  const dateKey = formatDateKey(date);
  const hasOverride = typeof pbGetOverride === "function" && pbGetOverride(dateKey);

  const header = document.querySelector("#modal .modal-header");
  header.innerHTML = `
    <h3 id="modal-title">${dayName}, ${dateStr} ${hasOverride ? '<span class="override-badge">zmieniony</span>' : ''}</h3>
    <div class="modal-actions">
      <button class="edit-btn" onclick="closeModal(); openEditModal(new Date('${dateKey}'))" title="Edytuj plan">
        <i class="ti ti-edit"></i>
      </button>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
  `;

  const tasks = getTasksForDay(date);
  const data = getDayData(date);
  const container = document.getElementById("modal-tasks");
  container.innerHTML = "";

  for (const task of tasks) {
    renderTaskItem(task, data, date, container, true);
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById("modal").classList.remove("open");
  document.body.style.overflow = "";
}

let _editTasks = [];

const TASK_TEMPLATES = {
  blddriller_corners: {
    text: "BLD Driller (rogi)",
    details: ["5 min", "10 min", "15 min", "20 min", "25 min", "30 min"]
  },
  blddriller_edges: {
    text: "BLD Driller (krawędzie)",
    details: ["5 min", "10 min", "15 min", "20 min", "25 min", "30 min"]
  },
  blddriller_parity: {
    text: "BLD Driller (parity)",
    details: ["5 min", "10 min", "15 min", "20 min", "25 min", "30 min"]
  },
  solve3bld: {
    text: "3BLD solvy",
    details: ["5", "10", "15", "20", "25", "30", "35", "40", "45", "50"]
  },
  solve4bld: {
    text: "4BLD",
    details: ["1 próba", "2 próby", "3 próby", "5 prób", "10 prób"]
  },
  drill4bld: {
    text: "4BLD trening",
    details: ["centry", "wings"]
  },
  solve5bld: {
    text: "5BLD",
    details: ["1 próba", "2 próby", "3 próby", "5 prób", "10 prób"]
  },
  drill5bld: {
    text: "5BLD trening",
    details: ["centry", "wings", "midges", "parity"]
  },
  speedmemo: {
    text: "Speed-memo",
    details: ["5", "10", "15", "20", "25", "30"]
  },
  rest: {
    text: "Odpoczynek",
    details: ["pełny rest", "lekki trening", "zamiana z innym dniem"]
  }
};

function openEditModal(date) {
  const dateKey = formatDateKey(date);
  const dayName = DAY_NAMES_FULL[date.getDay()];
  const dateStr = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
  const baseTasks = getBaseTasks(date);
  const pbOverride = typeof pbGetOverride === "function" ? pbGetOverride(dateKey) : null;

  const modal = document.getElementById("edit-modal");
  document.getElementById("edit-modal-title").textContent = `Edytuj: ${dayName}, ${dateStr}`;
  document.getElementById("edit-date").value = dateKey;

  const currentTasksEl = document.getElementById("edit-current-tasks");
  currentTasksEl.innerHTML = baseTasks.map(t => {
    return `${t.text}${t.detail ? ` (${t.detail})` : ""}`;
  }).join("<br>") || "<em>Brak zadań</em>";

  document.getElementById("edit-action").value = pbOverride ? pbOverride.action : "custom";
  document.getElementById("edit-reason").value = pbOverride ? (pbOverride.reason || "") : "";

  if (pbOverride && pbOverride.new_tasks && pbOverride.new_tasks !== "rest") {
    _editTasks = JSON.parse(JSON.stringify(pbOverride.new_tasks));
  } else {
    _editTasks = baseTasks.map(t => ({ id: t.id, text: t.text, detail: t.detail || "" }));
  }
  renderEditTasksList();

  updateEditFormVisibility();
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function updateEditFormVisibility() {
  const action = document.getElementById("edit-action").value;
  const tasksGroup = document.getElementById("edit-tasks-group");
  tasksGroup.style.display = action === "rest" ? "none" : "block";
}

function renderEditTasksList() {
  const container = document.getElementById("edit-tasks-list");
  container.innerHTML = "";

  _editTasks.forEach((task, index) => {
    const row = document.createElement("div");
    row.className = "edit-task-row";

    const templateKey = findTemplateKey(task.text);
    const template = templateKey ? TASK_TEMPLATES[templateKey] : null;

    let typeOptions = Object.entries(TASK_TEMPLATES).map(([key, t]) => {
      const selected = t.text === task.text ? "selected" : "";
      return `<option value="${key}" ${selected}>${t.text}</option>`;
    }).join("");
    typeOptions = `<option value="">-- wybierz --</option>` + typeOptions;

    let detailOptions = "";
    const isCustomDetail = template && task.detail && !template.details.includes(task.detail);
    if (template) {
      detailOptions = template.details.map(d => {
        const selected = d === task.detail ? "selected" : "";
        return `<option value="${d}" ${selected}>${d}</option>`;
      }).join("");
    }
    detailOptions = `<option value="">-- szczegóły --</option>` + detailOptions;
    detailOptions += `<option value="__custom__" ${isCustomDetail ? "selected" : ""}>Inna...</option>`;

    const showCustomInput = isCustomDetail || task._customDetail;

    row.innerHTML = `
      <select class="edit-task-type" onchange="changeTaskType(${index}, this.value)">
        ${typeOptions}
      </select>
      <select class="edit-task-detail-select" onchange="onDetailSelectChange(${index}, this.value)">
        ${detailOptions}
      </select>
      ${showCustomInput ? `<input type="text" class="edit-task-custom" value="${escapeHtml(task.detail || "")}"
        oninput="updateEditTask(${index}, 'detail', this.value)" placeholder="wpisz...">` : ""}
      <button type="button" class="btn-icon btn-remove" onclick="removeEditTask(${index})" title="Usuń">
        <i class="ti ti-trash"></i>
      </button>
    `;
    container.appendChild(row);
  });
}

function findTemplateKey(text) {
  for (const [key, t] of Object.entries(TASK_TEMPLATES)) {
    if (t.text === text) return key;
  }
  return null;
}

function changeTaskType(index, templateKey) {
  const template = TASK_TEMPLATES[templateKey];
  if (template) {
    _editTasks[index].text = template.text;
    _editTasks[index].detail = template.details[0];
    _editTasks[index].id = templateKey + "_" + index;
  } else {
    _editTasks[index].text = "";
    _editTasks[index].detail = "";
  }
  renderEditTasksList();
}

function updateEditTask(index, field, value) {
  _editTasks[index][field] = value;
  if (field === "text") {
    _editTasks[index].id = value.toLowerCase().replace(/\s+/g, "_") + "_" + index;
  }
}

function onDetailSelectChange(index, value) {
  if (value === "__custom__") {
    _editTasks[index]._customDetail = true;
    _editTasks[index].detail = "";
    renderEditTasksList();
    const inputs = document.querySelectorAll(".edit-task-custom");
    if (inputs[index]) inputs[index].focus();
  } else {
    _editTasks[index]._customDetail = false;
    _editTasks[index].detail = value;
    renderEditTasksList();
  }
}

function addEditTask() {
  _editTasks.push({ id: "new_" + Date.now(), text: "", detail: "" });
  renderEditTasksList();
  const inputs = document.querySelectorAll(".edit-task-text");
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function addEditTaskWithSelect() {
  _editTasks.push({ id: "new_" + Date.now(), text: "", detail: "" });
  renderEditTasksList();
  const selects = document.querySelectorAll(".edit-task-type");
  if (selects.length) selects[selects.length - 1].focus();
}

function removeEditTask(index) {
  _editTasks.splice(index, 1);
  renderEditTasksList();
}

function closeEditModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById("edit-modal").classList.remove("open");
  document.body.style.overflow = "";
  renderAll();
}

async function saveEditModal() {
  const dateKey = document.getElementById("edit-date").value;
  const action = document.getElementById("edit-action").value;
  const reason = document.getElementById("edit-reason").value;
  const date = new Date(dateKey + "T00:00:00");
  const originalTasks = getBaseTasks(date);

  let newTasks;
  if (action === "rest") {
    newTasks = "rest";
  } else {
    newTasks = _editTasks.filter(t => t.text.trim());
    if (newTasks.length === 0) {
      showToast({
        type: "warning",
        title: "Brak zadań",
        message: "Dodaj przynajmniej jedno zadanie lub wybierz dzień wolny.",
        timeout: 4000
      });
      return;
    }
  }

  try {
    await pbSaveOverride(dateKey, newTasks, reason, originalTasks);
    closeEditModal();
    renderAll();
    showToast({
      type: "success",
      title: "Zapisano",
      message: "Plan został zaktualizowany.",
      timeout: 2000
    });
  } catch (e) {
    handleApiError(e, "zapis planu");
  }
}

async function deleteEditOverride() {
  const dateKey = document.getElementById("edit-date").value;
  if (!confirm("Usunąć override i przywrócić domyślny plan?")) return;

  try {
    await pbDeleteOverride(dateKey);
    closeEditModal();
    renderAll();
    showToast({
      type: "success",
      title: "Usunięto",
      message: "Przywrócono domyślny plan.",
      timeout: 2000
    });
  } catch (e) {
    handleApiError(e, "usuwanie override");
  }
}

function renderAll() {
  renderStatsBar();
  renderFocusCard();
  renderWeeklyPlan();
  renderTodayCard();
  renderHistory();
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("weekly-plan-card").classList.add("collapsed");

  updateAuthButton();

  if (typeof pbFetchOverrides === "function") {
    await Promise.all([
      pbFetchOverrides(),
      pbFetchProgress(),
      pbFetchVariants(),
      pbFetchSchedule(),
      pbFetchFocus()
    ]);
  }

  renderAll();

  setTimeout(() => {
    document
      .getElementById("today-card")
      .scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100);
});

// Handle escape key for modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// Auth functions
function showLoginModal() {
  document.getElementById("login-modal").classList.add("open");
  document.getElementById("login-email").focus();
}

function hideLoginModal() {
  document.getElementById("login-modal").classList.remove("open");
  document.getElementById("login-error").textContent = "";
  document.getElementById("login-form").reset();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");

  try {
    await pbLogin(email, password);
    hideLoginModal();
    updateAuthButton();
    await Promise.all([
      pbFetchOverrides(),
      pbFetchProgress(),
      pbFetchVariants(),
      pbFetchSchedule(),
      pbFetchFocus()
    ]);
    renderAll();
    showToast({
      type: "success",
      title: "Zalogowano",
      message: `Witaj, ${pbGetUser()?.email || ""}`,
      timeout: 2000
    });
  } catch (e) {
    errorEl.textContent = "Nieprawidłowy email lub hasło";
  }
}

function toggleAuth() {
  if (pbIsLoggedIn()) {
    if (confirm("Wylogować?")) {
      pbLogout();
      updateAuthButton();
    }
  } else {
    showLoginModal();
  }
}

function updateAuthButton() {
  const btn = document.getElementById("auth-btn");
  if (pbIsLoggedIn()) {
    btn.classList.add("logged-in");
    btn.title = "Zalogowany: " + (pbGetUser()?.email || "");
  } else {
    btn.classList.remove("logged-in");
    btn.title = "Zaloguj się";
  }
}

// Plans Panel
function openPlansPanel() {
  if (!pbIsLoggedIn()) {
    showToast({
      type: "warning",
      title: "Zaloguj się",
      message: "Musisz być zalogowany, żeby zarządzać planami.",
      actions: [{ id: "login", label: "Zaloguj się", primary: true, handler: showLoginModal }]
    });
    return;
  }
  // Reset focus items cache
  _focusItems = pbGetFocus().map(f => ({ ...f }));
  _focusDirty = false;

  document.getElementById("plans-modal").classList.add("open");
  switchPlansTab("week");
}

function closePlansPanel(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById("plans-modal").classList.remove("open");
  renderAll();
}

function switchPlansTab(tab) {
  document.querySelectorAll(".plans-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".plans-tab-content").forEach(c => c.classList.add("hidden"));

  document.querySelector(`.plans-tab[data-tab="${tab}"]`).classList.add("active");
  document.getElementById(`plans-tab-${tab}`).classList.remove("hidden");

  if (tab === "week") renderWeekTab();
  if (tab === "variants") renderVariantsTab();
  if (tab === "focus") renderFocusTab();
}

function renderWeekTab() {
  const select = document.getElementById("week-variant-select");
  const variants = pbGetVariants();
  const today = getEffectiveToday();
  const weekStart = getWeekStart(today);
  const weekKey = formatDateKey(weekStart);
  const currentSchedule = pbGetSchedule(weekKey);

  select.innerHTML = '<option value="">-- wybierz wariant --</option>';
  for (const v of variants) {
    const selected = currentSchedule && currentSchedule.variant === v.id ? "selected" : "";
    select.innerHTML += `<option value="${v.id}" ${selected}>${v.name}</option>`;
  }

  renderWeekPreview();
}

function renderWeekPreview() {
  const container = document.getElementById("week-preview");
  const today = getEffectiveToday();
  const variant = getWeekVariant(today);

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayNamesPolish = {
    monday: "Poniedziałek", tuesday: "Wtorek", wednesday: "Środa",
    thursday: "Czwartek", friday: "Piątek", saturday: "Sobota", sunday: "Niedziela"
  };

  let html = "";
  for (const day of dayOrder) {
    const tasks = variant[day] || [];
    const taskTexts = tasks.map(t => t.text + (t.detail ? ` (${t.detail})` : "")).join(" • ");
    html += `
      <div class="week-preview-day">
        <div class="week-preview-day-name">${dayNamesPolish[day]}</div>
        <div class="week-preview-day-tasks">${taskTexts || "<em>brak zadań</em>"}</div>
      </div>
    `;
  }
  container.innerHTML = html;
}

async function onWeekVariantChange() {
  const select = document.getElementById("week-variant-select");
  const variantId = select.value;
  const today = getEffectiveToday();
  const weekStart = getWeekStart(today);
  const weekKey = formatDateKey(weekStart);

  if (!variantId) return;

  try {
    await pbSaveSchedule(weekKey, variantId);
    renderWeekPreview();
    renderAll();
    showToast({ type: "success", title: "Zapisano", message: "Wariant tygodnia zmieniony.", timeout: 2000 });
  } catch (e) {
    handleApiError(e, "zapis harmonogramu");
  }
}

function renderVariantsTab() {
  const container = document.getElementById("variants-list");
  const variants = pbGetVariants();

  if (variants.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px;">Brak wariantów. Utwórz pierwszy!</p>';
    return;
  }

  container.innerHTML = variants.map(v => `
    <div class="variant-item" onclick="openVariantEditor('${v.id}')">
      <div>
        <div class="variant-item-name">${v.name}</div>
        <div class="variant-item-desc">${v.description || ""}</div>
      </div>
      <i class="ti ti-chevron-right" style="color: var(--text-secondary)"></i>
    </div>
  `).join("");
}

let _currentVariant = null;

function openVariantEditor(variantId) {
  const modal = document.getElementById("variant-modal");

  if (variantId) {
    _currentVariant = { ...pbGetVariantById(variantId) };
    document.getElementById("variant-modal-title").textContent = "Edytuj wariant";
    document.getElementById("variant-delete-btn").style.display = "block";
  } else {
    _currentVariant = {
      name: "", description: "",
      monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
    };
    document.getElementById("variant-modal-title").textContent = "Nowy wariant";
    document.getElementById("variant-delete-btn").style.display = "none";
  }

  document.getElementById("variant-id").value = _currentVariant.id || "";
  document.getElementById("variant-name").value = _currentVariant.name || "";
  document.getElementById("variant-desc").value = _currentVariant.description || "";

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (const day of days) {
    renderVariantDayTasks(day);
  }

  modal.classList.add("open");
}

function closeVariantEditor(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById("variant-modal").classList.remove("open");
  _currentVariant = null;
  renderAll();
}

function renderVariantDayTasks(day) {
  const container = document.getElementById(`variant-${day}`);
  const tasks = _currentVariant[day] || [];

  container.innerHTML = tasks.map((t, idx) => {
    const templateKey = findTemplateKeyByText(t.text);
    const template = templateKey ? TASK_TEMPLATES[templateKey] : null;
    const isCustomDetail = template && t.detail && !template.details.includes(t.detail);
    const showCustomInput = isCustomDetail || t._customDetail;

    let detailOptions = `<option value="">-- szczegóły --</option>`;
    if (template) {
      detailOptions += template.details.map(d =>
        `<option value="${d}" ${d === t.detail ? "selected" : ""}>${d}</option>`
      ).join("");
    }
    detailOptions += `<option value="__custom__" ${isCustomDetail ? "selected" : ""}>Inna...</option>`;

    return `
    <div class="variant-task-row">
      <select onchange="updateVariantTask('${day}', ${idx}, 'type', this.value)">
        <option value="">-- wybierz --</option>
        ${Object.entries(TASK_TEMPLATES).map(([key, tmpl]) =>
          `<option value="${key}" ${t.text === tmpl.text ? "selected" : ""}>${tmpl.text}</option>`
        ).join("")}
      </select>
      <select onchange="onVariantDetailChange('${day}', ${idx}, this.value)">
        ${detailOptions}
      </select>
      ${showCustomInput ? `<input type="text" class="variant-task-custom" value="${escapeHtml(t.detail || "")}"
        oninput="_currentVariant['${day}'][${idx}].detail = this.value" placeholder="wpisz...">` : ""}
      <button class="btn-icon btn-remove" onclick="removeVariantTask('${day}', ${idx})">
        <i class="ti ti-trash"></i>
      </button>
    </div>
  `}).join("");
}

function findTemplateKeyByText(text) {
  for (const [key, tmpl] of Object.entries(TASK_TEMPLATES)) {
    if (tmpl.text === text) return key;
  }
  return null;
}

function addVariantTask(day) {
  if (!_currentVariant[day]) _currentVariant[day] = [];
  _currentVariant[day].push({ id: `${day}_${Date.now()}`, text: "", detail: "" });
  renderVariantDayTasks(day);
}

function onVariantDetailChange(day, idx, value) {
  if (value === "__custom__") {
    _currentVariant[day][idx]._customDetail = true;
    _currentVariant[day][idx].detail = "";
    renderVariantDayTasks(day);
    const inputs = document.querySelectorAll(`#variant-${day} .variant-task-custom`);
    if (inputs.length) inputs[inputs.length - 1].focus();
  } else {
    _currentVariant[day][idx]._customDetail = false;
    _currentVariant[day][idx].detail = value;
    renderVariantDayTasks(day);
  }
}

function updateVariantTask(day, idx, field, value) {
  if (field === "type") {
    const tmpl = TASK_TEMPLATES[value];
    if (tmpl) {
      _currentVariant[day][idx].text = tmpl.text;
      _currentVariant[day][idx].detail = tmpl.details[0] || "";
      _currentVariant[day][idx].id = `${value}_${day}_${idx}`;
    }
    renderVariantDayTasks(day);
  } else if (field === "detail") {
    _currentVariant[day][idx].detail = value;
  }
}

function removeVariantTask(day, idx) {
  _currentVariant[day].splice(idx, 1);
  renderVariantDayTasks(day);
}

async function saveVariant() {
  _currentVariant.name = document.getElementById("variant-name").value.trim();
  _currentVariant.description = document.getElementById("variant-desc").value.trim();

  if (!_currentVariant.name) {
    showToast({ type: "warning", title: "Błąd", message: "Podaj nazwę wariantu.", timeout: 3000 });
    return;
  }

  try {
    await pbSaveVariant(_currentVariant);
    closeVariantEditor();
    renderVariantsTab();
    renderWeekTab();
    showToast({ type: "success", title: "Zapisano", message: "Wariant zapisany.", timeout: 2000 });
  } catch (e) {
    handleApiError(e, "zapis wariantu");
  }
}

async function deleteCurrentVariant() {
  if (!_currentVariant?.id) return;
  if (!confirm("Usunąć ten wariant?")) return;

  try {
    await pbDeleteVariant(_currentVariant.id);
    closeVariantEditor();
    renderVariantsTab();
    renderWeekTab();
    showToast({ type: "success", title: "Usunięto", message: "Wariant usunięty.", timeout: 2000 });
  } catch (e) {
    handleApiError(e, "usuwanie wariantu");
  }
}

// Focus tab
let _focusItems = [];

function renderFocusTab() {
  const container = document.getElementById("focus-list");

  // Initialize from PB on first render
  if (_focusItems.length === 0) {
    _focusItems = pbGetFocus().map(f => ({ ...f }));
  }

  // Filter out deleted items for display
  const visibleItems = _focusItems.filter(f => !f._deleted);

  if (visibleItems.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px;">Brak zasad. Dodaj pierwszą!</p>';
    return;
  }

  container.innerHTML = visibleItems.map((item) => {
    const idx = _focusItems.indexOf(item);
    return `
    <div class="focus-list-item" data-idx="${idx}">
      <div class="focus-list-item-content">
        <input type="text" value="${escapeHtml(item.title || "")}" placeholder="Tytuł"
               oninput="_focusItems[${idx}].title = this.value; markFocusDirty()">
        <input type="text" value="${escapeHtml(item.description || "")}" placeholder="Opis"
               oninput="_focusItems[${idx}].description = this.value; markFocusDirty()">
      </div>
      <button class="btn-icon btn-remove" onclick="removeFocusItemLocal(${idx})" title="Usuń">
        <i class="ti ti-trash"></i>
      </button>
    </div>
  `}).join("");
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let _focusDirty = false;

function markFocusDirty() {
  _focusDirty = true;
  const saveBtn = document.getElementById("focus-save-btn");
  if (saveBtn) saveBtn.disabled = false;
}

function removeFocusItemLocal(idx) {
  const item = _focusItems[idx];
  if (item.id) {
    item._deleted = true;
  } else {
    _focusItems.splice(idx, 1);
  }
  markFocusDirty();
  renderFocusTab();
}

function addFocusItem() {
  _focusItems.push({ title: "", description: "", order: _focusItems.length });
  markFocusDirty();
  renderFocusTab();
  // Focus the new input
  setTimeout(() => {
    const inputs = document.querySelectorAll("#focus-list input");
    if (inputs.length) inputs[inputs.length - 2]?.focus();
  }, 50);
}

async function saveAllFocus() {
  const saveBtn = document.getElementById("focus-save-btn");
  if (saveBtn) saveBtn.disabled = true;

  try {
    // Delete removed items
    for (const item of _focusItems.filter(f => f._deleted && f.id)) {
      await pbDeleteFocusItem(item.id);
    }

    // Save new/updated items
    const toSave = _focusItems.filter(f => !f._deleted);
    for (let i = 0; i < toSave.length; i++) {
      toSave[i].order = i;
      await pbSaveFocusItem(toSave[i]);
    }

    // Refresh from PB
    await pbFetchFocus();
    _focusItems = pbGetFocus().map(f => ({ ...f }));
    _focusDirty = false;

    renderFocusTab();
    renderFocusCard();
    showToast({ type: "success", title: "Zapisano", message: "Zasady zaktualizowane.", timeout: 2000 });
  } catch (e) {
    handleApiError(e, "zapis zasad");
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function deleteFocusItem(id) {
  if (!confirm("Usunąć tę zasadę?")) return;
  try {
    await pbDeleteFocusItem(id);
    renderFocusTab();
    renderFocusCard();
    showToast({ type: "success", title: "Usunięto", timeout: 1500 });
  } catch (e) {
    handleApiError(e, "usuwanie zasady");
  }
}

// Migration from plan.js to PocketBase
async function migrateFromPlanJS() {
  if (!pbIsLoggedIn()) {
    showToast({ type: "error", title: "Błąd", message: "Musisz być zalogowany.", timeout: 3000 });
    return;
  }

  if (!confirm("Czy na pewno chcesz zaimportować dane z plan.js do PocketBase?\n\nTo doda warianty, harmonogram i zasady focus.")) {
    return;
  }

  const btn = document.getElementById("migrate-btn");
  if (btn) btn.disabled = true;

  try {
    let imported = { variants: 0, schedule: 0, focus: 0 };

    // 1. Import WEEK_VARIANTS
    const variantNameToId = {};
    for (const [key, variant] of Object.entries(PLAN.WEEK_VARIANTS)) {
      const data = {
        name: variant.name || key,
        description: variant.description || "",
        monday: variant.monday || [],
        tuesday: variant.tuesday || [],
        wednesday: variant.wednesday || [],
        thursday: variant.thursday || [],
        friday: variant.friday || [],
        saturday: variant.saturday || [],
        sunday: variant.sunday || []
      };
      const saved = await pbSaveVariant(data);
      variantNameToId[key] = saved.id;
      imported.variants++;
    }

    // 2. Import WEEK_SCHEDULE
    for (const [weekStart, variantKey] of Object.entries(PLAN.WEEK_SCHEDULE)) {
      const variantId = variantNameToId[variantKey];
      if (variantId) {
        await pbSaveSchedule(weekStart, variantId);
        imported.schedule++;
      }
    }

    // 3. Import focus
    for (let i = 0; i < PLAN.focus.length; i++) {
      const item = PLAN.focus[i];
      await pbSaveFocusItem({
        title: item.title,
        description: item.description,
        order: i
      });
      imported.focus++;
    }

    // Refresh data
    await Promise.all([pbFetchVariants(), pbFetchSchedule(), pbFetchFocus()]);
    _focusItems = pbGetFocus().map(f => ({ ...f }));

    renderWeekTab();
    renderVariantsTab();
    renderFocusTab();
    renderFocusCard();
    renderWeeklyPlan();
    renderAll();

    showToast({
      type: "success",
      title: "Import zakończony",
      message: `Zaimportowano: ${imported.variants} wariantów, ${imported.schedule} tygodni, ${imported.focus} zasad.`,
      timeout: 5000
    });

  } catch (e) {
    handleApiError(e, "import danych");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Export for Node.js tests
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    formatDateKey,
    getTasksForDay,
    getTasksForDate,
    getWeekVariant,
    isDayComplete,
    calculateStreak,
    getEffectiveToday,
    setTestToday,
    getWeekOfProgram,
    getWeekStart,
  };
}

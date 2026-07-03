// Constants from PLAN
const START_DATE = PLAN.startDate;
const END_DATE = PLAN.endDate;
const TOTAL_DAYS =
  Math.round((END_DATE - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

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
  const key = getStorageKey(date);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : {};
}

function setDayData(date, data) {
  const key = getStorageKey(date);
  localStorage.setItem(key, JSON.stringify(data));
}

function get4BLDCount(date) {
  const dateKey = formatDateKey(date);
  if (PLAN.ramp4BLD.dates2attempts.includes(dateKey)) return 2;
  if (date >= PLAN.ramp4BLD.fullRampStart) return 4;
  return 0;
}

function getTasksForDay(date) {
  const dayOfWeek = date.getDay();
  const dayName = DAY_MAP[dayOfWeek];
  const dayTasks = PLAN.tasks[dayName] || [];
  const tasks = [];
  const count4bld = get4BLDCount(date);

  for (const taskDef of dayTasks) {
    if (taskDef.type === "4bld_ramp") {
      if (count4bld > 0) {
        for (let i = 1; i <= count4bld; i++) {
          tasks.push({
            id: `${taskDef.idPrefix}_${i}`,
            text: `${taskDef.text} ${i}`,
            detail: taskDef.detail || "",
          });
        }
      }
    } else {
      const task = {
        id: taskDef.id,
        text: taskDef.text,
        detail: taskDef.detail || "",
      };
      if (taskDef.or) {
        task.or = {
          id: taskDef.or.id,
          text: taskDef.or.text,
          detail: taskDef.or.detail || "",
        };
      }
      tasks.push(task);
    }
  }

  return tasks;
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

function getEffectiveToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (now >= START_DATE && now <= END_DATE) {
    return now;
  } else if (now < START_DATE) {
    return new Date(START_DATE);
  } else {
    return new Date(END_DATE);
  }
}

function getWeekOfProgram(date) {
  const diffTime = date - START_DATE;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff));
}

// Render functions
function renderStatsBar() {
  let fullDays = 0;
  let partialDays = 0;
  const today = getEffectiveToday();

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const date = new Date(START_DATE);
    date.setDate(date.getDate() + i);

    const status = isDayComplete(date);
    if (status.full) fullDays++;
    else if (status.partial) partialDays++;
  }

  document.getElementById("days-progress").textContent =
    `${fullDays}/${TOTAL_DAYS}`;
  document.getElementById("streak-count").textContent = calculateStreak();

  // Week progress
  const weekProgressEl = document.getElementById("week-progress");
  weekProgressEl.innerHTML = "";

  const weekStart = getWeekStart(today);
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);

    const dot = document.createElement("div");
    dot.className = "day-dot";

    if (dayDate >= START_DATE && dayDate <= END_DATE) {
      const status = isDayComplete(dayDate);
      if (status.full) dot.classList.add("full");
      else if (status.partial) dot.classList.add("partial");
    }

    weekProgressEl.appendChild(dot);
  }
}

function renderHeatmap() {
  const grid = document.getElementById("heatmap-grid");
  grid.innerHTML = "";
  const today = getEffectiveToday();

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const date = new Date(START_DATE);
    date.setDate(date.getDate() + i);

    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    cell.title = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;

    if (formatDateKey(date) === formatDateKey(today)) {
      cell.classList.add("today");
    }

    const status = isDayComplete(date);
    if (status.full) {
      cell.classList.add("full");
    } else if (status.partial) {
      cell.classList.add("partial");
    } else if (date > today) {
      cell.classList.add("future");
    }

    grid.appendChild(cell);
  }
}

function toggleHeatmap() {
  document
    .getElementById("heatmap-section")
    .classList.toggle("collapsed");
}

function renderFocusCard() {
  const container = document.getElementById("focus-content");
  container.innerHTML = "";

  for (const item of PLAN.focus) {
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

  document.getElementById("today-date").textContent =
    `${dayName}, ${dateStr}`;

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

  // Group days by month and week
  const months = {};

  for (let i = 0; i < TOTAL_DAYS; i++) {
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
        <span class="week-title">Tydzień ${parseInt(weekNum) + 1}</span>
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

  document.getElementById("modal-title").textContent =
    `${dayName}, ${dateStr}`;

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

function renderAll() {
  renderStatsBar();
  renderHeatmap();
  renderFocusCard();
  renderTodayCard();
  renderHistory();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  renderAll();

  // Auto-scroll to today card
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

// Export for Node.js tests
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    formatDateKey,
    get4BLDCount,
    getTasksForDay,
    isDayComplete,
    calculateStreak,
    getEffectiveToday,
    getWeekOfProgram,
    getWeekStart,
  };
}

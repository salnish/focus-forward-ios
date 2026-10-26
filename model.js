(function (root) {
  "use strict";
  const CATEGORIES = ["Life", "Work", "Workout", "Career", "Brain"];
  const DEFAULT_GOALS = { work: 120, water: 8, workout: 15, tasks: 3 };
  const TEMPLATES = [
    {
      title: "Make one meaningful work move",
      step: "Open the file and write the next action.",
      category: "Work",
      minutes: 25,
    },
    {
      title: "Move at home",
      step: "Put on comfortable shoes and clear a little space.",
      category: "Workout",
      minutes: 10,
    },
    {
      title: "Move your career forward",
      step: "Find one role or practise one interview answer.",
      category: "Career",
      minutes: 15,
    },
  ];
  function dateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return false;
    const parsed = new Date(`${value}T12:00:00`);
    return !Number.isNaN(parsed.getTime()) && dateKey(parsed) === value;
  }
  function uid() {
    return (
      root.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
  }
  function createState() {
    return {
      version: 1,
      goals: { ...DEFAULT_GOALS },
      days: {},
      tasks: [],
      jobs: [],
      reminders: [],
      events: [],
      timer: null,
      energy: "steady",
    };
  }
  function ensureDay(state, date = dateKey()) {
    if (!state.days[date]) {
      state.days[date] = {
        water: 0,
        workSeconds: 0,
        workout: 0,
        brain: 0,
        goals: { ...state.goals },
      };
      TEMPLATES.forEach((template) =>
        state.tasks.push({
          ...template,
          id: uid(),
          date,
          done: false,
          recurring: true,
          priority: false,
        }),
      );
    }
    return state.days[date];
  }
  function addEvent(state, type, label, amount = 1, date = dateKey()) {
    const event = {
      id: uid(),
      type,
      label: String(label).slice(0, 240),
      amount,
      date,
      at: new Date().toISOString(),
    };
    state.events.push(event);
    return event;
  }
  function addTask(state, values) {
    if (!values.title?.trim()) throw new Error("Give your task a name.");
    if (!validDate(values.date)) throw new Error("Choose a valid date.");
    const task = {
      id: uid(),
      title: values.title.trim().slice(0, 160),
      step: String(values.step || "")
        .trim()
        .slice(0, 240),
      category: CATEGORIES.includes(values.category) ? values.category : "Life",
      minutes: Math.min(240, Math.max(1, Number(values.minutes) || 5)),
      priority: !!values.priority,
      recurring: false,
      date: values.date,
      done: false,
    };
    state.tasks.push(task);
    return task;
  }
  function toggleTask(state, id, date = dateKey()) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.done = !task.done;
    task.completedDate = task.done ? date : null;
    if (
      task.done &&
      !state.events.some(
        (event) => event.type === "task" && event.taskId === id,
      )
    ) {
      addEvent(state, "task", task.title, 1, date).taskId = id;
    }
  }
  function missedTasks(state, date = dateKey()) {
    return state.tasks.filter((task) => !task.done && task.date < date);
  }
  function logMetric(state, metric, amount, date = dateKey()) {
    if (
      !["water", "workSeconds", "workout", "brain"].includes(metric) ||
      !Number.isFinite(amount)
    )
      return;
    const day = ensureDay(state, date);
    day[metric] = Math.max(0, day[metric] + amount);
    if (amount > 0)
      addEvent(
        state,
        metric,
        {
          water: "A glass of water",
          workSeconds: "Focus session",
          workout: "Home workout",
          brain: "Brain practice",
        }[metric],
        amount,
        date,
      );
  }
  function finishTimer(state, now = Date.now()) {
    if (!state.timer) return 0;
    const timer = state.timer;
    const remaining = timer.running
      ? Math.max(0, Math.ceil((timer.end - now) / 1000))
      : timer.remaining;
    const elapsed = Math.max(0, Math.min(timer.total, timer.total - remaining));
    if (elapsed > 0) logMetric(state, "workSeconds", elapsed, timer.date);
    state.timer = null;
    return elapsed;
  }
  function xp(state) {
    return state.events.reduce(
      (total, event) =>
        total +
        ({
          task: 20,
          water: 3,
          workout: Math.min(50, event.amount * 2),
          workSeconds: Math.min(60, Math.floor(event.amount / 60)),
          brain: 15,
          job: 25,
        }[event.type] || 0),
      0,
    );
  }
  function achievements(state) {
    const events = state.events;
    const days = Object.values(state.days);
    return [
      {
        name: "First move",
        detail: "Finish your first task",
        icon: "flag",
        earned: events.some((event) => event.type === "task"),
      },
      {
        name: "In the zone",
        detail: "Log 60 focus minutes",
        icon: "timer",
        earned: days.reduce((sum, day) => sum + day.workSeconds, 0) >= 3600,
      },
      {
        name: "Well watered",
        detail: "Reach a daily water goal",
        icon: "droplets",
        earned: days.some((day) => day.water >= day.goals.water),
      },
      {
        name: "Showing up",
        detail: "Move on three different days",
        icon: "activity",
        earned: days.filter((day) => day.workout > 0).length >= 3,
      },
      {
        name: "Door opener",
        detail: "Add your first job opportunity",
        icon: "briefcase-business",
        earned: events.some((event) => event.type === "job"),
      },
      {
        name: "Curious mind",
        detail: "Complete five brain practices",
        icon: "brain",
        earned: days.reduce((sum, day) => sum + day.brain, 0) >= 5,
      },
    ];
  }
  function validateState(value) {
    const fail = () => {
      throw new Error("This is not a valid Focus Forward backup.");
    };
    const object = (item) =>
      item && typeof item === "object" && !Array.isArray(item);
    const number = (item, max = 1e9) =>
      typeof item === "number" &&
      Number.isFinite(item) &&
      item >= 0 &&
      item <= max;
    const text = (item, max = 1000) =>
      typeof item === "string" && item.length <= max;
    const id = (item) =>
      typeof item === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(item);
    const goals = (item) =>
      object(item) &&
      Object.keys(DEFAULT_GOALS).every(
        (key) =>
          number(
            item[key],
            key === "work"
              ? 1440
              : key === "water"
                ? 30
                : key === "workout"
                  ? 300
                  : 50,
          ) && item[key] >= 1,
      );
    if (
      !object(value) ||
      value.version !== 1 ||
      !goals(value.goals) ||
      !object(value.days)
    )
      fail();
    for (const [date, day] of Object.entries(value.days)) {
      if (
        !validDate(date) ||
        !object(day) ||
        !goals(day.goals) ||
        !["water", "workSeconds", "workout", "brain"].every((key) =>
          number(day[key]),
        )
      )
        fail();
    }
    if (
      !["tasks", "jobs", "reminders", "events"].every(
        (key) => Array.isArray(value[key]) && value[key].length <= 100000,
      )
    )
      fail();
    if (
      !value.tasks.every(
        (task) =>
          object(task) &&
          id(task.id) &&
          text(task.title, 160) &&
          text(task.step, 240) &&
          CATEGORIES.includes(task.category) &&
          validDate(task.date) &&
          typeof task.done === "boolean" &&
          number(task.minutes, 240) &&
          task.minutes >= 1,
      )
    )
      fail();
    if (new Set(value.tasks.map((task) => task.id)).size !== value.tasks.length)
      fail();
    if (
      !value.jobs.every(
        (job) =>
          object(job) &&
          id(job.id) &&
          text(job.company, 100) &&
          text(job.role, 160) &&
          text(job.notes, 1000) &&
          ["Saved", "Applied", "Interview", "Offer", "Closed"].includes(
            job.status,
          ) &&
          validDate(job.date),
      )
    )
      fail();
    if (
      !value.reminders.every(
        (reminder) =>
          object(reminder) &&
          id(reminder.id) &&
          text(reminder.title, 160) &&
          typeof reminder.time === "string" &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time) &&
          typeof reminder.enabled === "boolean",
      )
    )
      fail();
    if (
      !value.events.every(
        (event) =>
          object(event) &&
          id(event.id) &&
          text(event.type, 40) &&
          text(event.label, 240) &&
          validDate(event.date) &&
          text(event.at, 50) &&
          number(event.amount) &&
          (event.note === undefined || text(event.note, 500)),
      )
    )
      fail();
    if (!["gentle", "steady", "stretch"].includes(value.energy)) fail();
    if (
      value.timer !== null &&
      (!object(value.timer) ||
        !number(value.timer.total, 7200) ||
        value.timer.total < 1 ||
        !number(value.timer.remaining, value.timer.total) ||
        !number(value.timer.end, 1e15) ||
        typeof value.timer.running !== "boolean" ||
        !validDate(value.timer.date) ||
        !text(value.timer.label, 160))
    )
      fail();
    return value;
  }
  function icsEscape(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
  }
  function icsFold(line) {
    const encoder = new TextEncoder();
    const parts = [];
    let current = "";
    let bytes = 0;
    for (const char of line) {
      const size = encoder.encode(char).length;
      if (bytes + size > (parts.length ? 74 : 75)) {
        parts.push(current);
        current = "";
        bytes = 0;
      }
      current += char;
      bytes += size;
    }
    parts.push(current);
    return parts.join("\r\n ");
  }
  // Floating local times keep alerts at the same clock time on the device.
  function buildIcs(reminders, now = new Date()) {
    const stamp = now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    const sequence = Math.floor(now.getTime() / 1000);
    const day = dateKey(now).replace(/-/g, "");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Focus Forward//Reminders//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    for (const reminder of reminders.filter((item) => item.enabled)) {
      const [hour, minute] = reminder.time.split(":");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${reminder.id}@focus-forward`,
        `DTSTAMP:${stamp}`,
        `SEQUENCE:${sequence}`,
        `DTSTART:${day}T${hour}${minute}00`,
        "DURATION:PT15M",
        "RRULE:FREQ=DAILY",
        `SUMMARY:${icsEscape(reminder.title)}`,
        "TRANSP:TRANSPARENT",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${icsEscape(reminder.title)}`,
        "TRIGGER:PT0S",
        "END:VALARM",
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    return lines.map(icsFold).join("\r\n") + "\r\n";
  }
  const api = {
    buildIcs,
    CATEGORIES,
    DEFAULT_GOALS,
    dateKey,
    validDate,
    uid,
    createState,
    ensureDay,
    addEvent,
    addTask,
    toggleTask,
    missedTasks,
    logMetric,
    finishTimer,
    xp,
    achievements,
    validateState,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FocusModel = api;
})(typeof window !== "undefined" ? window : globalThis);

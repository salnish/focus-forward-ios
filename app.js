(() => {
  "use strict";
  const M = window.FocusModel;
  const STORAGE_KEY = "focus-forward-v1";
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const iconButton = (name, label, attrs = "") =>
    `<button class="icon-button" title="${escape(label)}" aria-label="${escape(label)}" ${attrs}>${icon(name)}</button>`;
  const progress = (value) =>
    `<div class="progress"><span style="width:${Math.max(0, Math.min(100, value))}%"></span></div>`;
  const views = {
    today: ["Today", "layout-dashboard"],
    focus: ["Focus room", "timer"],
    movement: ["Move & hydrate", "activity"],
    career: ["Career & future", "briefcase-business"],
    brain: ["Brain gym", "brain"],
    review: ["Reflect & achievements", "chart-no-axes-combined"],
    reminders: ["Reminders", "bell"],
    settings: ["Settings & backup", "settings-2"],
  };
  const routines = [
    {
      name: "The gentle reset",
      minutes: 5,
      icon: "sun",
      type: "LOW IMPACT",
      description: "A little mobility, a fresh starting point.",
      steps: [
        ["Easy march", "60 seconds, at a comfortable pace"],
        ["Shoulder rolls", "60 seconds, small slow circles"],
        ["Standing side reaches", "60 seconds, alternate sides"],
        ["Supported heel raises", "60 seconds, hold a chair if needed"],
        ["Slow walk & breathe", "60 seconds, let your breathing settle"],
      ],
    },
    {
      name: "Living room circuit",
      minutes: 12,
      icon: "dumbbell",
      type: "BODYWEIGHT",
      description: "No equipment. Two rounds. Your own pace.",
      steps: [
        ["Warm up", "2 minutes of gentle marching"],
        ["Chair sit-to-stand", "40 seconds, then rest 20 seconds"],
        ["Wall push-ups", "40 seconds, then rest 20 seconds"],
        ["Standing knee lifts", "40 seconds, then rest 20 seconds"],
        ["Side steps", "40 seconds, then rest 20 seconds"],
        ["Repeat the four moves", "4 minutes, with the same rest breaks"],
        ["Cool down", "2 minutes of slow walking"],
      ],
    },
    {
      name: "Desk-to-done",
      minutes: 8,
      icon: "footprints",
      type: "MOVEMENT BREAK",
      description: "Step away from the screen and get moving.",
      steps: [
        ["Warm-up walk", "2 minutes around your room"],
        ["Step touches", "2 minutes, stay comfortable"],
        ["Alternating heel taps", "2 minutes, with a chair for balance"],
        ["Easy walk", "2 minutes, gradually slow down"],
      ],
    },
  ];
  const drills = [
    {
      name: "Notice & return",
      minutes: 2,
      icon: "scan-eye",
      type: "ATTENTION",
      description: "A short attention practice, without a perfect score.",
      prompt:
        "Choose one nearby object. Notice its edges, texture, and colour. When your attention wanders, gently bring it back. Each return counts.",
    },
    {
      name: "Recall & connect",
      minutes: 3,
      icon: "lightbulb",
      type: "ACTIVE RECALL",
      description: "Turn something you learned into something you remember.",
      prompt:
        "Pick one concept you learned recently. Without looking it up, write three things you remember. Add one example from your work. When time is up, check your notes.",
    },
    {
      name: "The interview rep",
      minutes: 5,
      icon: "messages-square",
      type: "CAREER PRACTICE",
      description: "One answer today. A little more ready tomorrow.",
      prompt:
        "Tell the story of a problem you solved. What was the situation? What did you need to do? What action did you take? What changed? Say your answer out loud, then note one improvement.",
    },
    {
      name: "Untangle the next step",
      minutes: 2,
      icon: "route",
      type: "PLANNING",
      description: "Give a stuck task a smaller starting line.",
      prompt:
        "Name one thing you are avoiding. Write the smallest visible action you could take in two minutes. Make it smaller once more. What could you open, place, or write right now?",
    },
    {
      name: "Future-you postcard",
      minutes: 4,
      icon: "send",
      type: "FUTURE PLANNING",
      description: "Make one future possibility a little more concrete.",
      prompt:
        "Imagine a workday six months from now. What are you doing more of? What skill made that possible? Write one step for this week and one person or resource that could help.",
    },
    {
      name: "One problem, three paths",
      minutes: 3,
      icon: "git-branch",
      type: "FLEXIBLE THINKING",
      description: "Explore alternatives before picking a next move.",
      prompt:
        "Pick a small real-world problem. Write three different approaches: the easiest, the most creative, and the one you would recommend to a friend. Choose one tiny experiment.",
    },
  ];
  let state;
  let storageIssue = "";
  let today = M.dateKey();
  let view = views[location.hash.slice(1)] ? location.hash.slice(1) : "today";
  let filter = "All";
  let preset = 25;
  let focusLabel = "One thing at a time";
  let toastTimeout;
  let exercise = null;
  let audioEnabled = false;
  let audioContext;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? M.validateState(JSON.parse(raw)) : M.createState();
  } catch (error) {
    state = M.createState();
    storageIssue =
      "Saved data could not be loaded. The original storage has not been overwritten. Export this session or restore a valid backup in Settings.";
  }
  M.ensureDay(state, today);
  function save() {
    if (storageIssue) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      storageIssue =
        "Browser storage is unavailable or full. Changes are temporary. Export a backup from Settings before leaving.";
      toast(storageIssue);
    }
  }
  function icons() {
    window.lucide?.createIcons();
  }
  function toast(message) {
    $("#toast-region").innerHTML =
      `<div class="toast">${escape(message)}</div>`;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      $("#toast-region").innerHTML = "";
    }, 6000);
  }
  function day() {
    return M.ensureDay(state, today);
  }
  function todayTasks() {
    return state.tasks.filter(
      (task) => task.date === today || task.completedDate === today,
    );
  }
  function completedToday() {
    return state.tasks.filter(
      (task) => task.done && task.completedDate === today,
    ).length;
  }
  function formatDate(date, options = { month: "short", day: "numeric" }) {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);
  }
  function minutes(seconds) {
    return Math.floor(seconds / 60);
  }
  function timeString(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  function remaining() {
    return state.timer
      ? state.timer.running
        ? Math.max(0, Math.ceil((state.timer.end - Date.now()) / 1000))
        : state.timer.remaining
      : preset * 60;
  }
  function header(title, subtitle, action = "") {
    return `<div class="page-heading"><div><p class="eyebrow">${escape(formatDate(today, { weekday: "long", month: "long", day: "numeric" }))}</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${action}</div>`;
  }
  function taskRow(task, missed = false) {
    return `<div class="task-row ${task.done ? "done" : ""}"><input class="task-check" type="checkbox" aria-label="Complete ${escape(task.title)}" data-task-check="${task.id}" ${task.done ? "checked" : ""}><div class="task-body"><span class="task-title">${escape(task.title)}</span>${task.step ? `<p class="task-step">${escape(task.step)}</p>` : ""}<div class="task-meta"><span class="tag ${task.category}">${task.category}</span><span>${task.minutes} min</span>${task.priority ? '<span class="priority">Priority</span>' : ""}${missed ? `<span>From ${escape(formatDate(task.date))}</span>` : ""}</div></div><div class="task-tools">${missed ? iconButton("corner-up-right", "Bring to today", `data-reschedule="${task.id}"`) : iconButton("play", "Focus on this task", `data-focus-task="${task.id}"`)}${iconButton("pencil", "Edit task", `data-edit-task="${task.id}"`)}${iconButton("trash-2", "Delete task", `data-delete-task="${task.id}"`)}</div></div>`;
  }
  function timerPanel() {
    const timer = state.timer;
    return `<section class="focus-panel"><div class="section-head"><h2>${icon("timer")} A little focus</h2><span class="tag">${timer?.running ? "IN SESSION" : "YOUR PACE"}</span></div><p class="eyebrow">PROTECT A LITTLE TIME</p><div class="timer-face" id="timer-display" role="timer" aria-label="Focus time remaining">${timeString(remaining())}</div><div class="timer-label">${escape(timer?.label || focusLabel)}</div>${progress(timer ? (1 - remaining() / timer.total) * 100 : 0)}<div class="timer-presets" aria-label="Focus duration">${[5, 15, 25, 45].map((value) => `<button ${timer ? "disabled" : ""} class="${preset === value ? "selected" : ""}" data-preset="${value}" aria-pressed="${preset === value}">${value}m</button>`).join("")}</div><div class="timer-controls"><button class="button" data-action="timer-toggle">${icon(timer?.running ? "pause" : "play")}${timer?.running ? "Pause" : timer ? "Resume" : "Start focus"}</button>${timer ? `<button class="button secondary" data-action="timer-finish">${icon("check")} Finish</button>` : ""}</div><p class="focus-note">${timer ? "A pause is allowed. Come back when you are ready." : "No perfect session required. Just a place to begin."}</p></section>`;
  }
  function weekDates() {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${today}T12:00:00`);
      date.setDate(date.getDate() - 6 + index);
      return M.dateKey(date);
    });
  }
  function weekStrip() {
    return `<section class="week-section"><div class="section-head"><h2>Your last 7 days</h2><small>Every return counts</small></div><div class="week-grid">${weekDates()
      .map((date) => {
        const count = state.events.filter(
          (event) => event.date === date,
        ).length;
        return `<div class="week-day">${formatDate(date, { weekday: "short" })}<div class="week-cell ${count > 0 ? "active" : ""} ${count >= 5 ? "strong" : ""} ${date === today ? "today" : ""}" title="${date}: ${count} activities">${count || "&middot;"}</div></div>`;
      })
      .join("")}</div></section>`;
  }
  function todayView() {
    const data = day();
    const goals = data.goals;
    const done = completedToday();
    const missed = M.missedTasks(state, today).length;
    const taskList = todayTasks()
      .filter((task) => filter === "All" || task.category === filter)
      .sort(
        (left, right) =>
          Number(left.done) - Number(right.done) ||
          Number(right.priority) - Number(left.priority),
      );
    const quests = {
      gentle: [
        "The two-minute opening",
        "Pick one task. Make the first step almost ridiculously small.",
        2,
      ],
      steady: [
        "One distraction-free sprint",
        "One task, one short sprint. Collect a little momentum.",
        15,
      ],
      stretch: [
        "Make the brave first move",
        "Send the application, practise the answer, or start the hard bit.",
        25,
      ],
    };
    const quest = quests[state.energy];
    const metrics = [
      [
        "Focus time",
        "timer",
        minutes(data.workSeconds),
        `/ ${goals.work} min`,
        (data.workSeconds / (goals.work * 60)) * 100,
        "focus",
        "Open focus room",
      ],
      [
        "Water",
        "droplets",
        data.water,
        `/ ${goals.water} glasses`,
        (data.water / goals.water) * 100,
        "water-add",
        "Log one glass of water",
      ],
      [
        "Movement",
        "activity",
        data.workout,
        `/ ${goals.workout} min`,
        (data.workout / goals.workout) * 100,
        "movement",
        "Open movement",
      ],
      [
        "Daily wins",
        "circle-check",
        done,
        `/ ${goals.tasks} tasks`,
        (done / goals.tasks) * 100,
        "add-task",
        "Add a task",
      ],
    ];
    return `${header("Your next small win.", "A fresh start, at whatever pace feels right.", `<button class="button" data-action="add-task">${icon("plus")} Add a task</button>`)}<div class="energy-line"><span class="energy-label">${icon("sun")} What is your energy like today?</span><div class="segmented" aria-label="Today's energy">${[
      ["gentle", "Keep it gentle"],
      ["steady", "Feeling steady"],
      ["stretch", "Up for a challenge"],
    ]
      .map(
        ([value, label]) =>
          `<button class="${state.energy === value ? "selected" : ""}" data-energy="${value}" aria-pressed="${state.energy === value}">${label}</button>`,
      )
      .join(
        "",
      )}</div></div><section class="quest-band"><div class="quest-icon">${icon("sparkles")}</div><div class="quest-copy"><p class="eyebrow">TODAY'S SIDE QUEST &nbsp; +20 XP ON COMPLETION</p><strong>${quest[0]}</strong><p>${quest[1]}</p></div><button class="button secondary small" data-action="challenge">${icon("arrow-up-right")} Take the challenge</button></section><div class="metric-grid">${metrics.map(([label, image, value, goal, percent, action, actionLabel]) => `<article class="metric"><div class="metric-top">${label}${icon(image)}</div><div class="metric-value">${value}<small>${goal}</small></div><div class="metric-bottom">${progress(percent)}<button class="metric-action" data-action="${action}" title="${actionLabel}" aria-label="${actionLabel}">${icon(action === "water-add" || action === "add-task" ? "plus" : "arrow-up-right")}</button></div></article>`).join("")}</div><div class="dashboard-grid"><section><div class="section-head"><h2>Small steps, big picture <small>${done} done today</small></h2><button class="text-button" data-action="add-task">${icon("plus")} New</button></div><div class="filters" aria-label="Task category">${["All", ...M.CATEGORIES].map((category) => `<button class="filter ${filter === category ? "selected" : ""}" data-filter="${category}" aria-pressed="${filter === category}">${category}</button>`).join("")}</div>${taskList.length ? taskList.map((task) => taskRow(task)).join("") : `<div class="empty">${icon("circle-check")}Nothing here right now. A little breathing room.</div>`}<div class="return-band">${icon("corner-up-right")}<div><strong>${missed ? `${missed} unfinished ${missed === 1 ? "step" : "steps"}` : "A fresh page"}</strong><br>${missed ? "Not a debt. Just a chance to choose again." : "No missed tasks waiting for you."}</div><button class="text-button" data-view="review">Review ${icon("arrow-right")}</button></div></section><aside>${timerPanel()}${weekStrip()}</aside></div>`;
  }
  function focusView() {
    const tasks = todayTasks().filter((task) => !task.done);
    return `${header("One thing at a time.", "Make the start small. Let the rest wait.")}<div class="focus-view">${timerPanel()}<section><div class="section-head"><h2>Choose your next step</h2><button class="text-button" data-action="add-task">${icon("plus")} Add</button></div>${tasks.length ? tasks.map((task) => `<div class="list-row">${icon("circle")}<div><strong>${escape(task.title)}</strong><small>${escape(task.step || `${task.minutes} minutes is a starting point.`)}</small></div>${iconButton("play", "Choose this task", `data-focus-task="${task.id}"`)}</div>`).join("") : '<div class="empty">Your list is clear. A quiet moment counts.</div>'}<form id="manual-focus" class="inline-form"><label class="field">Already focused? Log minutes<input name="minutes" type="number" min="1" max="720" required placeholder="25"></label><button class="button secondary" type="submit">${icon("plus")} Log time</button></form><label class="checkbox-label"><input type="checkbox" id="sound-toggle" ${audioEnabled ? "checked" : ""}> Sound when a session ends</label>${weekStrip()}</section></div>`;
  }
  function movementView() {
    const data = day();
    return `${header("A little movement. A little care.", "No all-or-nothing days here.")}<section class="routine-banner"><div><p class="eyebrow">YOUR BODY, YOUR PACE</p><h2>Make a little room to move.</h2><p>${data.workout} of ${data.goals.workout} movement minutes today.</p><button class="button" data-routine="0">${icon("play")} Start with 5 minutes</button></div><img src="assets/movement.jpg" alt="People practising bodyweight movements on exercise mats in a bright studio" width="480" height="320"></section><div class="section-head"><h2>Your home workout menu</h2><small>No equipment required</small></div><div class="routine-grid">${routines.map((routine, index) => `<article class="activity-card">${icon(routine.icon)}<p class="eyebrow">${routine.type} &middot; ${routine.minutes} MIN</p><h3>${routine.name}</h3><p>${routine.description}</p><button class="button secondary small" data-routine="${index}">${icon("play")} Open routine</button></article>`).join("")}</div><p class="notice">Choose comfortable movements and skip anything painful. Stop if you feel dizzy or unwell. These are general activity ideas, not individual medical advice.</p><div class="two-column"><section><form id="workout-log" class="inline-form"><label class="field">Movement minutes<input name="minutes" type="number" min="1" max="300" placeholder="10" required></label><button class="button" type="submit">${icon("check")} Log movement</button></form></section><section class="settings-section"><div class="section-head"><h2>${icon("droplets")} A water break?</h2><strong>${data.water} / ${data.goals.water}</strong></div>${progress((data.water / data.goals.water) * 100)}<div class="actions" style="margin-top:18px"><button class="button secondary" data-action="water-minus" ${data.water === 0 ? "disabled" : ""}>${icon("minus")} One less</button><button class="button" data-action="water-add">${icon("plus")} One glass</button></div><p>One glass is about 250 ml. Your goal is adjustable, not medical guidance.</p></section></div>`;
  }
  function careerView() {
    const stages = ["Saved", "Applied", "Interview", "Offer", "Closed"];
    return `${header("Build your next chapter.", "One opportunity. One skill. One step closer.", `<button class="button" data-action="add-job">${icon("plus")} Add opportunity</button>`)}<div class="pipeline">${stages.map((status) => `<div><strong>${state.jobs.filter((job) => job.status === status).length}</strong>${status}</div>`).join("")}</div><section><div class="section-head"><h2>Your opportunities</h2><small>${state.jobs.length} total</small></div>${state.jobs.length ? state.jobs.map((job) => `<article class="job-row"><div><h3>${escape(job.role)}</h3><p>${escape(job.company)} &middot; ${escape(formatDate(job.date))}</p></div><p class="job-notes">${escape(job.notes || "No next step added yet.")}</p><select aria-label="Status for ${escape(job.role)} at ${escape(job.company)}" data-job-status="${job.id}">${stages.map((status) => `<option ${job.status === status ? "selected" : ""}>${status}</option>`).join("")}</select><div class="actions">${iconButton("pencil", "Edit opportunity", `data-edit-job="${job.id}"`)}${iconButton("trash-2", "Delete opportunity", `data-delete-job="${job.id}"`)}</div></article>`).join("") : `<div class="empty">${icon("briefcase-business")}Your next chapter has room for a first opportunity.</div>`}</section><section class="week-section"><div class="section-head"><h2>Invest in future you</h2></div><div class="exercise-grid">${[
      [
        "Interview practice",
        "Tell one clear story about a problem you solved.",
        "messages-square",
        "The interview rep",
      ],
      [
        "Skill-building block",
        "Choose one skill and give it 15 focused minutes.",
        "graduation-cap",
        "Learn one career skill",
      ],
      [
        "A longer view",
        "Choose one concrete step toward your six-month goal.",
        "compass",
        "Plan one step for future me",
      ],
    ]
      .map(
        ([title, description, image, task]) =>
          `<article class="activity-card">${icon(image)}<h3>${title}</h3><p>${description}</p><button class="button secondary small" data-career-task="${task}">${icon("plus")} Make it a task</button></article>`,
      )
      .join("")}</div></section>`;
  }
  function brainView() {
    return `${header("Stay curious. Start small.", `${day().brain} brain ${day().brain === 1 ? "practice" : "practices"} completed today.`)}<div class="exercise-grid">${drills.map((drill, index) => `<article class="activity-card">${icon(drill.icon)}<p class="eyebrow">${drill.type} &middot; ${drill.minutes} MIN</p><h3>${drill.name}</h3><p>${drill.description}</p><button class="button secondary small" data-drill="${index}">${icon("play")} Begin practice</button></article>`).join("")}</div><p class="notice">These are optional attention, reflection, and learning practices, not ADHD treatment or a clinical brain-training program. Benefits vary. Professional support and accommodations can matter more than any productivity tool.</p>`;
  }
  function reviewView() {
    const missed = M.missedTasks(state, today);
    const earned = M.achievements(state);
    const recent = [...state.events].reverse().slice(0, 30);
    const dates = weekDates();
    const max = Math.max(
      1,
      ...dates.map(
        (date) => state.events.filter((event) => event.date === date).length,
      ),
    );
    return `${header("Look at how you showed up.", "Progress is a collection of returns, not a perfect streak.")}<div class="section-head"><h2>A week of little moves</h2><span class="tag">${M.xp(state)} TOTAL XP</span></div><div class="history-bars">${dates
      .map((date) => {
        const count = state.events.filter(
          (event) => event.date === date,
        ).length;
        return `<div class="history-bar"><b>${count}</b><span style="height:${(count / max) * 80}%"></span><small>${escape(formatDate(date, { weekday: "short" }))}</small></div>`;
      })
      .join(
        "",
      )}</div><div class="section-head"><h2>Milestones, not expectations</h2><small>${earned.filter((item) => item.earned).length} / ${earned.length} unlocked</small></div><div class="achievements">${earned.map((item) => `<article class="achievement ${item.earned ? "earned" : ""}">${icon(item.icon)}<div><strong>${item.name}${item.earned ? " / Unlocked" : ""}</strong><small>${item.detail}</small></div></article>`).join("")}</div><div class="two-column"><section><div class="section-head"><h2>A chance to choose again</h2>${missed.length ? '<button class="text-button" data-action="bring-all">Bring all to today</button>' : ""}</div><p class="subtitle">Keep what matters. Let go of what does not.</p>${missed.length ? missed.map((task) => taskRow(task, true)).join("") : `<div class="empty">${icon("leaf")}No unfinished tasks from earlier days.</div>`}</section><section><div class="section-head"><h2>Your activity trail</h2><small>Latest 30</small></div>${recent.length ? recent.map((event) => `<div class="list-row">${icon({ task: "circle-check", water: "droplets", workSeconds: "timer", workout: "activity", brain: "brain", job: "briefcase-business" }[event.type] || "sparkles")}<div><strong>${escape(event.label)}</strong><small>${escape(formatDate(event.date))}${event.type === "workSeconds" ? ` &middot; ${minutes(event.amount)} min` : event.type === "workout" ? ` &middot; ${event.amount} min` : ""}</small></div></div>`).join("") : '<div class="empty">Your first small move will appear here.</div>'}</section></div>`;
  }
  function remindersView() {
    const permission =
      "Notification" in window ? Notification.permission : "unsupported";
    const canExport = state.reminders.some((reminder) => reminder.enabled);
    const notificationNote = {
      unsupported:
        "Chrome on iPhone does not offer browser notifications for websites.",
      denied: "Notifications are blocked in your browser site settings.",
      granted: "Browser notifications are enabled.",
      default: "Allow notifications for visible nudges where your browser supports them.",
    }[permission];
    return `${header("A nudge, not a nag.", "Leave a little kindness for later.", `<button class="button" data-action="add-reminder">${icon("plus")} Add reminder</button>`)}<div class="section-head"><h2>Daily reminders</h2><span class="tag">LOCAL TIME</span></div>${state.reminders.length ? state.reminders.map((reminder) => `<div class="reminder-row"><input type="checkbox" data-reminder-toggle="${reminder.id}" ${reminder.enabled ? "checked" : ""} aria-label="Enable ${escape(reminder.title)}"><span class="reminder-time">${escape(reminder.time)}</span><strong>${escape(reminder.title)}</strong>${iconButton("pencil", "Edit reminder", `data-edit-reminder="${reminder.id}"`)}${iconButton("trash-2", "Delete reminder", `data-delete-reminder="${reminder.id}"`)}</div>`).join("") : `<div class="empty">${icon("bell")}Water, movement, an application, or a moment to pause.<br><br><button class="button soft" data-action="starter-reminders">${icon("sparkles")} Add starter reminders</button></div>`}<section class="settings-section"><h2>Alerts that work when the app is closed</h2><p>Chrome on iPhone cannot run website reminders in the background. Send your reminders to the Calendar app instead: each becomes a daily event with an alert at its time.</p><button class="button" data-action="calendar" ${canExport ? "" : "disabled"}>${icon("calendar-plus")} Add to iPhone Calendar</button><ol class="steps"><li><div>Tap the button, then choose <b>Calendar</b> in the share sheet<small>If no share sheet appears, open the downloaded file from Chrome's downloads or the Files app.</small></div></li><li><div>Tap <b>Add All</b><small>Adding again after edits updates the same events. Deleted reminders must also be removed in Calendar.</small></div></li><li><div>Check iPhone Settings &gt; Notifications &gt; Calendar<small>Allow notifications and sounds. Focus modes can silence alerts.</small></div></li></ol></section><section class="settings-section"><h2>While this page is open</h2><p>Reminders also appear here, and any you missed show once when you return. ${notificationNote}</p>${permission === "default" ? `<button class="button secondary" data-action="notifications">${icon("bell-ring")} Enable notifications</button>` : ""}</section>`;
  }
  function settingsView() {
    return `${header("Make this space yours.", "Enough structure to help. Enough room to be human.")}<div class="settings-form"><form id="goals-form" class="settings-section"><h2>Daily goals</h2><div class="form-grid">${[
      ["work", "Focus minutes", 1440],
      ["tasks", "Task completions", 50],
      ["workout", "Movement minutes", 300],
      ["water", "Glasses of water", 30],
    ]
      .map(
        ([key, label, max]) =>
          `<label class="field">${label}<input type="number" name="${key}" min="1" max="${max}" value="${state.goals[key]}" required></label>`,
      )
      .join(
        "",
      )}</div><p>Changes apply to today and future days. Previous days keep their original goals.</p><button class="button" type="submit">${icon("check")} Save goals</button></form><section class="settings-section"><h2>Your data, in your hands</h2><p>Stored only in this browser on this device, not in your GitHub repository. Clearing browser data removes it. Separate devices and browsers do not sync automatically. Back up regularly.</p><div class="actions"><button class="button secondary" data-action="export">${icon("download")} Export backup</button><button class="button secondary" data-action="import">${icon("upload")} Restore backup</button><input type="file" id="backup-input" accept=".json,application/json" hidden></div><p>Restoring replaces current data after confirmation. Only import a backup you trust.</p></section><section class="settings-section"><h2>Reminders</h2><button class="button secondary" data-view="reminders">${icon("bell")} Manage reminders</button></section><section class="settings-section"><h2>A fresh start</h2><p>Delete all tasks, activity, goals, and opportunities from this browser. Export a backup first.</p><button class="button secondary" data-action="reset">${icon("trash-2")} Reset all data</button></section><p class="notice">Focus Forward is a personal planning companion, not a medical device or treatment for ADHD. No streak penalties. No missed-day deductions. Rest does not erase your progress.</p></div>`;
  }
  function render() {
    const missed = M.missedTasks(state, today).length;
    const navScroll = $("#navigation").scrollLeft;
    $("#navigation").innerHTML = Object.entries(views)
      .filter(([key]) => key !== "settings")
      .map(
        ([key, [label, image]]) =>
          `<a href="#${key}" class="nav-item ${view === key ? "active" : ""}" ${view === key ? 'aria-current="page"' : ""}>${icon(image)}${label}${key === "review" && missed ? `<span class="nav-count">${missed}</span>` : ""}</a>`,
      )
      .join("");
    $("#view-label").textContent = views[view][0];
    const total = M.xp(state);
    $("#level").innerHTML =
      `<div class="level-heading">${icon("sprout")} Level ${String(Math.floor(total / 200) + 1).padStart(2, "0")} <span style="margin-left:auto;font-weight:400">${total} XP</span></div><div class="level-caption">${200 - (total % 200)} XP to your next chapter</div>${progress((total % 200) / 2)}`;
    const renderer = {
      today: todayView,
      focus: focusView,
      movement: movementView,
      career: careerView,
      brain: brainView,
      review: reviewView,
      reminders: remindersView,
      settings: settingsView,
    };
    $("#main").innerHTML =
      `${storageIssue ? `<div class="storage-warning" role="alert">${escape(storageIssue)}</div>` : ""}<div class="reveal">${renderer[view]()}</div>`;
    document.title = `${views[view][0]} | Focus Forward`;
    icons();
    $("#navigation").scrollLeft = navScroll;
    updateTimerDisplay();
  }
  function navigate(next) {
    if (!views[next]) return;
    if (location.hash === `#${next}`) {
      view = next;
      render();
    } else location.hash = next;
  }
  function modal(title, content) {
    $("#modal").innerHTML =
      `<div class="modal-head"><h2 id="modal-title">${title}</h2>${iconButton("x", "Close dialog", 'data-action="close-modal"')}</div>${content}`;
    if (!$("#modal").open) $("#modal").showModal();
    icons();
  }
  function confirmAction(title, message, action, label = "Confirm") {
    modal(
      title,
      `<p class="modal-copy">${escape(message)}</p><div class="modal-actions"><button class="button secondary" data-action="close-modal">Cancel</button><button class="button" id="confirm-button">${label}</button></div>`,
    );
    $("#confirm-button").onclick = () => {
      $("#modal").close();
      action();
    };
  }
  function taskModal(id) {
    const task = state.tasks.find((item) => item.id === id);
    modal(
      task ? "Make the step yours" : "A small step for today",
      `<form id="task-form" data-id="${task?.id || ""}"><label class="field">What would you like to do?<input name="title" maxlength="160" required value="${escape(task?.title || "")}" placeholder="Send one application" autofocus></label><label class="field">The tiniest first step<textarea name="step" maxlength="240" placeholder="Open the role and read the requirements">${escape(task?.step || "")}</textarea></label><div class="form-grid"><label class="field">Category<select name="category">${M.CATEGORIES.map((category) => `<option ${task?.category === category ? "selected" : ""}>${category}</option>`).join("")}</select></label><label class="field">A starting estimate (min)<input name="minutes" type="number" min="1" max="240" value="${task?.minutes || 5}" required></label><label class="field">Day<input name="date" type="date" value="${task?.date || today}" required></label><label class="checkbox-label"><input type="checkbox" name="priority" ${task?.priority ? "checked" : ""}> A priority</label></div><div class="modal-actions"><button class="button secondary" type="button" data-action="close-modal">Cancel</button><button class="button" type="submit">${icon("check")} ${task ? "Save step" : "Add step"}</button></div></form>`,
    );
  }
  function jobModal(id) {
    const job = state.jobs.find((item) => item.id === id);
    modal(
      job ? "Edit opportunity" : "An opening for future you",
      `<form id="job-form" data-id="${job?.id || ""}"><label class="field">Company<input name="company" maxlength="100" required value="${escape(job?.company || "")}" autofocus></label><label class="field">Role<input name="role" maxlength="160" required value="${escape(job?.role || "")}"></label><label class="field">Next step / notes<textarea name="notes" maxlength="1000" placeholder="Tailor resume by Friday">${escape(job?.notes || "")}</textarea></label><label class="field">Stage<select name="status">${["Saved", "Applied", "Interview", "Offer", "Closed"].map((status) => `<option ${job?.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label><div class="modal-actions"><button type="button" class="button secondary" data-action="close-modal">Cancel</button><button class="button" type="submit">${icon("check")} Save opportunity</button></div></form>`,
    );
  }
  function reminderModal(id) {
    const reminder = state.reminders.find((item) => item.id === id);
    modal(
      reminder ? "Edit your nudge" : "A nudge for later",
      `<form id="reminder-form" data-id="${reminder?.id || ""}"><label class="field">A kind reminder<input name="title" maxlength="160" required placeholder="Water break. A little care counts." value="${escape(reminder?.title || "")}" autofocus></label><label class="field">Every day at (local time)<input type="time" name="time" required value="${reminder?.time || "10:00"}"></label><div class="modal-actions"><button class="button secondary" type="button" data-action="close-modal">Cancel</button><button class="button" type="submit">${icon("bell")} Save reminder</button></div></form>`,
    );
  }
  function startFocusTask(id) {
    if (state.timer) {
      toast("Finish the current focus session before choosing another.");
      navigate("focus");
      return;
    }
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    focusLabel = task.title;
    preset = Math.min(120, task.minutes);
    navigate("focus");
  }
  function sound() {
    if (!audioEnabled || !audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.6,
    );
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.6);
  }
  function notify(title, body) {
    toast(`${title} ${body}`);
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body, tag: "focus-forward" });
      } catch (error) {
        toast(`${title} ${body}`);
      }
    }
  }
  function toggleTimer() {
    const now = Date.now();
    if (!state.timer)
      state.timer = {
        total: preset * 60,
        remaining: preset * 60,
        running: true,
        end: now + preset * 60000,
        date: today,
        label: focusLabel,
      };
    else if (state.timer.running) {
      state.timer.remaining = remaining();
      state.timer.running = false;
    } else {
      state.timer.end = now + state.timer.remaining * 1000;
      state.timer.running = true;
    }
    save();
    render();
  }
  function finishFocus(automatic = false) {
    const elapsed = M.finishTimer(state);
    save();
    render();
    if (automatic) {
      sound();
      notify(
        "Focus session complete.",
        "A little effort, banked. Time for a stretch?",
      );
    } else
      toast(
        `${minutes(elapsed)} min ${elapsed % 60 ? `${elapsed % 60} sec ` : ""}of focus logged. Showing up counts.`,
      );
  }
  function updateTimerDisplay() {
    const value = remaining();
    if ($("#timer-display"))
      $("#timer-display").textContent = timeString(value);
    if (state.timer && $(".focus-panel .progress span"))
      $(".focus-panel .progress span").style.width =
        `${Math.max(0, Math.min(100, (1 - value / state.timer.total) * 100))}%`;
    $("#active-timer").hidden = !state.timer;
    if (state.timer)
      $("#active-timer").textContent =
        `${state.timer.running ? "Focus" : "Paused"} ${timeString(value)}`;
  }
  function openRoutine(index) {
    const routine = routines[index];
    modal(
      routine.name,
      `<p class="modal-copy">${routine.minutes} minutes &middot; Go at a comfortable pace. Take breaks whenever you need.</p><ol class="steps">${routine.steps.map(([name, detail]) => `<li><div>${name}<small>${detail}</small></div></li>`).join("")}</ol><div class="modal-actions"><button class="button secondary" data-action="close-modal">Not now</button><button class="button" data-log-routine="${index}">${icon("check")} I did this</button></div>`,
    );
  }
  function openDrill(index) {
    const drill = drills[index];
    if (exercise) clearInterval(exercise.interval);
    exercise = {
      index,
      end: Date.now() + drill.minutes * 60000,
      interval: null,
    };
    modal(
      drill.name,
      `<p class="eyebrow">${drill.type} &middot; ${drill.minutes} MINUTES</p><div class="exercise-prompt">${drill.prompt}</div><label class="field">A note for yourself (optional)<textarea id="drill-note" maxlength="500" placeholder="One thought worth keeping"></textarea></label><div class="exercise-countdown" id="exercise-time" role="timer">${timeString(drill.minutes * 60)}</div><p class="modal-copy" id="exercise-status">A starting point, not a race. Finish whenever you are ready.</p><div class="modal-actions"><button class="button secondary" data-action="close-modal">Not now</button><button class="button" data-action="complete-drill">${icon("check")} Practice complete</button></div>`,
    );
    exercise.interval = setInterval(() => {
      if (!exercise || !$("#exercise-time")) return;
      const seconds = Math.max(
        0,
        Math.ceil((exercise.end - Date.now()) / 1000),
      );
      $("#exercise-time").textContent = timeString(seconds);
      if (!seconds) {
        clearInterval(exercise.interval);
        $("#exercise-status").textContent =
          "Time to wrap up. Keep one useful thought.";
        sound();
      }
    }, 1000);
  }
  function downloadFile(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportData() {
    downloadFile(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
      `focus-forward-${today}.json`,
    );
    toast("Backup exported. Keep it somewhere private.");
  }
  function exportCalendar() {
    const file = new File(
      [M.buildIcs(state.reminders)],
      "focus-forward-reminders.ics",
      { type: "text/calendar" },
    );
    if (navigator.canShare?.({ files: [file] })) {
      navigator
        .share({ files: [file], title: "Focus Forward reminders" })
        .catch((error) => {
          if (error.name !== "AbortError") downloadFile(file, file.name);
        });
      return;
    }
    downloadFile(file, file.name);
    toast("Calendar file saved. Open it to add the reminders.");
  }
  function importData(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("That file is too large. Choose a backup under 10 MB.");
      return;
    }
    file
      .text()
      .then((text) => {
        const restored = M.validateState(JSON.parse(text));
        confirmAction(
          "Replace current data?",
          "This replaces your current tasks, activity, and settings with the selected backup. Export your current data first if you need it.",
          () => {
            state = restored;
            storageIssue = "";
            M.ensureDay(state, today);
            save();
            render();
            toast("Backup restored. Welcome back.");
          },
          "Restore backup",
        );
      })
      .catch(() =>
        toast(
          "Could not restore this file. Choose a valid Focus Forward JSON backup.",
        ),
      );
  }
  function checkReminders() {
    const now = new Date();
    const minute = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const due = state.reminders.filter(
      (reminder) =>
        reminder.enabled &&
        reminder.time <= minute &&
        reminder.lastFired !== today,
    );
    if (!due.length) return;
    due.forEach((reminder) => {
      reminder.lastFired = today;
    });
    save();
    notify(
      due.length === 1 ? "A little nudge." : `${due.length} reminders waiting.`,
      due.map((reminder) => reminder.title).join(" / "),
    );
  }
  const actions = {
    "add-task": () => taskModal(),
    "add-job": () => jobModal(),
    "add-reminder": () => reminderModal(),
    "close-modal": () => $("#modal").close(),
    "timer-toggle": toggleTimer,
    "timer-finish": () => finishFocus(),
    "water-add": () => {
      M.logMetric(state, "water", 1, today);
      save();
      render();
      toast("A glass of care. +3 XP");
    },
    "water-minus": () => {
      M.logMetric(state, "water", -1, today);
      save();
      render();
    },
    focus: () => navigate("focus"),
    movement: () => navigate("movement"),
    challenge: () => {
      const title = {
        gentle: "The two-minute opening",
        steady: "One distraction-free sprint",
        stretch: "Make the brave first move",
      }[state.energy];
      if (
        state.tasks.some((task) => task.title === title && task.date === today)
      ) {
        toast(
          "Your challenge is already on today's list. You have got a place to start.",
        );
        return;
      }
      M.addTask(state, {
        title,
        step: {
          gentle: "Open one thing you have been avoiding.",
          steady: "Choose a task, silence one distraction, and start.",
          stretch: "Choose one meaningful action that feels a little brave.",
        }[state.energy],
        date: today,
        category: "Life",
        minutes: { gentle: 2, steady: 15, stretch: 25 }[state.energy],
        priority: true,
      });
      save();
      render();
      toast("Challenge accepted. Small is a perfectly good start.");
    },
    "bring-all": () =>
      confirmAction(
        "Choose these steps again?",
        "Move all unfinished tasks from earlier days to today? You can also bring back just one at a time.",
        () => {
          M.missedTasks(state, today).forEach((task) => {
            task.date = today;
          });
          save();
          render();
          toast("A new starting point. No penalties.");
        },
        "Bring to today",
      ),
    export: exportData,
    import: () => $("#backup-input").click(),
    reset: () =>
      confirmAction(
        "Start completely fresh?",
        "This permanently deletes all data in this browser. Your exported backups will not be deleted.",
        () => {
          state = M.createState();
          storageIssue = "";
          M.ensureDay(state, today);
          save();
          render();
          toast("A fresh start. Make it yours.");
        },
        "Delete all data",
      ),
    notifications: async () => {
      try {
        await Notification.requestPermission();
        render();
      } catch (error) {
        toast(
          "Notifications are unavailable here. In-page reminders still work.",
        );
      }
    },
    calendar: exportCalendar,
    "starter-reminders": () => {
      if (state.reminders.length) return;
      const now = new Date();
      const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      [
        ["Water break. A glass of care.", "10:00"],
        ["Move for five minutes", "12:30"],
        ["Water break", "15:00"],
        ["One small job-hunt step", "16:30"],
        ["Choose tomorrow's first small step", "20:00"],
      ].forEach(([title, time]) =>
        state.reminders.push({
          id: M.uid(),
          title,
          time,
          enabled: true,
          lastFired: time < current ? today : null,
        }),
      );
      save();
      render();
      toast("Starter reminders added. Send them to Calendar for closed-app alerts.");
    },
    "complete-drill": () => {
      if (!exercise) return;
      M.logMetric(state, "brain", 1, today);
      const event = state.events[state.events.length - 1];
      event.label = drills[exercise.index].name;
      const note = $("#drill-note").value.trim();
      if (note) {
        event.note = note;
        event.label = `${event.label}: ${note}`.slice(0, 240);
      }
      $("#modal").close();
      save();
      render();
      toast("Practice, not perfection. +15 XP");
    },
  };
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    const data = button.dataset;
    if (data.view) navigate(data.view);
    else if (data.action && actions[data.action]) actions[data.action]();
    else if (data.energy) {
      state.energy = data.energy;
      save();
      render();
    } else if (data.filter) {
      filter = data.filter;
      render();
    } else if (data.preset) {
      preset = Number(data.preset);
      render();
    } else if (data.editTask) taskModal(data.editTask);
    else if (data.focusTask) startFocusTask(data.focusTask);
    else if (data.deleteTask)
      confirmAction(
        "Let this step go?",
        "Delete this task? Any activity already earned stays in your history.",
        () => {
          state.tasks = state.tasks.filter(
            (task) => task.id !== data.deleteTask,
          );
          save();
          render();
        },
        "Delete task",
      );
    else if (data.reschedule) {
      const task = state.tasks.find((item) => item.id === data.reschedule);
      task.date = today;
      save();
      render();
      toast("Back on today's list. A fresh chance.");
    } else if (data.routine !== undefined) openRoutine(Number(data.routine));
    else if (data.logRoutine !== undefined) {
      const routine = routines[Number(data.logRoutine)];
      M.logMetric(state, "workout", routine.minutes, today);
      state.events[state.events.length - 1].label = routine.name;
      $("#modal").close();
      save();
      render();
      toast(
        `${routine.minutes} movement minutes logged. Your body thanks you.`,
      );
    } else if (data.drill !== undefined) openDrill(Number(data.drill));
    else if (data.careerTask) {
      M.addTask(state, {
        title: data.careerTask,
        category: "Career",
        date: today,
        minutes: 15,
      });
      save();
      toast("Added to today. One step closer.");
    } else if (data.editJob) jobModal(data.editJob);
    else if (data.deleteJob)
      confirmAction(
        "Remove this opportunity?",
        "This removes the opportunity from your pipeline. Your earned XP stays.",
        () => {
          state.jobs = state.jobs.filter((job) => job.id !== data.deleteJob);
          save();
          render();
        },
        "Remove",
      );
    else if (data.editReminder) reminderModal(data.editReminder);
    else if (data.deleteReminder) {
      state.reminders = state.reminders.filter(
        (reminder) => reminder.id !== data.deleteReminder,
      );
      save();
      render();
    }
  });
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.taskCheck) {
      M.toggleTask(state, target.dataset.taskCheck, today);
      save();
      render();
      if (target.checked)
        toast("One small win, banked. +20 XP on your first completion.");
    } else if (target.dataset.jobStatus) {
      state.jobs.find((job) => job.id === target.dataset.jobStatus).status =
        target.value;
      save();
      render();
      toast("A new chapter in the pipeline.");
    } else if (target.dataset.reminderToggle) {
      state.reminders.find(
        (reminder) => reminder.id === target.dataset.reminderToggle,
      ).enabled = target.checked;
      save();
    } else if (target.id === "backup-input") importData(target.files[0]);
    else if (target.id === "sound-toggle") {
      audioEnabled = target.checked;
      if (audioEnabled) {
        try {
          audioContext =
            audioContext ||
            new (window.AudioContext || window.webkitAudioContext)();
          audioContext.resume();
          sound();
        } catch (error) {
          audioEnabled = false;
          target.checked = false;
          toast("Sound is unavailable in this browser.");
        }
      }
    }
  });
  document.addEventListener("submit", (event) => {
    const form = event.target;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try {
      if (form.id === "task-form") {
        const existing = state.tasks.find(
          (task) => task.id === form.dataset.id,
        );
        const task = M.addTask(state, {
          ...values,
          priority: values.priority === "on",
        });
        if (existing) {
          state.tasks.pop();
          Object.assign(existing, {
            title: task.title,
            step: task.step,
            date: task.date,
            minutes: task.minutes,
            category: task.category,
            priority: task.priority,
          });
        }
        $("#modal").close();
        toast(existing ? "Step updated." : "One small step added.");
      } else if (form.id === "job-form") {
        if (!values.company.trim() || !values.role.trim())
          throw new Error("Add a company and role first.");
        const existing = state.jobs.find((job) => job.id === form.dataset.id);
        const job = {
          company: values.company.trim(),
          role: values.role.trim(),
          notes: values.notes.trim(),
          status: values.status,
        };
        if (existing) Object.assign(existing, job);
        else {
          state.jobs.push({ ...job, id: M.uid(), date: today });
          M.addEvent(state, "job", `Opportunity: ${job.role}`, 1, today);
        }
        $("#modal").close();
        toast(
          existing ? "Opportunity updated." : "A door worth opening. +25 XP",
        );
      } else if (form.id === "reminder-form") {
        if (!values.title.trim()) throw new Error("Give your reminder a name.");
        const existing = state.reminders.find(
          (reminder) => reminder.id === form.dataset.id,
        );
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const reminder = {
          title: values.title.trim(),
          time: values.time,
          lastFired: values.time < currentTime ? today : null,
        };
        if (existing) Object.assign(existing, reminder);
        else state.reminders.push({ ...reminder, id: M.uid(), enabled: true });
        $("#modal").close();
        toast("Daily reminder saved. Keep this page open for alerts.");
      } else if (form.id === "goals-form") {
        for (const key of Object.keys(M.DEFAULT_GOALS))
          state.goals[key] = Number(values[key]);
        day().goals = { ...state.goals };
        toast("Goals updated. Your pace is the right starting point.");
      } else if (form.id === "workout-log") {
        M.logMetric(state, "workout", Number(values.minutes), today);
        toast("Movement logged. Every minute counts.");
      } else if (form.id === "manual-focus") {
        M.logMetric(state, "workSeconds", Number(values.minutes) * 60, today);
        toast("Focus time logged. A little effort, banked.");
      }
      save();
      render();
    } catch (error) {
      toast(error.message);
    }
  });
  $("#modal").addEventListener("close", () => {
    if (exercise) clearInterval(exercise.interval);
    exercise = null;
  });
  window.addEventListener("hashchange", () => {
    view = views[location.hash.slice(1)] ? location.hash.slice(1) : "today";
    render();
    $("#main").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      state = M.validateState(JSON.parse(event.newValue));
      M.ensureDay(state, today);
      if (!$("#modal").open) render();
    } catch (error) {
      toast(
        "Another tab has unreadable data. Export a backup before continuing.",
      );
    }
  });
  function tick() {
    const date = M.dateKey();
    if (date !== today) {
      today = date;
      M.ensureDay(state, today);
      save();
      render();
    }
    if (state.timer?.running && remaining() === 0) finishFocus(true);
    updateTimerDisplay();
    checkReminders();
  }
  setInterval(tick, 1000);
  // iOS suspends timers in the background, so catch up the moment the page returns.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });
  window.addEventListener("pageshow", tick);
  save();
  render();
})();

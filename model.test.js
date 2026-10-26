const { test } = require("node:test");
const assert = require("node:assert/strict");
const model = require("./model.js");

test("daily rollover preserves yesterday and seeds today exactly once", () => {
  const state = model.createState();
  model.ensureDay(state, "2026-10-25");
  model.logMetric(state, "water", 3, "2026-10-25");
  model.ensureDay(state, "2026-10-26");
  model.ensureDay(state, "2026-10-26");
  assert.equal(state.tasks.length, 6);
  assert.equal(state.days["2026-10-26"].water, 0);
  assert.equal(state.days["2026-10-25"].water, 3);
  assert.equal(model.missedTasks(state, "2026-10-26").length, 3);
});

test("task toggles cannot farm completion rewards", () => {
  const state = model.createState();
  const task = model.addTask(state, {
    title: "Apply",
    date: "2026-10-26",
    category: "Career",
  });
  for (let count = 0; count < 3; count++)
    model.toggleTask(state, task.id, "2026-10-26");
  assert.equal(task.done, true);
  assert.equal(model.xp(state), 20);
});

test("focus timer uses wall time, caps duration, and credits its original day", () => {
  const state = model.createState();
  state.timer = {
    total: 300,
    remaining: 300,
    running: true,
    end: 1000000,
    date: "2026-10-25",
    label: "Work",
  };
  assert.equal(model.finishTimer(state, 2000000), 300);
  assert.equal(state.days["2026-10-25"].workSeconds, 300);
  assert.equal(model.finishTimer(state, 2000000), 0);
});

test("paused focus credits only elapsed time and water never goes negative", () => {
  const state = model.createState();
  state.timer = {
    total: 300,
    remaining: 180,
    running: false,
    end: 1000000,
    date: "2026-10-26",
    label: "Work",
  };
  assert.equal(model.finishTimer(state), 120);
  model.logMetric(state, "water", -10, "2026-10-26");
  assert.equal(state.days["2026-10-26"].water, 0);
});

test("backup roundtrip validates and rejects malformed data and impossible dates", () => {
  const state = model.createState();
  model.ensureDay(state, "2026-10-26");
  assert.deepEqual(
    model.validateState(JSON.parse(JSON.stringify(state))),
    state,
  );
  const malformed = JSON.parse(JSON.stringify(state));
  malformed.days["2026-10-26"].water = "eight";
  assert.throws(() => model.validateState(malformed));
  assert.throws(() => model.validateState({ version: 1 }));
  assert.equal(model.validDate("2026-02-30"), false);
  assert.throws(() =>
    model.addTask(state, { title: "Oops", date: "2026-02-30" }),
  );
});

test("calendar export creates daily alerts, escapes text, and skips disabled reminders", () => {
  const reminders = [
    { id: "a1", title: "Water, then stretch; go", time: "10:05", enabled: true },
    { id: "b2", title: "Muted", time: "11:00", enabled: false },
    { id: "c3", title: "é".repeat(120), time: "23:59", enabled: true },
  ];
  const ics = model.buildIcs(reminders, new Date(2026, 9, 26, 9, 0, 0));
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 2);
  assert.equal(ics.match(/BEGIN:VALARM/g).length, 2);
  assert.match(ics, /DTSTART:20261026T100500\r\n/);
  assert.match(ics, /DTSTART:20261026T235900\r\n/);
  assert.match(ics, /RRULE:FREQ=DAILY/);
  assert.match(ics, /UID:a1@focus-forward/);
  assert.match(ics, /SUMMARY:Water\\, then stretch\\; go/);
  assert.doesNotMatch(ics, /Muted/);
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
});

test("backup rejects unsafe IDs and inconsistent focus timers", () => {
  const state = model.createState();
  model.ensureDay(state, "2026-10-26");
  state.tasks[0].id = '\" onclick=\"alert(1)';
  assert.throws(() => model.validateState(state));
  state.tasks[0].id = model.uid();
  state.timer = {
    total: 300,
    remaining: 301,
    running: false,
    end: 1000,
    date: "2026-10-26",
    label: "Work",
  };
  assert.throws(() => model.validateState(state));
});

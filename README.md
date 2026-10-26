# Focus Forward

A standalone, ADHD-considerate daily planning companion. No account, server,
paid API, package installation, or build step. The original NodeVisual app is
unchanged.

## Open It

Open `index.html` in a regular browser. All core functionality works directly
from the file. Notifications depend on browser support and site permissions;
GitHub Pages provides HTTPS for the published version.

## Publish Free on GitHub Pages

### As Its Own Application (Recommended)

1. Create a new **public** GitHub repository, for example `focus-forward`.
2. Upload the **contents of this directory** to the repository root. The root
   must contain `index.html`, `style.css`, `app.js`, `model.js`, and `assets/`.
   Keep `.nojekyll` and the Lucide license with the app. Do not upload private
   backup files.
3. Open the repository's **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select **main** and **/ (root)**, then **Save**.
6. When GitHub finishes publishing, open the URL displayed in Pages, usually
   `https://YOUR-USERNAME.github.io/focus-forward/`.

There are no environment variables, secrets, database bills, or backend costs.
Publishing still requires your own GitHub login; nothing has been uploaded by
this coding session.

### Alongside the Existing Application

Keep this directory inside your existing repository. With GitHub Pages serving
the repository root, the tracker will be available at
`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/focus-forward/`.
The original application remains at the root URL. All asset links are relative,
so project-repository paths work without configuration.

## What Is Included

- Today dashboard, adjustable daily goals, and gentle/steady/stretch challenges.
- Tasks with tiny first steps, categories, estimates, priorities, dates, editing,
  completion, and deletion. Three starter tasks appear on each new day.
- Previous unfinished tasks in Reflect, with individual or bulk return to today.
- Focus timer with presets, pause/resume, optional sound, and manual time logging.
  The timer uses wall-clock time and survives reloads. Finishing early records
  only elapsed time. A session crossing midnight credits its starting date.
- Water tracking, three home workout routines, and manual movement logging.
- Job opportunities with Saved, Applied, Interview, Offer, and Closed stages;
  editable next steps; interview, skill-building, and future-planning tasks.
- Six timed attention, active-recall, planning, and career exercises. Notes are
  retained with activity; recent activity shows a short note preview.
- Activity history, seven-day summaries, earned XP, levels, and six achievements.
  There are no missed-day penalties or streak resets. Task XP is awarded only
  once per task, even if its checkbox is toggled repeatedly.
- Daily local-time reminders, plus a one-tap export to the iPhone Calendar app
  for alerts that work with the app closed.
- JSON backup export, validated restore with confirmation, and a confirmed reset.
- Keyboard-accessible forms/dialogs, mobile layouts, and reduced-motion support.

## Data and Reminders: Important Limits

- Data lives in `localStorage` in this browser, on this device and origin. There
  is no login or automatic cloud/device sync. Clearing browser data deletes it.
  File URLs and GitHub Pages have different storage: export locally, then
  restore on your published site when moving over.
- Use **Settings & backup > Export backup** regularly. Backups contain personal
  tasks, job notes, and activity. Keep them private and outside a public repo.
  Use a regular browser if the VS Code browser does not support downloads.
- Restoring replaces current data after confirmation. Invalid files are rejected.
  If saved data cannot be read, the app leaves the original storage untouched
  and shows a warning; restore a valid backup or deliberately reset to recover.
- **iPhone reminders:** a website running in Chrome on iPhone cannot run in the
  background or send web notifications, and no free hosting can change that.
  Use **Reminders > Add to iPhone Calendar**: it shares an `.ics` file that
  creates one daily Calendar event with an alert per enabled reminder. Choose
  **Calendar**, then **Add All**. Re-adding after edits updates the same events;
  deleted reminders must also be deleted in Calendar. Check iPhone Settings >
  Notifications > Calendar, and note Focus modes can silence alerts.
- In-app reminders appear only while the page is open. When iOS suspends the
  page, due reminders and finished focus sessions catch up once when you return.
  Newly created reminders whose time has already passed start the following day.
- Notification permission is optional and varies by browser. In-page reminder
  messages work without it. Sound must be enabled in the current session.
- Multiple tabs receive saved updates, but simultaneous editing can overwrite
  changes. Prefer one active editing tab.
- No analytics or task data are sent to a server. Optional Google Fonts requests
  expose normal request metadata to Google; fallback fonts work without internet.
  Icons and the workout photograph are bundled locally. There is no service
  worker or guaranteed offline caching for a previously visited hosted page.

This is a planning tool, not ADHD diagnosis or treatment. Brain practices are
not claimed to treat ADHD. Workouts and water goals are general suggestions,
not personalized medical advice. Adjust goals to your needs and professional
guidance. Stop exercise that causes pain or dizziness.

## Checks

With Node.js installed, from this directory:

```sh
node --test model.test.js
node --check app.js
```

Model tests cover daily rollover, missed tasks, duplicate task rewards, focus
accounting, paused timers, negative water prevention, backup validation, unsafe
identifiers, and inconsistent timers.

## Third-Party Assets

- Lucide v0.468.0, ISC license. Bundled in `assets/lucide.min.js` with
  `assets/lucide-LICENSE.txt`. Source: https://lucide.dev/
- Fitness photograph, downloaded from
  https://images.unsplash.com/photo-1518611012118-696072aa579a .
  Unsplash license: https://unsplash.com/license . The image is illustrative;
  it is not a demonstration of the routines or an endorsement by the people shown.
- DM Sans and Manrope are optionally loaded through Google Fonts under their
  respective open font licenses. System fallbacks remain available.

REHOTEQ CLASSROOM V7 - ONBOARDING, LEARNER DASHBOARD, TEACHER CONSOLE

WHAT CHANGED IN V7 (interface only - the data model and Firestore rules are unchanged)
- New shared design system in styles.css. All three pages now use it, so the look is
  consistent and you only change colours in one place (the :root block at the top).
- Learner app: tab bar (Learn / Quizzes / Me), progress ring, per-module progress,
  tickable lab steps saved on the device, redesigned quiz runner with a segmented
  progress strip and a timer that turns red in the last 30 seconds, and a result
  screen with a score ring and full review.
- Onboarding is now three short steps instead of one long form.
- Teacher console (admin.html) is a real workspace: Overview / Learners / Results /
  Class settings, KPI cards, average-score bar chart, 14-day activity chart,
  sortable and searchable learner table, a learner detail sheet with quiz history and
  a WhatsApp button, and a live preview of what learners will see before you publish.
- Light / dark / follow-the-phone theme switch, remembered across all three pages.
- Accessibility: skip-to-content links, focus moves to the new heading on every view
  change (so keyboard and screen-reader users are not left behind), the browser tab
  title follows the current view, progress rings and bars are real progressbars,
  quiz options report their selected state, sortable admin columns report aria-sort,
  and toasts are polite live regions. The ticking quiz timer is deliberately silent
  for screen readers - announcing it every second would be unusable.
- No web fonts and no frameworks were added: the pages still open on a weak network.

JOIN PAGE (the link you share)
Share YOUR-LINK/join.html on the flyer, WhatsApp and QR codes. Add ?track=Beginner or ?track=Masterclass to preselect the track.

ONBOARDING IS NOW PROFILE FIRST, ACCOUNT LAST
A new learner answers three short questions BEFORE being asked for an email and password:
  Step 1 Who are you?        name, phone
  Step 2 How will you learn? track, attendance, device
  Step 3 Where are you going? experience, goal
  Step 4 Create your account email, password, consent  -> dashboard
Asking for a password first is the biggest reason people abandon a sign-up link, so the
account is now the last step, once they have already invested three taps.
Answers are held on the phone in localStorage ("rc-draft") the whole way, so a dropped
network, a closed tab or a wrong password never loses them. The learner document can only
be written after an account exists (the Firestore rules require request.auth.uid == uid),
so it is saved the instant sign-up succeeds, then the draft is deleted.
"I already have an account" sits at the top of every step for returning learners.
If someone is already signed in but has no profile, they get the same three questions with
no account step (the consent box moves to step 3), then go straight to the dashboard.
index.html still has the same three-step form as a safety net if someone signs up inside the app.

LEARNER FLOW
Open link > three onboarding questions > create account > Personal dashboard.
Dashboard: greeting, progress, lessons/quizzes/average, next live class + Join button, announcement,
and a track switcher. Beginner holds 13 lessons and 7 timed quizzes (B1-B7); Masterclass starts
small with 6 lessons and 2 quizzes (M1-M2). Every learner can read both tracks; the one they
signed up for is simply the default.
Everything still works offline. Progress, profile and quiz results save on the phone first and sync when online.

TEACHER FLOW
admin.html: class settings (next class text, Zoom/Meet link, announcement), learner table with search,
quiz results with filter, CSV export of results and learners, study materials, and assignments with marking.

STEP 1: REPLACE FIRESTORE RULES (Firebase console > Firestore Database > Rules > Publish)
The same block is in the file firestore.rules, which is easier to copy from.
Replace EVERYTHING in the rules editor with it - do not append it to the old rules.

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    match /users/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || isAdmin());
      allow write: if request.auth != null && request.auth.uid == uid
                   && request.resource.data.keys().hasOnly(['done', 'updatedAt', 'email']);
    }
    match /learners/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || isAdmin());
      allow create, update: if request.auth != null && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['uid','name','phone','track','mode','device','level','goal','createdAt'])
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 2 && request.resource.data.name.size() <= 80
        && request.resource.data.phone is string && request.resource.data.phone.size() <= 20;
      allow delete: if false;
    }
    match /results/{id} {
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.score is int
                    && request.resource.data.total is int
                    && request.resource.data.score >= 0
                    && request.resource.data.score <= request.resource.data.total;
      allow read: if request.auth != null
                  && (resource.data.uid == request.auth.uid || isAdmin());
      allow update: if request.auth != null && resource.data.uid == request.auth.uid
                    && request.resource.data == resource.data;
      allow delete: if false;
    }
    match /config/{id} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // ---- study materials: you post, every signed-in learner reads ----
    match /materials/{id} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // ---- assignments: you set them, every signed-in learner reads ----
    match /assignments/{id} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // ---- hand-ins: the learner owns the document, you can only read it ----
    // Document ID is always <assignmentId>__<uid>, so one learner cannot
    // create a second hand-in for the same assignment.
    match /submissions/{id} {
      allow read: if request.auth != null
                  && (resource.data.uid == request.auth.uid || isAdmin());
      allow create, update: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && id == request.resource.data.assignment + '__' + request.auth.uid
        && request.resource.data.keys().hasOnly(['uid','assignment','link','note','submittedAt'])
        && request.resource.data.link is string
        && request.resource.data.link.size() <= 500
        && request.resource.data.link.matches('https://.*')
        && request.resource.data.note is string
        && request.resource.data.note.size() <= 300;
      allow delete: if false;
    }

    // ---- marks: you own the document, the learner can only read their own ----
    // Kept separate from the hand-in so a learner can never write their own
    // score, and you can never overwrite their work.
    match /marks/{id} {
      allow read: if request.auth != null
                  && (resource.data.uid == request.auth.uid || isAdmin());
      allow create, update: if isAdmin()
        && request.resource.data.score is number
        && request.resource.data.points is number
        && request.resource.data.score >= 0
        && request.resource.data.score <= request.resource.data.points;
      allow delete: if false;
    }
  }
}

HOW TEACHERS REACH THE CONSOLE
Two ways, both discreet:
  1. A small "Teacher" tab in the top-right corner of the banner on join.html.
  2. A "Teacher console" row at the bottom of the Me tab inside the learner app,
     which is what you need once the app is installed and you no longer see join.html.
It goes to admin.html. The console is still login-protected and the Firestore rules
still decide who may read the data, so the tab being visible gives nothing away -
a learner who taps it sees a login card with a "Back to the classroom" link.
You can also still type YOUR-LINK/admin.html directly.

STEP 2: MAKE YOURSELF ADMIN (once)
1. Sign up in the classroom with your teacher email and finish the onboarding form.
2. Firebase > Authentication > Users: copy your User UID.
3. Firestore > Start collection "admins" > Document ID = your UID > add any field (role = teacher) > Save.
4. Open YOUR-LINK/admin.html and log in. Then fill in Class settings and Save.

STEP 3: UPLOAD all files to GitHub (replace old ones):
index.html, join.html, admin.html, styles.css, sw.js, manifest.json, icon-192.png,
icon-512.png, README.txt (optional). sw.js is now v15.
The tests/ folder and masterclass-backlog.txt are for you, not for learners. Uploading
them is harmless - GitHub Pages ignores them and the service worker never caches them -
but they are not needed on the live site.

IMPORTANT FOR THIS VERSION: the Firestore rules in STEP 1 have CHANGED. Materials,
assignments and marking will not work until you publish them. Until you do, the teacher
console still opens and tells you exactly what is missing.

CHECKING BEFORE YOU UPLOAD (optional)
There is a test kit in tests/ that opens all three pages against a fake Firebase and
checks a couple of hundred things in about thirty seconds. See tests/README.txt. It
never touches your real project.

STEP 4: REVIEW CHECKLIST
[ ] Open twice online, then airplane mode: still opens, badge "saved for offline"
[ ] Install button appears (Chrome Android) and installs the app
[ ] Open join.html?track=Masterclass: step 1 asks name/phone with NO password on screen;
    track is preselected on step 2; step 4 asks for the account; submit lands on dashboard
[ ] Half-fill the form, close the tab, reopen join.html: your answers are still there
[ ] On step 4 use an email that already exists: it offers "Log in instead" 
[ ] (Also works from index.html) Sign up > onboarding form appears > errors show for empty/invalid phone > submit > dashboard says "Hello, <first name>"
[ ] Firestore > learners has the new document
[ ] Log out and log in again on another phone: goes straight to the dashboard (no second onboarding)
[ ] Admin: save Class settings; learner dashboard shows Next live class + Join button
[ ] Complete a lesson, take a quiz: dashboard tiles update; results reach Firestore once only
[ ] Quiz in airplane mode, reconnect: result syncs; timer expiry auto-submits; Resume works
[ ] Two different accounts on one phone: second account does not see the first one's progress
[ ] admin.html: learner search, results filter, both CSV exports open in Excel
[ ] A normal learner cannot open admin.html data ("not an admin")
[ ] Teacher console > Materials: share a link, then confirm it appears on a learner's Class tab
[ ] Teacher console > Assignments: set one, hand in from a learner account, mark it,
    then confirm the learner sees the score and the feedback
[ ] Turn the phone's network off, hand in an assignment, confirm it says "Saved on phone",
    turn the network back on and confirm it sends by itself
[ ] A learner cannot mark their own work (the marks collection is admin-write only)
[ ] The small "Teacher" tab on join.html opens the console, and "Back to the
    classroom" on the login card returns a learner who tapped it by mistake
[ ] Dark mode and a small screen look right
[ ] Theme button in the header cycles auto > light > dark and survives a refresh
[ ] Lab steps stay ticked after you leave a lesson and come back
[ ] Admin: Overview charts draw, learner table sorts, a learner row opens the detail sheet
[ ] Admin: Class settings preview updates as you type, then Publish shows on a learner phone

NOTES
- Quiz answers are inside the page (fine for practice, not for graded exams).
- Firebase web config is public by design; the rules protect the data.
- Both tracks are live. Masterclass currently teaches M1 Modern JavaScript and
  M2 React fundamentals. M3 to M7 (APIs and the back end, Data that scales, Ship it,
  Performance and quality, Earning from your skills) are written and waiting in
  masterclass-backlog.txt. That file is not loaded by the app, so it costs a learner nothing.
  Switch a module on by following the instructions at the top of it. Add whole modules, and
  always append - ids 106-113 are reserved for the backlog in the order it lists.
- HOW PROGRESS IS STORED (important before you edit the lessons). users/{uid}.done is one flat
  array of GLOBAL lesson ids. Beginner lessons are 0-12, Masterclass lessons are 100-113. That is
  why a learner can hold progress on both tracks in a single array with no change to the Firestore
  rules. If you ADD a Beginner lesson, append it to B_LESSONS - never insert in the middle, or
  everyone's saved ids shift and point at the wrong lesson. The same rule applies to M_LESSONS,
  which must never grow past 13 entries unless you also raise Masterclass's total in admin.html
  (TRACKS.Masterclass.total) and move the base of any future track above the new ceiling.
- The admin console scores each learner against the track they have actually progressed furthest
  in, and shows a per-track breakdown in the learner sheet when they have worked on both.
- Learners store name, phone, goal and progress. Keep the consent line and only use the data for the training.
- To update later change v15 to v16 in sw.js and upload again. Do this every time you edit
  index.html, join.html, admin.html or styles.css, otherwise phones keep the old cached copy.
- Not built yet: certificates, audio/video downloads, attendance QR.

THE CLASS TAB: LIVE SESSIONS, MATERIALS AND ASSIGNMENTS
Learners now have a fourth tab, Class, holding three things:
  1. The live class card - whatever you set in Class settings. The button names the
     platform it detects from the link (Google Meet, Zoom, or a live stream).
  2. Study materials - anything you share from the Materials view: slides, a Drive
     folder, a YouTube lesson, past papers. You can aim each item at everyone or at
     one track. The list is cached on the phone, so it still opens with no network.
  3. Assignments - what you set in the Assignments view, each showing To do, Handed
     in, or the mark once you have marked it.

HOW HANDING IN WORKS (no file uploads, on purpose)
A learner hands in a LINK plus a short note: their GitHub Pages site, a repository,
a Drive file, a CodePen. Nothing is uploaded.
  - It costs nothing. Firebase Storage is not used, so there is no per-GB bill.
  - It works on a weak network, where a file upload would fail and lose the work.
  - It is what the course already teaches: push to GitHub, share the live link
    (lesson B4, and M5 in the Masterclass).
If the phone is offline the hand-in is saved on the device and marked "Saved on
phone", then sent automatically the next time there is signal - the same outbox the
quiz results already use. An unsent hand-in is never overwritten by a refresh.

HOW MARKING WORKS
Teacher console > Assignments > tap an assignment. You get every hand-in, with a
button to open their work in a new tab, their note, a mark out of the total you set,
and a feedback box. The grade letter is the same A1-F9 scale as the quizzes. The
learner sees the score, the grade and your feedback on the assignment the next time
their app syncs.
The mark lives in a separate "marks" document from the hand-in. That is deliberate:
a learner can never write their own score, and you can never overwrite their work.

LIVE STREAMING LATER
Google Meet and Zoom work today: paste the link in Class settings and the Class tab
shows a Join button naming the platform. When you move to streaming, nothing in the
data model has to change - a YouTube Live or similar https:// link in the same field
already shows as "Join the live stream". The next step after that would be embedding
the player in the Class tab instead of opening a new tab, which is a change to
liveCard() in index.html only. Do not embed before you need it: an embedded player
loads megabytes on a page that currently costs kilobytes.

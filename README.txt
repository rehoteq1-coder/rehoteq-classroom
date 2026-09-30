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
- No web fonts and no frameworks were added: the pages still open on a weak network.

JOIN PAGE (new, cleaner sign-up link)
Share YOUR-LINK/join.html on the flyer, WhatsApp and QR codes. Add ?track=Beginner or ?track=Masterclass to preselect the track.
join.html = create account > onboarding form > automatic redirect to the dashboard (index.html). Returning learners go straight to the dashboard.
index.html still has the same form as a safety net if someone signs up from inside the app.

LEARNER FLOW
Open link > Create account (Account card) > Onboarding form (name, phone, track, attendance, device, experience, goal, consent) > Personal dashboard.
Dashboard: greeting, progress, lessons/quizzes/average, next live class + Join button, announcement, 13 lessons, 7 timed quizzes.
Everything still works offline. Progress, profile and quiz results save on the phone first and sync when online.

TEACHER FLOW
admin.html: class settings (next class text, Zoom/Meet link, announcement), learner table with search, quiz results with filter, CSV export of results and learners.

STEP 1: REPLACE FIRESTORE RULES (Firebase console > Firestore Database > Rules > Publish)

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
  }
}

STEP 2: MAKE YOURSELF ADMIN (once)
1. Sign up in the classroom with your teacher email and finish the onboarding form.
2. Firebase > Authentication > Users: copy your User UID.
3. Firestore > Start collection "admins" > Document ID = your UID > add any field (role = teacher) > Save.
4. Open YOUR-LINK/admin.html and log in. Then fill in Class settings and Save.

STEP 3: UPLOAD all files to GitHub (replace old ones):
index.html, join.html, admin.html, styles.css, sw.js, manifest.json, icon-192.png,
icon-512.png, README.txt (optional). styles.css is NEW - the pages are unstyled without it.
sw.js is now v8 and caches styles.css too.

STEP 4: REVIEW CHECKLIST
[ ] Open twice online, then airplane mode: still opens, badge "saved for offline"
[ ] Install button appears (Chrome Android) and installs the app
[ ] Open join.html?track=Masterclass: track is preselected. Create account > step 2 form > errors for empty/invalid phone > submit > lands on dashboard
[ ] (Also works from index.html) Sign up > onboarding form appears > errors show for empty/invalid phone > submit > dashboard says "Hello, <first name>"
[ ] Firestore > learners has the new document
[ ] Log out and log in again on another phone: goes straight to the dashboard (no second onboarding)
[ ] Admin: save Class settings; learner dashboard shows Next live class + Join button
[ ] Complete a lesson, take a quiz: dashboard tiles update; results reach Firestore once only
[ ] Quiz in airplane mode, reconnect: result syncs; timer expiry auto-submits; Resume works
[ ] Two different accounts on one phone: second account does not see the first one's progress
[ ] admin.html: learner search, results filter, both CSV exports open in Excel
[ ] A normal learner cannot open admin.html data ("not an admin")
[ ] Dark mode and a small screen look right
[ ] Theme button in the header cycles auto > light > dark and survives a refresh
[ ] Lab steps stay ticked after you leave a lesson and come back
[ ] Admin: Overview charts draw, learner table sorts, a learner row opens the detail sheet
[ ] Admin: Class settings preview updates as you type, then Publish shows on a learner phone

NOTES
- Quiz answers are inside the page (fine for practice, not for graded exams).
- Firebase web config is public by design; the rules protect the data.
- Masterclass learners see a "lessons being added" note. Only Beginner content exists.
- Learners store name, phone, goal and progress. Keep the consent line and only use the data for the training.
- To update later change v8 to v9 in sw.js and upload again. Do this every time you edit
  index.html, join.html, admin.html or styles.css, otherwise phones keep the old cached copy.
- Not built yet: certificates, Masterclass lessons, audio/video downloads, assignments, attendance QR.

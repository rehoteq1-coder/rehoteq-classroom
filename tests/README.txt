REHOTEQ CLASSROOM — TEST KIT
============================
These tests are NOT part of the website. GitHub Pages ignores this folder, and
the service worker never caches it. Nothing here is downloaded to a learner's
phone. It exists so you can check the three pages still work BEFORE you upload.

WHAT YOU NEED
Node.js, and one package:
    cd tests
    npm install jsdom

HOW TO RUN
    cd tests
    node all.mjs

That runs every suite and prints a single pass/fail total. To run one at a time:
    SUITE=learner node run.mjs      lessons, tracks, progress, the quiz runner
    SUITE=admin   node run.mjs      the teacher console with a signed-in admin
    NO_USER=1 SUITE=admin node run.mjs   the console when nobody is logged in
    NO_USER=1 SUITE=join  node run.mjs   the sign-up wizard
    SUITE=repo    node run.mjs      files agreeing with each other
    node classroom.mjs              materials, hand-ins, marking, the rules

WHAT IT DOES NOT DO
It never touches your real Firebase project. fbmock/ is a small stand-in that
answers with fake learners, so running the tests cannot change or delete any
real data, and it works with no internet connection.

WHEN A TEST FAILS
The line tells you what broke in plain words, for example
    FAIL a mark above the total is refused
Fix the page, run again. If you changed something on purpose and the test is
now wrong, edit the test: they are plain JavaScript.

THE ONE TO WATCH
    SUITE=repo
catches the mistakes that are easy to make and hard to notice: the Masterclass
lesson count in admin.html drifting away from the real number of lessons, the
backlog file no longer being valid code, or the service worker forgetting a file.

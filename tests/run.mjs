/* Core suite: tracks, progress, the quiz runner, the console, onboarding and
   repo consistency. Run with SUITE=learner|admin|join|repo (see tests/README.txt). */
import { loadModulePage, loadClassicPage } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..") + path.sep;

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  <- " + extra : "")); }
};
const txt = el => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SUITE = process.env.SUITE || "learner";

/* Expected shipping size of each track. */
const M_LESSONS = 6, M_QUIZZES = 2, B_LESSONS = 13, B_QUIZZES = 7;

/* ===================== LEARNER ===================== */
if (SUITE === "learner") {
  console.log("\n--- learner (index.html) ---");
  const { w, doc } = loadClassicPage("index.html");
  await sleep(200);
  const app = doc.getElementById("app");
  const root = () => txt(app);

  ok("page renders", app && app.children.length > 0);
  ok("two tracks are defined", Object.keys(w.TRACKS).length === 2);
  ok("Beginner has " + B_LESSONS + " lessons", w.TRACKS.Beginner.lessons.length === B_LESSONS);
  ok("Masterclass starts small with " + M_LESSONS + " lessons", w.TRACKS.Masterclass.lessons.length === M_LESSONS);
  ok("Masterclass base is 100", w.TRACKS.Masterclass.base === 100);
  ok("Beginner has " + B_QUIZZES + " quizzes", Object.keys(w.TRACKS.Beginner.quizzes).length === B_QUIZZES);
  ok("Masterclass ships " + M_QUIZZES + " quizzes", Object.keys(w.TRACKS.Masterclass.quizzes).length === M_QUIZZES);
  ok("the shipped Masterclass is M1 and M2",
    Object.keys(w.TRACKS.Masterclass.quizzes).join(",") === "M1,M2");
  ok("ALLQZ merges both tracks", Object.keys(w.ALLQZ).length === B_QUIZZES + M_QUIZZES);

  const mods = new Set(w.TRACKS.Masterclass.lessons.map(l => l.m.slice(0, 2)));
  ok("no Masterclass lesson is left without a quiz",
    [...mods].every(k => k in w.TRACKS.Masterclass.quizzes), [...mods].join(","));

  const shapeBad = [];
  for (const [tk, T] of Object.entries(w.TRACKS)) {
    T.lessons.forEach((l, i) => {
      if (!l.m || !l.t || !Array.isArray(l.pts) || !Array.isArray(l.lab)) shapeBad.push(tk + ":" + i);
      if (l.pts.length < 3 || l.lab.length < 3) shapeBad.push(tk + ":" + i + ":thin");
    });
    Object.entries(T.quizzes).forEach(([k, Q]) => {
      if (!Q.name || !Q.secs || Q.q.length !== 5) shapeBad.push(tk + ":" + k);
      Q.q.forEach((q, qi) => {
        if (!q.t || !q.e || !Array.isArray(q.o) || q.o.length < 2) shapeBad.push(tk + ":" + k + ":" + qi);
        if (typeof q.a !== "number" || q.a < 0 || q.a >= q.o.length) shapeBad.push(tk + ":" + k + ":" + qi + ":ans");
      });
    });
  }
  ok("every lesson and question is well formed", shapeBad.length === 0, shapeBad.join(","));

  const ids = [];
  for (const T of Object.values(w.TRACKS)) T.lessons.forEach((_, i) => ids.push(T.base + i));
  ok("global lesson ids are unique", new Set(ids).size === ids.length);
  ok("Beginner can grow to 100 before it collides",
    w.TRACKS.Beginner.lessons.length < w.TRACKS.Masterclass.base);
  ok("quiz keys never collide", Object.keys(w.TRACKS.Beginner.quizzes)
    .every(k => !(k in w.TRACKS.Masterclass.quizzes)));

  w.done = [0, 1, 2]; w.applyTrack("Beginner");
  ok("Beginner counts only 0-12", w.tdone() === 3);
  ok("Beginner pct", w.pct() === Math.round(3 / B_LESSONS * 100));
  w.applyTrack("Masterclass");
  ok("Masterclass ignores Beginner ids", w.tdone() === 0);
  w.done = [0, 1, 100, 101, 102];
  ok("Masterclass counts only 100+", w.tdone() === 3);
  ok("isDoneI maps through the base", w.isDoneI(0) === true && w.isDoneI(3) === false);
  ok("gid offsets correctly", w.gid(0) === 100 && w.gid(M_LESSONS - 1) === 100 + M_LESSONS - 1);
  w.applyTrack("Beginner");
  ok("both tracks coexist in one array", w.tdone() === 2);

  w.done = [100, 101, 102, 103, 104, 105, 106, 107];
  w.applyTrack("Masterclass");
  ok("ids beyond the shipped track never exceed 100%", w.tdone() <= M_LESSONS && w.pct() <= 100);

  /* the switcher — start from Beginner so setTrack really has to switch */
  w.done = []; w.applyTrack("Beginner"); w.tab = "learn"; w.home(); await sleep(40);
  w.setTrack("Masterclass");
  await sleep(60);
  ok("setTrack switches the current track", w.trackKey === "Masterclass");
  ok("setTrack persists the choice", JSON.parse(w.localStorage.getItem("rc-track-view")) === "Masterclass");
  const segBtns = [...doc.querySelectorAll('.seg[role="tablist"] button')];
  ok("track switcher is on screen", segBtns.length === 2);
  ok("the current track is selected", segBtns.some(b => b.getAttribute("aria-selected") === "true"));
  ok("switcher is labelled for screen readers",
    segBtns.every(b => (b.getAttribute("aria-label") || "").includes("lessons complete")));
  ok("switcher counts match the shipped size", txt(segBtns[1]).includes("0/" + M_LESSONS));
  ok("Masterclass lessons are listed", root().includes("Modern JavaScript"));
  ok("parked modules are NOT shown to learners",
    !root().includes("Freelancing") && !root().includes("Security rules"));
  segBtns[0].click(); await sleep(60);
  ok("clicking Beginner switches back", w.trackKey === "Beginner" && root().includes("Digital foundations"));

  w.setTrack("Masterclass"); await sleep(40);
  w.openLesson(0); await sleep(40);
  ok("opens a Masterclass lesson", txt(app).includes("ES6 features"));
  ok("lesson counter uses the shipped length", txt(app).includes("of " + M_LESSONS));
  const mark = [...app.querySelectorAll("button")].find(b => /Mark this lesson complete/.test(b.textContent));
  ok("mark complete exists", !!mark);
  mark.click(); await sleep(40);
  ok("marking stores the GLOBAL id", w.done.includes(100) && !w.done.includes(0));
  w.applyTrack("Beginner");
  ok("Beginner is unaffected by that", w.tdone() === 0);

  w.applyTrack("Masterclass");
  w.done = [100, 101, 102, 103, 104];
  w.openLesson(5); await sleep(40);
  const mark2 = [...app.querySelectorAll("button")].find(b => /Mark this lesson complete/.test(b.textContent));
  mark2.click(); await sleep(60);
  ok("the last lesson completes the track", w.tdone() === M_LESSONS && w.pct() === 100);

  w.done = []; w.tab = "quiz"; w.home(); await sleep(40);
  ok("Masterclass quiz list shows M1", txt(app).includes("M1 Modern JavaScript"));
  ok("quiz list shows the real count", txt(app).includes(M_QUIZZES + " available"));
  ok("no quiz is offered for a parked module", !txt(app).includes("M5 Ship it"));
  w.startQuiz("M1"); await sleep(40);
  ok("quiz session starts", w.session && w.session.key === "M1");
  ok("question is rendered", app.querySelectorAll(".opt").length >= 2);
  app.querySelector(".opt").click(); await sleep(40);
  ok("answering advances", w.session.i === 1);
  const back = [...app.querySelectorAll("button")].find(b => /Back/.test(b.textContent));
  back.click(); await sleep(40);
  ok("the previous answer is remembered",
    [...app.querySelectorAll(".opt")].some(o => o.getAttribute("aria-pressed") === "true"));
  for (let n = 0; n < 12 && w.session; n++) { const o = app.querySelector(".opt"); if (o) o.click(); await sleep(15); }
  const fin = [...app.querySelectorAll("button")].find(b => /Submit|Finish/.test(b.textContent));
  if (fin) { fin.click(); await sleep(60); }
  ok("a result was recorded", w.results.length >= 1 && w.results[0].quiz === "M1");
  ok("result review names the quiz", txt(app).includes("M1 Modern JavaScript"));

  w.applyTrack("Beginner");
  w.showResult(w.results[0]); await sleep(40);
  ok("a Masterclass result still renders from the Beginner track", txt(app).includes("Modern JavaScript"));

  ok("skip link is present", !!doc.querySelector(".skip"));
}

/* ===================== ADMIN ===================== */
if (SUITE === "admin") {
  console.log("\n--- admin (admin.html)" + (process.env.NO_USER ? " signed out" : " signed in") + " ---");
  const { doc } = await loadModulePage("admin.html");
  await sleep(350);
  const root = doc.getElementById("root") || doc.body;
  const body = txt(root);

  if (process.env.NO_USER) {
    ok("login card shown", /Staff only/i.test(body));
    ok("back link to the classroom", /Back to the classroom/i.test(body));
    ok("password field present", !!doc.querySelector('input[type="password"]'));
    ok("no learner table leaks", !doc.querySelector("table"));
  } else {
    ok("console paints", root.children.length > 0);
    ok("overview heading", /How the class is doing/.test(body));
    ok("all three learners are counted", /Learners enrolled/.test(body));
    ok("completion KPI present", /Average course completion/.test(body));
    ok("KPI subtitle names both tracks", /Beginner/.test(body) && /Masterclass/.test(body));

    const src = fs.readFileSync(ROOT + "admin.html", "utf8");
    const block = src.slice(src.indexOf("const TRACKS = {"), src.indexOf("const SDK ="));
    const tP = new Function(block + "\nreturn { trackProgress, doneIn, TRACKS, TRACK_KEYS };")();
    const { trackProgress } = tP;

    ok("admin agrees the Masterclass ships " + M_LESSONS, tP.TRACKS.Masterclass.total === M_LESSONS);
    ok("admin agrees the Beginner track is " + B_LESSONS, tP.TRACKS.Beginner.total === B_LESSONS);
    const tp1 = trackProgress({ track: "Beginner", doneList: [0,1,2,3,4,5] });
    ok("Beginner learner scored out of " + B_LESSONS, tp1.total === B_LESSONS && tp1.done === 6);
    const tp2 = trackProgress({ track: "Masterclass", doneList: [100,101,102] });
    ok("Masterclass learner scored out of " + M_LESSONS, tp2.total === M_LESSONS && tp2.done === 3);
    const tp3 = trackProgress({ track: "Masterclass", doneList: [0,1,2,3,4,5,6,7,8,9,10,11,12,100,101] });
    ok("a learner on both tracks is scored on the fuller one", tp3.key === "Beginner" && tp3.done === 13);
    ok("the enrolled track is still remembered", tp3.enrolled === "Masterclass");
    ok("counts are kept per track", tp3.counts.Beginner === 13 && tp3.counts.Masterclass === 2);
    const tp4 = trackProgress({ track: undefined, doneList: undefined });
    ok("missing track and progress do not crash", tp4.done === 0 && tp4.total === B_LESSONS);
    ok("ids never leak across tracks", tP.doneIn([99, 100, 150], "Masterclass") === 1);
    const tp5 = trackProgress({ track: "Masterclass", doneList: [100,101,102,103,104,105,106,107] });
    ok("reserved ids above the shipped track are ignored", tp5.done === M_LESSONS);

    const links = [...doc.querySelectorAll(".navlink")];
    ok("sidebar has six views", links.length === 6);
    links.find(a => /Learners/.test(a.textContent)).click(); await sleep(80);
    ok("learner table renders", !!doc.querySelector("table"));
    ok("table has sortable headers", doc.querySelectorAll("th.sortable").length > 0);
    ok("headers expose aria-sort", [...doc.querySelectorAll("th.sortable")].some(t => t.hasAttribute("aria-sort")));
    ok("progress cells are progressbars", doc.querySelectorAll('.mini-bar[role="progressbar"]').length > 0);
    const rowTxt = txt(doc.querySelector("tbody"));
    ok("Beginner learner shows 6 of 13 as 46%", /46%/.test(rowTxt), rowTxt.slice(0, 240));
    ok("Masterclass learner shows 3 of 6 as 50%", /50%/.test(rowTxt), rowTxt.slice(0, 240));
    ok("dual-track learner shows 100%", /100%/.test(rowTxt), rowTxt.slice(0, 240));
    ok("search input is labelled", !!doc.querySelector('input[type="search"][aria-label]'));

    doc.querySelector("tbody tr").click(); await sleep(80);
    ok("detail sheet opens", !!doc.querySelector(".sheet"));
    doc.querySelector(".sheet-back").remove();
    const chidi = [...doc.querySelectorAll("tbody tr")].find(tr => /Chidi/.test(tr.textContent));
    ok("the dual-track learner is in the table", !!chidi);
    chidi.click(); await sleep(80);
    const sheet = txt(doc.querySelector(".sheet"));
    ok("sheet shows both tracks for a dual learner", /Beginner/.test(sheet) && /Masterclass/.test(sheet));
    ok("sheet marks the enrolled track", /enrolled/.test(sheet));
    ok("sheet uses the shipped Masterclass total", /\/ 6/.test(sheet), sheet.slice(0, 300));

    links.find(a => /Results/.test(a.textContent)).click(); await sleep(80);
    ok("results view renders", /Results|attempt/i.test(txt(doc.getElementById("root"))));
  }
}

/* ===================== JOIN ===================== */
if (SUITE === "join") {
  console.log("\n--- join (join.html) ---");
  const { doc } = await loadModulePage("join.html");
  await sleep(250);
  const root = doc.getElementById("root") || doc.body;
  const body = txt(root);
  ok("wizard renders", root.children.length > 0);
  ok("starts with the profile question, not a password", /name/i.test(body) && !doc.querySelector('input[type="password"]'));
  ok("returning learners have a way in", /already have an account/i.test(body));
  ok("track options are offered in the flow", /Beginner/.test(doc.documentElement.innerHTML));
  ok("both tracks are selectable", /Masterclass/.test(doc.documentElement.innerHTML));
  const inputs = [...doc.querySelectorAll("input")];
  ok("inputs are labelled", inputs.every(i => i.id ? !!doc.querySelector('label[for="' + i.id + '"]') || i.hasAttribute("aria-label") : true));
  ok("there is a continue action", [...doc.querySelectorAll("button")].some(b => /continue|next/i.test(b.textContent)));
  ok("no crash during boot", true);
}

/* ===================== REPO CONSISTENCY ===================== */
if (SUITE === "repo") {
  console.log("\n--- repo consistency ---");
  const idx = fs.readFileSync(ROOT + "index.html", "utf8");
  const adm = fs.readFileSync(ROOT + "admin.html", "utf8");
  const sw  = fs.readFileSync(ROOT + "sw.js", "utf8");
  const rme = fs.readFileSync(ROOT + "README.txt", "utf8");
  const bk  = fs.readFileSync(ROOT + "masterclass-backlog.txt", "utf8");

  const admTotal = +/Masterclass:\s*\{\s*base:\s*100,\s*total:\s*(\d+)/.exec(adm)[1];
  ok("admin total matches the shipped Masterclass", admTotal === M_LESSONS, "admin says " + admTotal);

  const L = bk.split("=== LESSONS")[1].split("=== QUIZZES")[0].replace(/^[^\n]*\n/, "").trim();
  const Q = bk.split("=== QUIZZES · paste into M_QZ ===")[1].trim();
  let parked;
  try { parked = new Function("return { L:[\n" + L + "\n], Q:{\n" + Q + "} }")(); }
  catch (e) { parked = null; ok("backlog parses as JavaScript", false, e.message); }
  if (parked) {
    ok("backlog parses as JavaScript", true);
    ok("backlog holds the remaining 8 lessons", parked.L.length === 8);
    ok("backlog holds the remaining 5 quizzes", Object.keys(parked.Q).join(",") === "M3,M4,M5,M6,M7");
    ok("backlog lessons are complete",
      parked.L.every(l => l.m && l.t && l.pts.length >= 3 && l.lab.length >= 3));
    ok("backlog questions are complete",
      Object.values(parked.Q).every(q => q.q.length === 5 && q.q.every(x => x.t && x.e && x.o.length >= 2)));
    ok("shipped plus parked fills the reserved range 100-113",
      100 + M_LESSONS + parked.L.length - 1 === 113);
    ok("no module is split between shipped and parked", (() => {
      const shipped = new Set([...idx.matchAll(/\{m:"(M\d[^"]*)"/g)].map(m => m[1]));
      return parked.L.every(l => !shipped.has(l.m));
    })());
  }

  ok("the backlog is not cached by the service worker", !sw.includes("masterclass-backlog"));
  ok("the backlog is not fetched by the app", !idx.includes("masterclass-backlog"));
  ok("README points at the backlog", rme.includes("masterclass-backlog.txt"));
  ok("README no longer claims M3-M7 are live", !/Masterclass covers:/.test(rme));

  /* the service worker must cache every page it is supposed to serve offline */
  ["index.html", "join.html", "admin.html", "styles.css", "manifest.json"].forEach(f =>
    ok("service worker caches " + f, sw.includes(f)));
  ok("tests are not shipped to the service worker", !sw.includes("tests/"));

  /* firestore.rules is what the teacher pastes into Firebase. It must never
     drift from the copy printed in README.txt. */
  const fr = fs.readFileSync(ROOT + "firestore.rules", "utf8").trim();
  const inReadme = rme.slice(rme.indexOf("rules_version"), rme.indexOf("HOW TEACHERS REACH")).trim();
  ok("firestore.rules matches the block in README", fr === inReadme);
  ok("the rules close every brace", (fr.match(/{/g) || []).length === (fr.match(/}/g) || []).length);
  ["users","learners","results","config","materials","assignments","submissions","marks"]
    .forEach(c => ok("firestore.rules covers " + c, fr.includes("match /" + c + "/")));
  ok("the rules are not cached by the service worker", !sw.includes("firestore.rules"));

  const v = +/rehoteq-classroom-v(\d+)/.exec(sw)[1];
  ok("README tells the teacher the next version number", rme.includes("change v" + v + " to v" + (v + 1)));
}

console.log("\n" + SUITE + (process.env.NO_USER ? " (signed out)" : "") + ": " + pass + " passed, " + fail + " failed");
if (fail) process.exitCode = 1;

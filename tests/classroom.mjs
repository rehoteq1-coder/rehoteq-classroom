/* Suite for the Class tab: live card, materials, assignments, hand-in, marking. */
import { loadClassicPage, loadModulePage, attachFirebase, setOnline } from "./harness.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { if (c) { pass++; console.log("  ok   " + n); } else { fail++; console.log("  FAIL " + n + (x ? "  <- " + x : "")); } };
const txt = el => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..") + path.sep;

/* ============ LEARNER · the Class tab ============ */
console.log("\n--- learner Class tab ---");
{
  const { w, doc } = loadClassicPage("index.html");
  await sleep(150);
  const app = doc.getElementById("app");

  ok("there is a Class tab", w.TABS.some(t => t[0] === "class"));
  ok("the tab bar still has four tabs", w.TABS.length === 4);

  /* give it a profile so the dashboard renders, then wire the mock SDK */
  w.profile = { uid: "u1", name: "Amaka Obi", phone: "0803", track: "Beginner", mode: "Onsite", device: "Phone", level: "New", goal: "Job" };
  const F = await attachFirebase(w, "u1");
  w.profChecked = true;
  const W = F.WRITES; W.length = 0;

  w.loadClassroom(); await sleep(120);
  ok("materials load", w.mats.length === 3);
  ok("assignments load", w.asgs.length === 3);
  ok("only this learner's hand-ins load", Object.keys(w.subs).sort().join(",") === "a1,a2");
  ok("only this learner's marks load", Object.keys(w.marks).join(",") === "a2");

  w.tab = "class"; w.home(); await sleep(60);
  const body = txt(app);

  /* live card */
  ok("live class card shows what was scheduled", body.includes("Saturday 10am"));
  ok("the join button names the platform", body.includes("Join on Google Meet"), body.slice(0, 200));
  ok("the announcement is shown", body.includes("Bring your laptop"));

  /* materials, filtered to the learner's track */
  ok("a shared 'Everyone' material is listed", body.includes("Week 3 slides"));
  ok("a Beginner material is listed for a Beginner", body.includes("Keyboard shortcuts"));
  ok("a Masterclass-only material is hidden from a Beginner", !body.includes("React in 20 minutes"));
  const matLinks = [...app.querySelectorAll('a.item[target="_blank"]')];
  ok("materials open in a new tab safely", matLinks.length >= 2 && matLinks.every(a => a.rel.includes("noopener")));

  /* assignments */
  ok("an assignment for everyone is listed", body.includes("Build a school landing page"));
  ok("a Beginner assignment is listed", body.includes("Ship it to GitHub Pages"));
  ok("a Masterclass assignment is hidden", !body.includes("React component library"));
  ok("a marked assignment shows the score", body.includes("40/50"));
  ok("an unmarked hand-in reads as handed in", body.includes("Handed in"));

  /* opening one that is already marked */
  w.openAssignment("a2"); await sleep(60);
  const a2 = txt(app);
  ok("the mark is shown to the learner", a2.includes("40/50"));
  ok("the grade is shown", /A1/.test(a2));
  ok("the trainer feedback is shown", a2.includes("Compress the hero image"));
  ok("a marked assignment can no longer be edited",
    [...app.querySelectorAll("input")].every(i => i.disabled));

  /* handing in */
  w.openAssignment("a3"); await sleep(60);
  ok("an assignment with no hand-in offers the form", !!doc.getElementById("asg-link"));
  const link = doc.getElementById("asg-link"), note = doc.getElementById("asg-note");
  const handIn = () => [...app.querySelectorAll("button")].find(b => /Hand in|Update my hand-in/.test(b.textContent));

  link.value = "http://not-secure.example"; handIn().click(); await sleep(40);
  ok("a non-https link is refused", txt(app.querySelector(".err")).includes("https://"));
  ok("nothing was written for a bad link", W.length === 0);

  link.value = "https://amaka.github.io/react-kit"; note.value = "Three components";
  handIn().click(); await sleep(80);
  ok("the hand-in is written", W.length === 1 && W[0].col === "submissions");
  ok("the document id is assignment__uid", W[0].id === "a3__u1", W[0].id);
  ok("only the five allowed fields are written",
    Object.keys(W[0].data).sort().join(",") === "assignment,link,note,submittedAt,uid", Object.keys(W[0].data).join(","));
  ok("the learner's own uid is written", W[0].data.uid === "u1");
  ok("a learner never writes to marks", !W.some(x => x.col === "marks"));
  ok("the hand-in is no longer pending once sent", w.subs.a3 && !w.subs.a3.pending);

  /* offline hand-in */
  W.length = 0; setOnline(w, false);
  w.openAssignment("a1"); await sleep(60);
  doc.getElementById("asg-link").value = "https://amaka.github.io/offline-work";
  handIn().click(); await sleep(60);
  ok("an offline hand-in sends nothing", W.length === 0);
  ok("an offline hand-in is saved on the device", w.subs.a1 && w.subs.a1.pending === true);
  ok("it is queued in the outbox", w.subOut.some(x => x.assignment === "a1"));
  ok("the learner is told it is saved, not sent", txt(app).includes("Waiting to send"));

  /* a refresh must not lose unsent work */
  w.loadClassroom(); await sleep(120);
  ok("a refresh never discards an unsent hand-in", w.subs.a1 && w.subs.a1.pending === true);
  ok("the unsent link survives the refresh", w.subs.a1.link === "https://amaka.github.io/offline-work");

  /* back online */
  setOnline(w, true); w.pushSubs(); await sleep(120);
  ok("coming back online sends the queued hand-in",
    W.some(x => x.col === "submissions" && x.id === "a1__u1"));
  ok("the outbox is emptied after sending", !w.subOut.some(x => x.assignment === "a1"));
  ok("it stops being pending", w.subs.a1 && !w.subs.a1.pending);

  /* a Masterclass learner sees the other side of the filter */
  w.profile.track = "Masterclass"; w.applyTrack("Masterclass");
  w.tab = "class"; w.home(); await sleep(60);
  const mb = txt(app);
  ok("a Masterclass learner sees Masterclass material", mb.includes("React in 20 minutes"));
  ok("they still see everyone's material", mb.includes("Week 3 slides"));
  ok("they do not see Beginner-only material", !mb.includes("Keyboard shortcuts"));
}

/* ============ LEARNER · no network at all ============ */
console.log("\n--- learner Class tab with no Firebase ---");
{
  const { w, doc } = loadClassicPage("index.html");
  await sleep(150);
  w.profile = { uid: "u1", name: "Amaka", phone: "0803", track: "Beginner", mode: "Onsite", device: "Phone", level: "New", goal: "Job" };
  w.user = { uid: "u1" }; w.profChecked = true;
  w.mats = [{ id: "m9", title: "Cached slides", kind: "doc", url: "https://x.test/s", track: "All" }];
  w.asgs = [{ id: "a9", title: "Cached assignment", track: "All", points: 100, dueAt: 0 }];
  w.classLoaded = true;
  w.tab = "class"; w.home(); await sleep(60);
  const body = txt(doc.getElementById("app"));
  ok("cached materials still render offline", body.includes("Cached slides"));
  ok("cached assignments still render offline", body.includes("Cached assignment"));
  ok("no crash without Firebase", !!doc.getElementById("app").children.length);
}

/* ============ ADMIN · materials and marking ============ */
console.log("\n--- teacher console: materials and marking ---");
{
  const { w, doc } = await loadModulePage("admin.html");
  await sleep(350);
  const W = globalThis.__WRITES; W.length = 0;
  const root = doc.getElementById("root");
  const nav = () => [...doc.querySelectorAll(".navlink")];

  ok("the sidebar gained Materials and Assignments", nav().length === 6);
  ok("Assignments badges the number waiting to be marked",
    txt(nav().find(a => /Assignments/.test(a.textContent))).includes("2"), txt(nav().find(a => /Assignments/.test(a.textContent))));

  /* materials */
  nav().find(a => /Materials/.test(a.textContent)).click(); await sleep(80);
  let body = txt(root);
  ok("materials view lists what is shared", body.includes("Week 3 slides") && body.includes("React in 20 minutes"));
  ok("it says who each item is for", body.includes("Masterclass") && body.includes("Everyone"));

  let inputs = [...root.querySelectorAll("input")];
  const mTitle = inputs[0], mUrl = inputs[1];
  const share = [...root.querySelectorAll("button")].find(b => /Share with learners/.test(b.textContent));
  mTitle.value = "x"; share.click(); await sleep(60);
  ok("a material needs a real title", txt(root.querySelector(".err")).length > 0);
  ok("nothing was written for a bad title", W.length === 0);

  mTitle.value = "Past questions 2025"; mUrl.value = "drive.example/x"; share.click(); await sleep(60);
  ok("a material link must be https", txt(root.querySelector(".err")).includes("https://"));
  ok("nothing was written for a bad link", W.length === 0);

  mUrl.value = "https://drive.example/past-questions"; share.click(); await sleep(150);
  ok("the material is written", W.some(x => x.col === "materials"), JSON.stringify(W.slice(0,1)));
  const mat = W.find(x => x.col === "materials");
  ok("the material carries a title, url and audience",
    mat.data.title === "Past questions 2025" && mat.data.url.startsWith("https://") && !!mat.data.track);

  /* assignments */
  W.length = 0;
  nav().find(a => /Assignments/.test(a.textContent)).click(); await sleep(80);
  body = txt(root);
  ok("assignments view lists what is set", body.includes("Build a school landing page"));
  ok("it counts hand-ins per assignment", /2 handed in/.test(body), body.slice(0, 400));
  ok("it says how many are waiting", /waiting to be marked/.test(body));

  inputs = [...root.querySelectorAll("input")];
  const aTitle = inputs[0];
  const setBtn = [...root.querySelectorAll("button")].find(b => /Set this assignment/.test(b.textContent));
  aTitle.value = "Build a CBT app"; setBtn.click(); await sleep(150);
  const asg = W.find(x => x.col === "assignments");
  ok("the assignment is written", !!asg);
  ok("it defaults to 100 marks", asg.data.points === 100);
  ok("it records the audience", !!asg.data.track);

  /* marking */
  W.length = 0;
  const rowBtn = [...root.querySelectorAll(".item")].find(b => /Build a school landing page/.test(b.textContent));
  rowBtn.click(); await sleep(100);
  const sheet = doc.querySelector(".sheet");
  ok("the marking sheet opens", !!sheet);
  const sTxt = txt(sheet);
  ok("it shows both hand-ins", sTxt.includes("Amaka") && sTxt.includes("Bello"));
  ok("it links to the learner's work",
    [...sheet.querySelectorAll("a")].some(a => a.href.includes("amaka.github.io")));
  ok("it shows the learner's note", sTxt.includes("Done the hero"));

  /* rows are newest hand-in first, so pick Amaka's card explicitly */
  const card = [...sheet.querySelectorAll(".card")].find(c => /Amaka/.test(c.textContent));
  ok("each hand-in is its own card", !!card);
  const scoreIn = card.querySelector('input[type="number"]');
  const saveMark = [...card.querySelectorAll("button")].find(b => /Save mark/.test(b.textContent));
  scoreIn.value = "140"; saveMark.click(); await sleep(60);
  ok("a mark above the total is refused", txt(card.querySelector(".err")).includes("between 0 and 100"));
  ok("nothing was written for an invalid mark", W.length === 0);

  scoreIn.value = "82";
  const fbIn = card.querySelector('input[type="text"]');
  fbIn.value = "Strong layout. Add alt text.";
  saveMark.click(); await sleep(150);
  const mk = W.find(x => x.col === "marks");
  ok("the mark is written", !!mk);
  ok("it is written against assignment__uid", mk && mk.id === "a1__u1", mk && mk.id);
  ok("it stores the score and the total", mk && mk.data.score === 82 && mk.data.points === 100);
  ok("it converts to the same A1-F9 scale", mk && mk.data.grade === "A1", mk && mk.data.grade);
  ok("it stores the feedback", mk && mk.data.feedback.includes("alt text"));
  ok("it records who marked it", mk && !!mk.data.markedBy);
  ok("marking never rewrites the learner's hand-in", !W.some(x => x.col === "submissions"));
}

/* ============ ADMIN · rules not published yet ============ */
console.log("\n--- teacher console before the new rules are published ---");
{
  process.env.DENY = "materials,assignments,submissions,marks";
  const { doc } = await loadModulePage("admin.html");
  await sleep(350);
  const body = txt(doc.getElementById("root"));
  ok("the console still opens", body.includes("How the class is doing"));
  ok("the learner data still loads", body.includes("Learners enrolled"));
  ok("it says plainly that the feature is not switched on", body.includes("not switched on yet"));
  ok("it names what Firestore refused", /materials/.test(body) && /marks/.test(body));
  ok("it says where to fix it", body.includes("README.txt"));
  delete process.env.DENY;
}

/* ============ REPO · the rules the teacher must paste ============ */
console.log("\n--- Firestore rules in README ---");
{
  const r = fs.readFileSync(ROOT + "README.txt", "utf8");
  const sw = fs.readFileSync(ROOT + "sw.js", "utf8");
  const rules = r.slice(r.indexOf("rules_version"), r.indexOf("HOW TEACHERS REACH"));

  ["materials", "assignments", "submissions", "marks"].forEach(c =>
    ok("rules cover the " + c + " collection", rules.includes("match /" + c + "/{id}")));

  const subBlock = rules.slice(rules.indexOf("match /submissions"), rules.indexOf("match /marks"));
  ok("a learner may only write their own hand-in", subBlock.includes("request.resource.data.uid == request.auth.uid"));
  ok("the hand-in id is pinned to the learner", subBlock.includes("'__' + request.auth.uid"));
  ok("the hand-in fields are whitelisted",
    subBlock.includes("hasOnly(['uid','assignment','link','note','submittedAt'])"));
  ok("a hand-in link must be https", subBlock.includes("matches('https://.*')"));
  ok("hand-ins can only be deleted by admin", subBlock.includes("allow delete: if isAdmin()"));
  ok("a score is NOT writable through the hand-in", !subBlock.includes("request.resource.data.score"));

  const markBlock = rules.slice(rules.indexOf("match /marks"));
  ok("only an admin can write a mark", /allow create, update: if isAdmin\(\)/.test(markBlock));
  ok("a mark cannot be written by a learner", !/allow write: if request\.auth/.test(markBlock));
  ok("a learner can read their own mark", markBlock.includes("resource.data.uid == request.auth.uid"));
  ok("a mark cannot exceed the total", markBlock.includes("score <= request.resource.data.points"));
  ok("marks can only be deleted by admin", markBlock.includes("allow delete: if isAdmin()"));

  ok("README explains the no-upload decision", /no file uploads, on purpose/i.test(r));
  ok("README explains the offline hand-in", /Saved on\s*\n?phone/i.test(r) || /Saved on phone/.test(r));
  ok("README has the streaming upgrade path", /LIVE STREAMING LATER/.test(r));
  ok("README has a test for marking", /mark it/.test(r));
  const swv = +(/rehoteq-classroom-v(\d+)/.exec(sw) || [0, 0])[1];
  ok("the service worker was bumped to v14 or later", swv >= 14);
}

console.log("\nclassroom: " + pass + " passed, " + fail + " failed");
if (fail) process.exitCode = 1;

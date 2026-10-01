import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

export async function loadModulePage(file){
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const dom = new JSDOM(html, { url: "https://x.test/" + file, pretendToBeVisual: true });
  const w = dom.window;
  const m = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map(x => x[1]);
  const code = m.sort((a,b)=>b.length-a.length)[0].replaceAll(SDK, path.join(HERE, "fbmock") + "/");
  const tmp = path.join(HERE, ".page-" + file.replace(/\W/g,"_") + ".mjs");
  fs.writeFileSync(tmp, code);
  for (const k of ["document","HTMLElement","Node","Event","CustomEvent","getComputedStyle",
      "requestAnimationFrame","cancelAnimationFrame","Blob","FileReader","matchMedia","scrollTo","history","alert","confirm","SVGElement"]) {
    if (k in w) globalThis[k] = typeof w[k] === "function" && !/^[A-Z]/.test(k) ? w[k].bind(w) : w[k];
  }
  globalThis.window = w;
  globalThis.addEventListener = w.addEventListener.bind(w);
  globalThis.removeEventListener = w.removeEventListener.bind(w);
  Object.defineProperty(globalThis, "scrollY", { get: () => w.scrollY, configurable: true });
  Object.defineProperty(globalThis, "innerWidth", { get: () => w.innerWidth, configurable: true });
  globalThis.localStorage = w.localStorage;
  globalThis.sessionStorage = w.sessionStorage;
  Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true, writable: true });
  globalThis.location = w.location;
  w.URL.createObjectURL = () => "blob:x"; w.URL.revokeObjectURL = () => {};
  globalThis.URL.createObjectURL = () => "blob:x"; globalThis.URL.revokeObjectURL = () => {};
  if (!w.matchMedia) w.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  globalThis.matchMedia = w.matchMedia;
  await import(pathToFileURL(tmp).href + "?v=" + Date.now());
  await new Promise(r => setTimeout(r, 120));
  return { dom, w, doc: w.document };
}

export function loadClassicPage(file){
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const dom = new JSDOM(html, { url: "https://x.test/" + file, runScripts: "dangerously", pretendToBeVisual: true });
  const w = dom.window;
  if (!w.matchMedia) w.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  return { dom, w, doc: w.document };
}

/* The learner page is a classic script and jsdom cannot run its dynamic
   import() of the Firebase SDK, so boot() always fails there. Wire the mock
   SDK in by hand instead, exactly in the shape boot() would have produced. */
export async function attachFirebase(w, uid){
  const F = await import("./fbmock/firebase-firestore.js?v=" + Date.now());
  w.fb = { db: {}, doc: F.doc, getDoc: F.getDoc, setDoc: F.setDoc, deleteDoc: F.deleteDoc,
    collection: F.collection, getDocs: F.getDocs, query: F.query,
    where: F.where, orderBy: F.orderBy, limit: F.limit };
  w.user = { uid, email: uid + "@x.ng" };
  return F;
}
export function setOnline(w, on){
  Object.defineProperty(w.navigator, "onLine", { get: () => on, configurable: true });
}

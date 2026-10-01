export const WRITES = [];
globalThis.__WRITES = WRITES;
const denies = n => (process.env.DENY || "").split(",").filter(Boolean).includes(n);

const LEARNERS = [
  {id:"u1",name:"Amaka Obi",phone:"08030000001",track:"Beginner",mode:"Onsite",device:"Phone",level:"New",goal:"Get a job"},
  {id:"u2",name:"Bello Musa",phone:"08030000002",track:"Masterclass",mode:"Online",device:"Laptop",level:"Some",goal:"Freelance"},
  {id:"u3",name:"Chidi Eze",phone:"08030000003",track:"Masterclass",mode:"Onsite",device:"Laptop",level:"Some",goal:"Startup"}
];
const USERS = [
  {id:"u1",email:"amaka@x.ng",done:[0,1,2,3,4,5]},
  {id:"u2",email:"bello@x.ng",done:[100,101,102]},
  {id:"u3",email:"chidi@x.ng",done:[0,1,2,3,4,5,6,7,8,9,10,11,12,100,101]}
];
const RESULTS = [
  {uid:"u1",quiz:"B1",score:4,total:5,pct:80,grade:"A1",takenAt:Date.now()-864e5},
  {uid:"u2",quiz:"M1",score:3,total:5,pct:60,grade:"C4",takenAt:Date.now()-2*864e5},
  {uid:"u3",quiz:"M2",score:5,total:5,pct:100,grade:"A1",takenAt:Date.now()-3*864e5}
];
const MATERIALS = [
  {id:"m1",title:"Week 3 slides: CSS layout",kind:"doc",url:"https://drive.example/slides",note:"Read before Saturday",track:"All",createdAt:Date.now()-3*864e5},
  {id:"m2",title:"React in 20 minutes",kind:"video",url:"https://youtube.example/x",note:"",track:"Masterclass",createdAt:Date.now()-864e5},
  {id:"m3",title:"Keyboard shortcuts sheet",kind:"link",url:"https://example.ng/keys",note:"",track:"Beginner",createdAt:Date.now()-2*864e5}
];
const ASSIGNMENTS = [
  {id:"a1",title:"Build a school landing page",brief:"Hero, three cards, a footer.",track:"All",points:100,dueAt:Date.now()+5*864e5,createdAt:Date.now()-4*864e5},
  {id:"a2",title:"Ship it to GitHub Pages",brief:"Push and turn on Pages.",track:"Beginner",points:50,dueAt:Date.now()-2*864e5,createdAt:Date.now()-6*864e5},
  {id:"a3",title:"A React component library",brief:"Three reusable components.",track:"Masterclass",points:100,dueAt:0,createdAt:Date.now()-864e5}
];
const SUBMISSIONS = [
  {id:"a1__u1",uid:"u1",assignment:"a1",link:"https://amaka.github.io/school",note:"Done the hero",submittedAt:Date.now()-2*864e5},
  {id:"a1__u2",uid:"u2",assignment:"a1",link:"https://bello.github.io/school",note:"",submittedAt:Date.now()-864e5},
  {id:"a2__u1",uid:"u1",assignment:"a2",link:"https://amaka.github.io/",note:"Live now",submittedAt:Date.now()-3*864e5}
];
const MARKS = [
  {id:"a2__u1",uid:"u1",assignment:"a2",score:40,points:50,grade:"A1",feedback:"Clean work. Compress the hero image.",markedAt:Date.now()-864e5,markedBy:"u-test"}
];
const BOOK = {learners:LEARNERS,users:USERS,results:RESULTS,materials:MATERIALS,
  assignments:ASSIGNMENTS,submissions:SUBMISSIONS,marks:MARKS};

function snap(id,data){return {id,exists:()=>!!data,data:()=>data}}
function qs(arr){return {forEach:f=>arr.forEach(f),docs:arr,size:arr.length,empty:!arr.length}}
function denied(n){const e=new Error("Missing or insufficient permissions.");e.code="permission-denied";return Promise.reject(e)}

export function getFirestore(){return {}}
export function collection(_,n){return {__c:n,__w:[]}}
export function doc(a,b,c){return {__c:typeof b==="string"?b:(b&&b.__c),__id:c}}
export function query(c,...parts){const o={__c:c.__c,__w:(c.__w||[]).slice()};parts.forEach(p=>{if(p&&p.__where)o.__w.push(p)});return o}
export function where(f,op,v){return {__where:true,f,op,v}}
export function orderBy(){return {}}
export function limit(){return {}}
export function getDocs(c){
  const n=c.__c;
  if(denies(n))return denied(n);
  let arr=(BOOK[n]||[]).slice();
  (c.__w||[]).forEach(w=>{arr=arr.filter(x=>x[w.f]===w.v)});
  return Promise.resolve(qs(arr.map(x=>snap(x.id||("d"+Math.random()),x))));
}
export function getDoc(d){
  if(denies(d.__c))return denied(d.__c);
  if(d.__c==="config")return Promise.resolve(snap("classroom",{next:"Saturday 10am · CSS live lab",link:"https://meet.google.com/abc-defg-hij",note:"Bring your laptop",updatedAt:Date.now()}));
  const row=(BOOK[d.__c]||[]).find(x=>x.id===d.__id);
  if(d.__c==="users"&&row)return Promise.resolve(snap(d.__id,{done:row.done,updatedAt:1,email:row.email}));
  return Promise.resolve(snap(d.__id,row||null));
}
export function setDoc(d,data){
  if(denies(d.__c))return denied(d.__c);
  WRITES.push({col:d.__c,id:d.__id,data});
  return Promise.resolve();
}
export function serverTimestamp(){return Date.now()}

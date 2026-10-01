const U = process.env.NO_USER ? null : { uid: process.env.AS_UID || "u-test", email:"teacher@rehoteq.ng" };
export function getAuth(){return {currentUser:U}}
export function onAuthStateChanged(a,cb){setTimeout(()=>cb(U),0);return()=>{}}
export function signInWithEmailAndPassword(){return Promise.resolve({user:U})}
export function createUserWithEmailAndPassword(){return Promise.resolve({user:{uid:"u-new",email:"new@x.ng"}})}
export function signOut(){return Promise.resolve()}
export function sendPasswordResetEmail(){return Promise.resolve()}
export function setPersistence(){return Promise.resolve()}
export const browserLocalPersistence = {};

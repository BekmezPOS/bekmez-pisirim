// Offline regressions against the exact shipped inline code. No live accounts or network writes.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const between=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const helpers=between('let bkmAuthAction =','    // v13: Kişisel veriler');
const access=between('    let bkmAccountReadJob=','    function SistemAyarlariniDinle()');
const login=between('    async function GirisYapTetikle()','    function FormatTelefon(');
const registration=between('    async function YeniNesilKayitOl()','    let phoneVerificationRef=');
const observer=between('    firebase.auth().onAuthStateChanged(user=>','    async function YeniNesilKayitOl()');
const service=between('    async function CustomerService(path,payload){','    async function DevamEtPaketGonder(');
async function flush(){for(let i=0;i<90;i++)await Promise.resolve();}
class Element{
  constructor(){this.value='';this.disabled=false;this.checked=true;this.style={};this.children=[];this.textContent='';this.classList={add(){},remove(){}};}
  setAttribute(){} append(...v){this.children.push(...v);} prepend(v){this.children.unshift(v);} replaceChildren(){this.children=[];}
  addEventListener(k,fn){this[k]=fn;} querySelector(){return this;}
}
function harness(options={}){
  const ids=new Map(),element=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id);};
  const timers=new Map();let time=0,next=0;const calls={signIn:0,create:0,read:0,off:0,profile:0,phone:0,ban:0,fetch:0,reload:0};
  const vault=new Map();let listener,accessCallback;
  const user={uid:'test-user',email:'test@gmail.com',emailVerified:true,displayName:'05000000000',getIdToken:async()=> 'stub-id-token',sendEmailVerification:async()=>{},reload:async()=>{calls.reload++;},...options.user};
  const auth={currentUser:null,setPersistence:async()=>{},signOut:async()=>{auth.currentUser=null;},onAuthStateChanged:fn=>{listener=fn;},
    signInWithEmailAndPassword:async()=>{calls.signIn++;if(options.signIn)return options.signIn(auth,user,()=>listener?.(user));auth.currentUser=user;listener?.(user);return {user};},
    createUserWithEmailAndPassword:async()=>{calls.create++;if(options.create)return options.create(auth,user,()=>listener?.(user));auth.currentUser=user;listener?.(user);return {user};}
  };
  const authFn=Object.assign(()=>auth,{Auth:{Persistence:{LOCAL:'local'}}});
  const c={console,AbortController,Date:class extends Date{constructor(...v){super(...(v.length?v:[time]));}static now(){return time;}},
    setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{at:time+ms,fn});return id;},clearTimeout:id=>timers.delete(id),clearInterval:id=>timers.delete(id),
    document:{readyState:'complete',getElementById:element,querySelector:()=>element('login-button'),createElement:()=>new Element()},
    navigator:{clipboard:{writeText:async()=>{}}},window:{},
    firebase:{auth:authFn,database:()=>({ref:()=>({on:(event,fn,error)=>{calls.read++;accessCallback=fn;if(options.access==='pending')return;queueMicrotask(()=>options.access==='denied'?error():fn({val:()=>options.access||null}));},off:()=>{calls.off++;}})})},
    appCheck:{getToken:options.appCheck|| (async()=>({token:'stub-attestation'}))},
    SecureKaydet:async(k,v)=>vault.set(k,v),SecureOku:async k=>vault.get(k)||null,
    BanCanliDinle:()=>{},BanOturumunuKapat:()=>{calls.ban++;c.isBannedUser=true;auth.currentUser=null;},
    banAuthNesli:0,isBannedUser:false,isPasswordValid:true,emailInterval:null,
    KayitOnayToggle:()=>{element('btn-email-verify').disabled=!c.isPasswordValid;},
    BasariliGirisIslemleri:async phone=>{calls.profile++;calls.profilePhone=phone;},
    WhatsappDoğrulamasiniBaslat:async phone=>{calls.phone++;calls.phoneValue=phone;},
    WheelResetSession:()=>{c.wheelSessionEpoch++;},BanDinlemeyiDurdur:()=>{},
    ProfilArayuzunuGuncelle:()=>{},SistemAyarlariniDinle:()=>{},
    wheelSessionEpoch:0,WheelSession:()=>auth.currentUser?.emailVerified?auth.currentUser:null,
    WheelStillCurrent:(u,e)=>auth.currentUser?.uid===u.uid&&e===c.wheelSessionEpoch,
    WHEEL_API_URL:'https://api.bekmezgo.com/wheel/spin',URL,
    BekmezSecurity:{headers:options.headers|| (async()=>({}))},
    fetch:async()=>{calls.fetch++;return {ok:true,status:200,text:async()=>JSON.stringify({ok:true,telefon:user.displayName})};},
    OrderServiceMessage:()=> 'Server error'
  };
  element('login-email').value=user.email;element('login-pass').value='test-only-password';
  element('prof-telefon').value='5000000001';element('prof-email').value=user.email;element('prof-password').value='test-only-password';
  vm.createContext(c);vm.runInContext(helpers+'\n'+access+'\n'+login+'\n'+registration+'\n'+service+'\n'+observer,c);
  return {c,auth,user,element,calls,vault,access:()=>accessCallback,
    async advance(ms){const end=time+ms;await flush();while(true){const nextTimer=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!nextTimer)break;time=nextTimer[1].at;timers.delete(nextTimer[0]);nextTimer[1].fn();await flush();}time=end;await flush();},
    text(){return element('bkm-auth-status').children[0]?.textContent||'';}
  };
}
test('stalled account read releases login, detaches listener, reports its phase',async()=>{
  const h=harness({access:'pending'}),p=h.c.GirisYapTetikle();await flush();assert.equal(h.element('login-pass').value,'');
  await h.advance(12000);await p;assert.equal(h.element('login-button').disabled,false);assert.equal(h.calls.off,1);assert.equal(h.calls.profile,0);assert.match(h.text(),/ACCOUNT_ACCESS.*AUTH_STEP_TIMEOUT/);
});
test('App Check failure stops account reads and never marks the user banned',async()=>{
  const h=harness({appCheck:async()=>{throw {code:'appCheck/throttled'};}});await h.c.GirisYapTetikle();
  assert.equal(h.calls.read,0);assert.equal(h.calls.profile,0);assert.equal(h.calls.ban,0);assert.match(h.text(),/APP_CHECK/);assert.equal(h.element('login-button').disabled,false);
});
test('manual login and auth observer restore a profile only once',async()=>{
  const h=harness();await h.c.GirisYapTetikle();assert.equal(h.calls.signIn,1);assert.equal(h.calls.profile,1);
});
test('credential errors have a visible message and unlock login',async()=>{
  const h=harness({signIn:async()=>{throw {code:'auth/invalid-credential'};}});await h.c.GirisYapTetikle();
  assert.match(h.text(),/E-posta veya şifre/);assert.equal(h.element('login-button').disabled,false);assert.equal(h.calls.profile,0);
});
test('permission failure is not treated as a confirmed account ban',async()=>{
  const h=harness({access:'denied'});await h.c.GirisYapTetikle();assert.equal(h.calls.ban,0);assert.equal(h.calls.profile,0);assert.match(h.text(),/ACCOUNT_ACCESS_DENIED/);
});
test('an explicitly banned account cannot complete login',async()=>{
  const h=harness({access:{banned:true}});await h.c.GirisYapTetikle();assert.equal(h.calls.ban,1);assert.equal(h.calls.profile,0);assert.equal(h.auth.currentUser,null);
});
test('a session change while reading account access cannot open another profile',async()=>{
  const h=harness({access:'pending'}),p=h.c.GirisYapTetikle();await flush();h.auth.currentUser={uid:'different-user'};h.access()({val:()=>null});await p;
  assert.equal(h.calls.profile,0);assert.match(h.text(),/AUTH_SESSION_CHANGED/);
});
test('two clicks never start two credential requests',async()=>{
  const h=harness({access:'pending'}),p=h.c.GirisYapTetikle();await flush();await h.c.GirisYapTetikle();assert.equal(h.calls.signIn,1);await h.advance(12000);await p;
});
test('unverified login continues email verification without opening a profile',async()=>{
  const h=harness({user:{emailVerified:false}});await h.c.GirisYapTetikle();assert.equal(h.calls.profile,0);assert.equal(h.element('email-wait-overlay').style.display,'flex');
});
test('signup checks App Check before creating a Firebase account',async()=>{
  const h=harness({appCheck:async()=>{throw {code:'appCheck/recaptcha-error'};}});await h.c.YeniNesilKayitOl();assert.equal(h.calls.create,0);assert.match(h.text(),/APP_CHECK/);
});
test('failed verification mail retains the account and resumable identity',async()=>{
  const h=harness({user:{emailVerified:false,displayName:null,sendEmailVerification:async()=>{throw {code:'auth/network-request-failed'};}}});
  await h.c.YeniNesilKayitOl();assert.equal(h.calls.create,1);assert.equal(h.auth.currentUser.uid,h.user.uid);assert.equal(h.vault.get('bg_pending_tel'),'05000000001');assert.equal(h.element('email-wait-overlay').style.display,'flex');assert.match(h.element('bkm-email-status').textContent,/Yeniden gönder/);
});
test('an existing account resumes with its authenticated bound phone',async()=>{
  const h=harness({create:async()=>{throw {code:'auth/email-already-in-use'};}});await h.c.YeniNesilKayitOl();
  assert.equal(h.calls.signIn,1);assert.equal(h.calls.profile,1);assert.equal(h.calls.profilePhone,h.user.displayName);assert.equal(h.calls.phone,0);
});
test('a timed-out credential request cannot start duplicate account creation',async()=>{
  const h=harness({create:()=>new Promise(()=>{})}),p=h.c.YeniNesilKayitOl();await flush();await h.advance(25000);await p;
  h.c.isPasswordValid=true;h.element('prof-password').value='retry-password';await h.c.YeniNesilKayitOl();assert.equal(h.calls.create,1);assert.equal(h.element('login-button').disabled,false);
});
test('email checks are serialized and a cancelled check cannot continue registration',async()=>{
  let resolveReload;const h=harness({user:{emailVerified:false,reload:()=>{h.calls.reload++;return new Promise(r=>resolveReload=r);}}});
  h.auth.currentUser=h.user;h.c.EpostaOnayiniBekle(h.user,'05000000001',h.user.email);h.element('bkm-email-check').onclick();h.element('bkm-email-check').onclick();await flush();assert.equal(h.calls.reload,1);
  await h.c.IptalEtEpostaBekleme(true);h.user.emailVerified=true;resolveReload();await flush();assert.equal(h.calls.phone,0);assert.equal(h.calls.profile,0);
});
test('reopening email verification while an old check settles keeps polling the new session',async()=>{
  const resolves=[];const h=harness({user:{emailVerified:false,reload:()=>{h.calls.reload++;return new Promise(r=>resolves.push(r));}}});
  h.auth.currentUser=h.user;h.c.EpostaOnayiniBekle(h.user,'05000000001',h.user.email);h.element('bkm-email-check').onclick();await flush();
  await h.c.IptalEtEpostaBekleme(false);h.c.EpostaOnayiniBekle(h.user,'05000000001',h.user.email);await h.advance(4000);assert.equal(h.calls.reload,1);
  resolves[0]();await flush();await h.advance(1000);assert.equal(h.calls.reload,2);resolves[1]();await flush();
});
test('device proof timeout sends no profile request, even if proof resolves late',async()=>{
  let finish;const h=harness({headers:()=>new Promise(r=>finish=r)});h.auth.currentUser=h.user;
  const p=h.c.CustomerService('/profile/sync',{}).catch(e=>e);await flush();await h.advance(45000);assert.equal((await p).code,'AUTH_STEP_TIMEOUT');assert.equal(h.calls.fetch,0);finish({});await flush();assert.equal(h.calls.fetch,0);
});
test('a stalled response body is bounded and the request is aborted',async()=>{
  const h=harness();h.auth.currentUser=h.user;let signal;h.c.fetch=async(u,init)=>{signal=init.signal;return {status:200,text:()=>new Promise(()=>{})};};
  const p=h.c.CustomerService('/profile/sync',{}).catch(e=>e);await flush();await h.advance(30000);assert.equal((await p).code,'AUTH_STEP_TIMEOUT');assert.equal(signal.aborted,true);
});
test('reports contain fixed phases/codes but no credentials, tokens, or identity',async()=>{
  const h=harness({access:'pending'}),p=h.c.GirisYapTetikle();await h.advance(12000);await p;
  const report=h.c.window.BekmezGirisRaporu();for(const secret of [h.user.email,h.user.uid,'stub-id-token','stub-attestation','test-only-password'])assert.equal(report.includes(secret),false);
});
test('CSP permits encrypted Firebase shard sockets without executable JSONP origins',()=>{
  const policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const directives=Object.fromEntries(policy.split(';').map(v=>v.trim().split(/\s+/)).filter(v=>v[0]).map(([k,...v])=>[k,v]));
  assert.ok(directives['connect-src'].includes('wss://*.firebaseio.com/.ws'));
  assert.ok(!directives['script-src'].some(v=>v.includes('firebaseio.com')||v.includes('*')||v==="'unsafe-eval'"||v==="'unsafe-inline'"));
  assert.ok(!directives['frame-src'].some(v=>v.includes('firebaseio.com')||v.includes('*')));
  assert.ok(html.indexOf('bkmDatabaseTransport.INTERNAL.forceWebSockets()')<html.indexOf("firebase.database().ref("));
});
test('all inline hashes match both meta and per-page HTTP CSP; QR menu policy is independent',()=>{
  const headers=fs.readFileSync(path.join(__dirname,'../_headers'),'utf8');
  for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
    if(!match[2].trim())continue;const hash="'sha256-"+crypto.createHash('sha256').update(match[2]).digest('base64')+"'";
    assert.ok(html.slice(0,html.indexOf('<title>')).includes(hash));assert.equal(headers.split(hash).length-1,4);
  }
  assert.equal(headers.split('\n\n')[0].includes('Content-Security-Policy'),false);
  assert.equal(fs.readFileSync(path.join(__dirname,'../paket.html'),'utf8'),html);
});

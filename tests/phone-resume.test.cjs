const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('    async function IptalEtWhatsappBekleme()');
const section=html.slice(start,html.indexOf('    let profileSyncRequest=',start));
function harness(options={}){
 const calls={resume:0,signOut:0,delete:0,stop:0},values=new Map([['bg_wp_waiting','true']]),events={},overlay={style:{},classList:{remove(){}}};
 let clock=10000;const user={uid:'fixture-user',email:'fixture@example.invalid',emailVerified:true};
 const context={Date:{now:()=>clock},document:{visibilityState:'visible',getElementById:()=>overlay,addEventListener:(name,fn)=>events[name]=fn},window:{addEventListener:(name,fn)=>events[name]=fn},
  PhoneVerificationStop:()=>calls.stop++,BkmAuthStatus:()=>{},phoneVerificationOpening:false,bkmAuthAction:null,bkmCredentialPending:null,wheelSessionEpoch:1,
  firebase:{auth:()=>({currentUser:user,signOut:()=>calls.signOut++})},
  SecureOku:async k=>values.get(k),SecureSil:async()=>calls.delete++,
  BkmAuthStep:async p=>p,BkmAuthPendingPhone:async()=>options.phone===null?null:'05000000001',
  WheelStillCurrent:(u,e)=>u===user&&e===context.wheelSessionEpoch,
  BkmAuthRun:async(kind,job)=>job(),WhatsappDoğrulamasiniBaslat:async(...args)=>{calls.resume++;calls.args=args;},BkmAuthShowError:()=>{},
 };
 Object.assign(context,options.context||{});vm.createContext(context);vm.runInContext(section,context);
 return {context,calls,values,user,overlay,events,advance:()=>clock+=4000};
}
test('closing wait dialog preserves pending identity and authenticated session',async()=>{const h=harness();await h.context.IptalEtWhatsappBekleme();assert.equal(h.overlay.style.display,'none');assert.equal(h.calls.stop,1);assert.equal(h.calls.signOut,0);assert.equal(h.calls.delete,0);});
test('foreground return resumes pending verification through server flow',async()=>{const h=harness();await h.context.BkmResumePhoneVerification();assert.equal(h.calls.resume,1);assert.equal(h.calls.args[0],'05000000001');});
test('repeated pageshow and visibility events share one resume job',async()=>{const h=harness();await Promise.all([h.context.BkmResumePhoneVerification(),h.context.BkmResumePhoneVerification()]);assert.equal(h.calls.resume,1);});
test('hidden document does not resume',async()=>{const h=harness();h.context.document.visibilityState='hidden';await h.context.BkmResumePhoneVerification();assert.equal(h.calls.resume,0);});
test('missing pending marker cannot start phone verification',async()=>{const h=harness();h.values.clear();await h.context.BkmResumePhoneVerification();assert.equal(h.calls.resume,0);});
test('missing account-bound pending phone cannot start verification',async()=>{const h=harness({phone:null});await h.context.BkmResumePhoneVerification();assert.equal(h.calls.resume,0);});
test('session change while reading storage drops stale resume',async()=>{const h=harness();h.context.SecureOku=async()=>{h.context.wheelSessionEpoch++;return 'true';};await h.context.BkmResumePhoneVerification();assert.equal(h.calls.resume,0);});
test('unverified email cannot resume phone step',async()=>{const h=harness();h.user.emailVerified=false;await h.context.BkmResumePhoneVerification();assert.equal(h.calls.resume,0);});
test('active credential request cannot overlap with resume',async()=>{const h=harness({context:{bkmCredentialPending:{}}});await h.context.BkmResumePhoneVerification();assert.equal(h.calls.resume,0);});
test('both page lifecycle hooks are installed',()=>{const h=harness();assert.equal(typeof h.events.pageshow,'function');assert.equal(typeof h.events.visibilitychange,'function');});

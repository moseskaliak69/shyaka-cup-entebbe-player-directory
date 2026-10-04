import webpush from 'web-push';
const project = Deno.env.get('SUPABASE_URL')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origin = 'https://shyakacup.com';
const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
async function db(path:string,method='GET',body?:unknown,prefer='return=representation'){
 const r=await fetch(project+'/rest/v1/'+path,{method,headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json',Prefer:prefer},body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok)throw new Error('Database request failed');
 const t=await r.text();return t?JSON.parse(t):null;
}
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
function validSubscription(s:any){
 try{const u=new URL(s.endpoint);const h=u.hostname;
 const host=h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||h==='updates-autopush.webpush.mozaws.net'||h==='web.push.apple.com'||h.endsWith('.notify.windows.com');
 return host&&u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&s.endpoint.length<2048&&/^[A-Za-z0-9_-]{87}$/.test(s.keys?.p256dh)&&/^[A-Za-z0-9_-]{22}$/.test(s.keys?.auth);
 }catch{return false;}
}
async function configuration(){
 let c=(await db('push_configuration?id=eq.1'))[0];
 if(!c.public_key){const keys=webpush.generateVAPIDKeys();await db('push_configuration?id=eq.1&public_key=is.null','PATCH',{public_key:keys.publicKey,private_key:keys.privateKey});c=(await db('push_configuration?id=eq.1'))[0];}
 return c;
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 const action=new URL(req.url).pathname.split('/').pop();
 try{
  if(action==='config'&&req.method==='GET'){const c=await configuration();return reply({publicKey:c.public_key});}
  if(action==='dispatch'&&req.method==='POST'){
   const c=await configuration();const secret=req.headers.get('x-dispatch-secret')||'';
   if(!secret||await digest(secret)!==await digest(c.dispatch_secret))return reply({error:'Unauthorized'},401);
   await db('rpc/prepare_tournament_alerts','POST',{});
   const jobs=await db('rpc/claim_tournament_push','POST',{});
   let sent=0,failed=0;
   for(let i=0;i<jobs.length;i+=8)await Promise.all(jobs.slice(i,i+8).map(async(j:any)=>{
    try{
     if(!validSubscription(j))throw {statusCode:400};
     const details=webpush.generateRequestDetails({endpoint:j.endpoint,keys:j.keys},JSON.stringify({title:j.title,body:j.body,tag:j.tag,url:'/?view='+j.target+'&item='+j.source_id}),{vapidDetails:{subject:origin,publicKey:c.public_key,privateKey:c.private_key},TTL:Math.max(0,Math.min(3600,Math.floor((Date.parse(j.expires_at)-Date.now())/1000))),urgency:'normal'});
     const r=await fetch(details.endpoint,{method:'POST',headers:details.headers,body:details.body,redirect:'error',signal:AbortSignal.timeout(7000)});
     if(!r.ok)throw {statusCode:r.status};
     await db('push_deliveries?id=eq.'+j.delivery_id,'PATCH',{sent_at:new Date().toISOString(),last_status:r.status});sent++;
    }catch(e:any){const status=Number(e.statusCode)||0;failed++;
     if([404,410].includes(status))await db('push_subscriptions?id=eq.'+j.subscription_id,'DELETE');
     else await db('push_deliveries?id=eq.'+j.delivery_id,'PATCH',{last_status:status,...([400,401,403].includes(status)?{attempts:5}:{})});
    }
   }));
   return reply({claimed:jobs.length,sent,failed});
  }
  if(!['subscribe','unsubscribe','test'].includes(action||'')||req.method!=='POST')return reply({error:'Not found'},404);
  if(req.headers.get('origin')!==origin)return reply({error:'Origin not allowed'},403);
  const length=Number(req.headers.get('content-length')||0);if(length>6000)return reply({error:'Request too large'},413);
  const raw=await req.text();if(raw.length>6000)return reply({error:'Request too large'},413);
  const b=JSON.parse(raw);if(!/^[a-f0-9]{64}$/.test(b.token||''))return reply({error:'Invalid device token'},400);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  if(!await db('rpc/push_rate_allow','POST',{bucket:'ip:'+await digest(ip)})||!await db('rpc/push_rate_allow','POST',{bucket:'device:'+await digest(b.token)}))return reply({error:'Too many attempts. Try again later.'},429);
  const tokenHash=await digest(b.token),endpoint=String(b.subscription?.endpoint||b.endpoint||'');
  const existing=(await db('push_subscriptions?endpoint=eq.'+encodeURIComponent(endpoint)+'&limit=1'))[0];
  if(existing&&existing.token_hash!==tokenHash)return reply({error:'This device subscription needs to be reset.'},403);
  if(action==='unsubscribe'){if(existing)await db('push_subscriptions?id=eq.'+existing.id,'DELETE');return reply({ok:true});}
  if(action==='test'){
   if(!existing)return reply({error:'Enable notifications first.'},400);
   const c=await configuration();const details=webpush.generateRequestDetails({endpoint:existing.endpoint,keys:{p256dh:existing.p256dh,auth:existing.auth}},JSON.stringify({title:'Shyaka Cup notifications are ready',body:'You will receive the match and news alerts you selected.',tag:'shyaka-test',url:'/?view=notifications'}),{vapidDetails:{subject:origin,publicKey:c.public_key,privateKey:c.private_key},TTL:60});
   const r=await fetch(details.endpoint,{method:'POST',headers:details.headers,body:details.body,redirect:'error',signal:AbortSignal.timeout(7000)});
   if(!r.ok)return reply({error:'The notification could not be delivered. Try disabling and enabling notifications again.'},502);
   return reply({ok:true});
  }
  if(!validSubscription(b.subscription))return reply({error:'Unsupported push subscription.'},400);
  const fields={endpoint,p256dh:b.subscription.keys.p256dh,auth:b.subscription.keys.auth,token_hash:tokenHash,matches:b.matches!==false,news:b.news!==false,updated_at:new Date().toISOString()};
  if(existing)await db('push_subscriptions?id=eq.'+existing.id,'PATCH',fields);
  else await db('push_subscriptions','POST',fields);
  return reply({ok:true});
 }catch{ return reply({error:'Notifications are temporarily unavailable. Please try again.'},503); }
});

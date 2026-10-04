/* Opt-in only. No permission prompt until the user presses Enable. */
(() => {
 const endpoint=window.SHYAKA_SUPABASE_URL+'/functions/v1/tournament-push';
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
 const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
 let alerts=[],busy=false,seen=read('shyaka-alerts-seen',0),subscription=null;
 const supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 const status=$('pushStatus');
 let token=read('shyaka-push-device-token','');
 if(!token){token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');}
 const prefs=read('shyaka-push-preferences',{matches:true,news:true});
 $('pushMatches').checked=prefs.matches;$('pushNews').checked=prefs.news;
 function buttons(){
  $('enablePush').hidden=!!subscription||!supported;$('disablePush').hidden=!subscription;$('testPush').hidden=!subscription;$('savePushPreferences').hidden=!subscription;
 }
 async function api(action,body){
  const r=await fetch(endpoint+'/'+action,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',apikey:window.SHYAKA_SUPABASE_ANON_KEY},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const result=await r.json();if(!r.ok)throw Error(result.error||'Please try again.');return result;
 }
 function unread(){const count=alerts.filter(a=>Date.parse(a.created_at)>seen).length;for(const n of document.querySelectorAll('[data-alert-count]')){n.textContent=count?String(count):'';n.hidden=!count;}}
 function render(){
  const grid=$('notificationList');grid.replaceChildren();
  if(!alerts.length){grid.textContent='No notifications yet.';return;}
  for(const a of alerts){
   const card=document.createElement('button');card.type='button';card.className='notification-item';
   const title=document.createElement('strong');title.textContent=a.title;
   const body=document.createElement('span');body.textContent=a.body;
   const date=document.createElement('small');date.textContent=new Date(a.created_at).toLocaleString('en-GB',{timeZone:'Africa/Nairobi',dateStyle:'medium',timeStyle:'short'})+' • '+(a.kind==='match'?'Match day':'News');
   card.append(title,body,date);card.onclick=()=>openAlert(a.target,a.source_id);grid.append(card);
  }
 }
 async function refresh(){
  if(busy||!publicDb)return;busy=true;
  try{const {data,error}=await boundedQuery(publicDb.from('tournament_alerts').select('id,kind,title,body,target,source_id,created_at').order('created_at',{ascending:false}).limit(50));if(error)throw error;alerts=data||[];render();unread();$('notificationRefreshStatus').textContent='';}
  catch{$('notificationRefreshStatus').textContent='Could not refresh alerts. Check your connection and try again.';}finally{busy=false;}
 }
 async function openAlert(view,item){
  if(!['fixtures','news','notifications'].includes(view))return;
  showView(view);if(view==='notifications'){await refresh();return;}
  if(item){await loadOnline();if(view==='fixtures'){const f=fixtures.find(f=>String(f.id)===String(item));if(f){$('matchCentreSelect').value=String(f.match_no);renderMatchCentre();showView('matchcentre');}}
   else {const card=document.querySelector('[data-news-id="'+String(item).replace(/[^0-9]/g,'')+'"]');card?.scrollIntoView({behavior:'smooth',block:'center'});}}
 }
 const originalShow=showView;showView=function(view){originalShow(view);if(view==='notifications')refresh();};
 $('notificationBell').onclick=()=>showView('notifications');
 $('markAlertsRead').onclick=()=>{seen=Date.now();save('shyaka-alerts-seen',seen);unread();};
 $('refreshAlerts').onclick=refresh;
 async function registration(){return Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Please refresh the app, then try again.')),12000))]);}
 async function storeSubscription(){
  await api('subscribe',{token,subscription:subscription.toJSON(),matches:$('pushMatches').checked,news:$('pushNews').checked});
  save('shyaka-push-preferences',{matches:$('pushMatches').checked,news:$('pushNews').checked});
 }
 $('enablePush').onclick=async()=>{
  try{
   if(!save('shyaka-push-device-token',token))throw Error('Allow this browser to save site data before enabling notifications.');
   $('enablePush').disabled=true;
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error(permission==='denied'?'Notifications are blocked. Allow them in your browser settings to enable phone alerts.':'Notifications were not enabled. You can try again when ready.');
   const reg=await registration(),config=await api('config');
   const raw=atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/'));
   subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});
   await storeSubscription();status.textContent='Phone notifications are on.';
  }catch(e){status.textContent=e.message;if(subscription){try{await subscription.unsubscribe()}catch{}subscription=null;}}
  finally{$('enablePush').disabled=false;buttons();}
 };
 $('savePushPreferences').onclick=async()=>{try{await storeSubscription();status.textContent='Notification preferences saved.';}catch(e){status.textContent=e.message;}};
 $('disablePush').onclick=async()=>{try{await api('unsubscribe',{token,endpoint:subscription.endpoint});await subscription.unsubscribe();subscription=null;status.textContent='Phone notifications disabled. In-app alerts remain available.';}catch(e){status.textContent=e.message;}buttons();};
 $('testPush').onclick=async()=>{try{$('testPush').disabled=true;await api('test',{token,endpoint:subscription.endpoint});status.textContent='Test sent. Check your device notifications.';}catch(e){status.textContent=e.message;}finally{$('testPush').disabled=false;}};
 async function init(){
  buttons();
  if(!supported)status.textContent='Phone notifications are not supported here. On iPhone or iPad, add Shyaka Cup to your Home Screen and open it there. In-app alerts still work.';
  else{try{subscription=await(await registration()).pushManager.getSubscription();buttons();status.textContent=subscription?'Phone notifications are on.':'Enable phone notifications to receive alerts when the app is closed.';}catch(e){status.textContent=e.message;}}
  await refresh();
 }
 navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='SHYAKA_ALERT'){const url=new URL(e.data.url,location.origin);if(url.origin===location.origin)openAlert(url.searchParams.get('view'),url.searchParams.get('item'));}});
 window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(()=>{if(!document.hidden)refresh();},30000);
 const params=new URLSearchParams(location.search);if(['fixtures','news','notifications'].includes(params.get('view')))openAlert(params.get('view'),params.get('item'));
 init();
})();

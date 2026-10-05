/* Anonymous browser counts. Hidden/offline pages never send heartbeats. */
(()=>{
 const labels={home:'Home',teams:'Teams',players:'Players',fixtures:'Fixtures',livescores:'Live scores',matchcentre:'Match centre',results:'Results',standings:'Standings',stats:'Statistics',knockout:'Knockout',sponsor:'Sponsors',notifications:'Notifications',news:'News',gallery:'Gallery',highlights:'Highlights'};
 let device,busy=false,lastSection='',lastSent=0,refreshBusy=false;
 try{device=localStorage.getItem('shyaka-visitor-id');if(!/^[0-9a-f-]{36}$/i.test(device||'')){device=crypto.randomUUID();localStorage.setItem('shyaka-visitor-id',device)}}catch{device=null}
 async function pulse(){
  if(!device||document.hidden||navigator.onLine===false||location.hostname!=='shyakacup.com'||busy)return;
  const section=document.querySelector('.view.active')?.id.replace('view-','');
  if(!labels[section]||(!window.SHYAKA_SUPABASE_ANON_KEY)||section===lastSection&&Date.now()-lastSent<60000)return;
  busy=true;
  try{const r=await fetch(window.SHYAKA_SUPABASE_URL+'/functions/v1/visitor-pulse',{method:'POST',headers:{apikey:window.SHYAKA_SUPABASE_ANON_KEY,Authorization:'Bearer '+window.SHYAKA_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({device,section}),signal:AbortSignal.timeout(10000)});if(r.ok){lastSection=section;lastSent=Date.now()}}catch{}finally{busy=false}
 }
 async function refresh(){
  const box=document.getElementById('visitorSummary');
  if(!box||typeof approvedAdmin==='undefined'||!approvedAdmin||!db){if(box)box.replaceChildren();return}
  if(refreshBusy)return;refreshBusy=true;
  const status=document.getElementById('visitorStatus');status.textContent='Loading visitor counts…';
  try{
   const {data,error}=await db.rpc('visitor_summary');
   if(!approvedAdmin){box.replaceChildren();return}
   if(error||!data)throw Error('unavailable');
   box.replaceChildren();
   const grid=document.createElement('div');grid.className='visitor-counts';
   for(const [key,label] of [['active','Active now'],['today','Today'],['week','This week'],['month','This month']]){const card=document.createElement('div');card.className='team';const count=document.createElement('strong');count.textContent=Number(data[key]||0).toLocaleString();const title=document.createElement('span');title.textContent=label;card.append(count,title);grid.append(card)}
   box.append(grid);
   const heading=document.createElement('h4');heading.textContent='Most-viewed sections this month';box.append(heading);
   for(const item of data.sections||[]){const row=document.createElement('div');row.className='event-item';const title=document.createElement('span');title.textContent=labels[item.section]||item.section;const count=document.createElement('b');count.textContent=Number(item.visitors).toLocaleString()+' visitors';row.append(title,count);box.append(row)}
   status.textContent='Updated '+new Date().toLocaleTimeString()+'. Times use Uganda time.';
  }catch{status.textContent='Unable to load visitor counts. Please try Refresh.'}finally{refreshBusy=false}
 }
 document.getElementById('refreshVisitors')?.addEventListener('click',refresh);
 document.querySelector('[data-admin="visitors"]')?.addEventListener('click',refresh);
 const observer=new MutationObserver(()=>{pulse();if(!approvedAdmin)document.getElementById('visitorSummary')?.replaceChildren()});
 document.querySelectorAll('.view').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
 document.addEventListener('visibilitychange',pulse);window.addEventListener('online',pulse);
 setInterval(()=>{pulse();if(!document.hidden&&document.getElementById('adminModal')?.classList.contains('show')&&document.getElementById('admin-visitors')?.classList.contains('active'))refresh()},60000);
 pulse();
})();

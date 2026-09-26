const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function region(a,b){return html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)))}
function harness(){
 let time=Date.parse('2026-09-21T08:00:00Z');class Clock extends Date{constructor(...a){super(...(a.length?a:[time]))}static now(){return time}}
 const data=new Map(),classes=new Set(),banner={textContent:'',classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}};
 const failures=new Set(),rows={fixtures:[{id:1,status:'live',home_score:1}],match_events:[{id:1,fixture_id:1}],news:[{title:'First',published:true}]};
 const client={from(table){const q={select(){return q},eq(){return q},order(){return q},abortSignal(){return q},then(resolve,reject){return Promise.resolve(failures.has(table)?{error:Error('Unavailable')}:{data:rows[table]||[]}).then(resolve,reject)}};return q}};
 const c={console,Date:Clock,AbortController,setTimeout,clearTimeout,navigator:{onLine:true},document:{getElementById:()=>banner,querySelector:()=>null,body:{classList:{toggle(){}}}},window:{localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}},publicDb:client,approvedAdmin:false,fixtures:[],events:[],newsItems:[],galleryItems:[],matchHighlights:[],teamMeta:[],refereeReports:[]};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../offline-cache.js'),'utf8'),c);vm.runInContext(region('let cachedPublicData=','const $=id=>'),c);
 return {c,failures,rows,banner,classes,advance:ms=>time+=ms,all:()=>c.fetchPublicData(Object.keys(c.window.ShyakaOfflineCache.FIELDS)),snapshot:()=>JSON.parse(vm.runInContext('JSON.stringify(cachedPublicData)',c))};
}
test('partial outage retains true news age; live-only recovery cannot hide it',async()=>{
 const h=harness();await h.all();const first=h.snapshot();h.advance(10000);h.failures.add('news');await h.all();
 assert.equal(h.snapshot().updatedAt.newsItems,first.updatedAt.newsItems);assert.match(h.banner.textContent,/news: saved/);
 await h.c.fetchPublicData(['fixtures','events']);assert.equal(h.classes.has('show'),true);assert.match(h.banner.textContent,/news: saved/);
 h.failures.clear();await h.all();assert.equal(h.classes.has('show'),false);
});
test('partial score/event failure retains the previous coherent pair',async()=>{
 const h=harness();await h.all();h.rows.fixtures=[{id:1,home_score:9}];h.failures.add('match_events');await h.c.fetchPublicData(['fixtures','events']);assert.equal(h.c.fixtures[0].home_score,1);assert.equal(h.c.liveUpdatesAvailable(),false);
});
test('empty fixtures replace old scores and the cache',async()=>{
 const h=harness();await h.all();h.rows.fixtures=[];await h.all();assert.equal(h.c.fixtures.length,0);assert.equal(h.snapshot().fixtures.length,0);
});
test('no-cache outage shows unverified data and frozen scores',async()=>{
 const h=harness();h.c.publicDb=null;await h.all();assert.match(h.banner.textContent,/not verified/);assert.equal(h.c.liveUpdatesAvailable(),false);
});
test('blocked localStorage getter does not break public rendering or refresh',async()=>{
 const h=harness();Object.defineProperty(h.c.window,'localStorage',{get(){throw Error('SecurityError')}});assert.equal(h.c.restorePublicCache(),false);await h.all();assert.equal(h.c.fixtures.length,1);assert.match(h.banner.textContent,/cannot save an offline copy/);
});
test('expiry removes cached reports from an already open page',async()=>{
 const h=harness();h.rows.referee_reports=[{id:1,is_public:true}];await h.all();h.advance(3600000);h.c.expirePublicCache();assert.equal(h.c.refereeReports.length,0);
});
test('live indicator freezes without fresh confirmation, including after sleeping',async()=>{
 const h=harness();await h.all();assert.equal(h.c.liveUpdatesAvailable(),true);h.advance(46000);assert.equal(h.c.liveUpdatesAvailable(),false);await h.all();h.c.navigator.onLine=false;assert.equal(h.c.liveUpdatesAvailable(),false);
});
test('hanging queries time out and abort',async()=>{
 const h=harness();let signal;const q={abortSignal(s){signal=s;return new Promise(()=>{})}};const r=await h.c.boundedQuery(q,5);assert.ok(r.error);assert.equal(signal.aborted,true);
});
test('refreshing scores cannot leave expired reports in memory',async()=>{
 const h=harness();h.rows.referee_reports=[{id:1,is_public:true}];await h.all();h.advance(3600000);await h.c.fetchPublicData(['fixtures','events']);assert.equal(h.c.refereeReports.length,0);
});
test('initial online connection check runs without a banner',()=>{
 const h=harness();h.c.showConnectionState();assert.equal(h.banner.textContent,'');assert.equal(h.classes.has('show'),false);
});
test('news outage does not claim healthy scores are stale',async()=>{
 const h=harness();await h.all();h.failures.add('news');await h.all();assert.match(h.banner.textContent,/news: saved/);assert.doesNotMatch(h.banner.textContent,/Scores may be out of date/);
});
function refreshHarness(h){
 let admin=false;const rendered=[],handlers={};
 for(const n of ['renderFixtures','renderLiveScores','renderMatchCentre','renderHome','renderResults','renderStandings','renderStats','renderNews','renderGallery','renderHighlights','renderTeams','renderRefereeReports'])h.c[n]=()=>rendered.push(n);
 h.c.document.getElementById=id=>id==='adminModal'?({classList:{contains:()=>admin}}):h.banner;
 h.c.document.addEventListener=(name,fn)=>handlers[name]=fn;h.c.setInterval=()=>0;
 vm.runInContext(region('// Refresh public data without','</script><script id="public-design-inline-script">'),h.c);
 return {rendered,handlers,admin:v=>admin=v};
}
test('periodic refresh renews secondary data before its freshness deadline',async()=>{
 const h=harness();await h.all();const r=refreshHarness(h);h.advance(60000);h.rows.news=[{title:'Updated',published:true}];await h.c.refreshLiveOnly();assert.equal(h.c.newsItems[0].title,'Updated');assert.equal(h.c.publicSectionFresh('newsItems'),true);assert.ok(r.rendered.includes('renderNews'));
});
test('returning to the tab refreshes all sections immediately',async()=>{
 const h=harness();await h.all();const r=refreshHarness(h);h.advance(180000);h.rows.news=[{title:'Resumed',published:true}];await r.handlers.visibilitychange();assert.equal(h.c.newsItems[0].title,'Resumed');assert.equal(h.c.publicSectionFresh('newsItems'),true);
});
test('public updates continue during admin editing without rendering over forms',async()=>{
 const h=harness();await h.all();const r=refreshHarness(h);r.admin(true);h.advance(60000);h.rows.news=[{title:'Admin open',published:true}];await h.c.refreshLiveOnly();assert.equal(h.c.newsItems[0].title,'Admin open');assert.equal(r.rendered.length,0);
});

test('initial offline visit still warns about unverified scores',()=>{
 const h=harness();h.c.navigator.onLine=false;h.c.showConnectionState();assert.equal(h.classes.has('show'),true);assert.match(h.banner.textContent,/Scores may be out of date/);
});
test('failed initial request shows a warning after quiet startup',async()=>{
 const h=harness();h.c.showConnectionState();assert.equal(h.classes.has('show'),false);h.failures.add('fixtures');await h.all();assert.equal(h.classes.has('show'),true);assert.match(h.banner.textContent,/Updates interrupted/);
});
test('a transient score read retries without displaying an interruption',async()=>{const h=harness();await h.all();const read=h.c.boundedQuery;let calls=0;h.c.boundedQuery=(q,t)=>++calls===1?Promise.resolve({error:Error('network')}):read(q,t);await h.c.fetchPublicData(['fixtures','events']);assert.equal(calls,3);assert.equal(h.classes.has('show'),false);assert.equal(h.c.liveUpdatesAvailable(),true);});
test('authorization failures are not retried or hidden',async()=>{const h=harness();let calls=0;h.c.boundedQuery=async()=>{calls++;return {status:403,error:Error('Forbidden')}};await h.c.fetchPublicData(['fixtures','events']);assert.equal(calls,2);assert.match(h.banner.textContent,/Updates interrupted/);assert.equal(h.c.liveUpdatesAvailable(),false);});

test('age alone shows reconnecting while keeping scores marked stale',async()=>{
 const h=harness();await h.all();h.advance(91000);h.c.showConnectionState();
 assert.match(h.banner.textContent,/Reconnecting/);
 assert.doesNotMatch(h.banner.textContent,/Updates interrupted/);
 assert.match(h.banner.textContent,/Scores may be out of date/);
 assert.equal(h.c.liveUpdatesAvailable(),false);
 await h.all();assert.equal(h.classes.has('show'),false);
});
test('resume shows reconnecting before the pending read finishes',async()=>{
 const h=harness();await h.all();const r=refreshHarness(h);h.advance(180000);
 const read=h.c.boundedQuery;let release;const gate=new Promise(resolve=>release=resolve);
 h.c.boundedQuery=async(q,t)=>{await gate;return read(q,t)};
 const pending=r.handlers.visibilitychange();
 assert.match(h.banner.textContent,/Reconnecting/);
 assert.equal(h.c.liveUpdatesAvailable(),false);
 release();await pending;assert.equal(h.classes.has('show'),false);
});
test('failed resume replaces reconnecting with interrupted and later recovers',async()=>{
 const h=harness();await h.all();const r=refreshHarness(h);h.advance(180000);
 h.failures.add('fixtures');await r.handlers.visibilitychange();
 assert.match(h.banner.textContent,/Updates interrupted/);
 assert.equal(h.c.liveUpdatesAvailable(),false);
 h.failures.clear();await r.handlers.visibilitychange();
 assert.equal(h.classes.has('show'),false);assert.equal(h.c.liveUpdatesAvailable(),true);
});
test('offline state and known failures are never softened to reconnecting',async()=>{
 const h=harness();await h.all();h.c.navigator.onLine=false;h.c.showConnectionState();
 assert.match(h.banner.textContent,/Updates interrupted/);
 h.c.navigator.onLine=true;h.failures.add('news');await h.all();h.advance(91000);h.c.showConnectionState();
 assert.match(h.banner.textContent,/Updates interrupted/);
 assert.match(h.banner.textContent,/news: saved/);
});

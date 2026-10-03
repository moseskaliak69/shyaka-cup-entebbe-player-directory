const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=html.slice(html.indexOf('function standingFixtures('),html.indexOf('function renderStandings()'));
function setup(matches){const c={fixtures:matches,liveUpdatesAvailable:()=>true,ShyakaTeams:{label:x=>x}};vm.createContext(c);vm.runInContext(source,c);return c;}
function match(overrides={}){return {match_no:1,division:'Ward',home_team:'A',away_team:'B',status:'live',home_score:0,away_score:0,...overrides};}
test('kickoff draw, goal and equalizer change provisional points and ranking',()=>{
 const f=match(),c=setup([f]);let rows=c.calcStandings('Ward');assert.equal(rows[0].pts,1);assert.equal(rows[1].pts,1);assert.equal(rows[0].p,1);
 f.away_score=1;rows=c.calcStandings('Ward');assert.equal(rows[0].team,'B');assert.equal(rows[0].pts,3);assert.equal(rows[0].gf,1);assert.equal(rows[1].ga,1);
 f.home_score=1;rows=c.calcStandings('Ward');assert.equal(rows[0].pts,1);assert.equal(rows[1].pts,1);
});
test('full time counts the match once and removes provisional status',()=>{
 const f=match({home_score:2}),c=setup([f]);assert.equal(c.calcStandings('Ward')[0].live,true);
 f.status='completed';const row=c.calcStandings('Ward')[0];assert.equal(row.pts,3);assert.equal(row.p,1);assert.equal(row.live,false);
 assert.match(c.standingStatusText('Ward'),/completed group/);
});
test('combines completed and simultaneous live matches without including knockout or cancelled games',()=>{
 const c=setup([match({status:'completed',home_score:2}),match({match_no:2,home_team:'A',away_team:'C',away_score:1}),match({match_no:3,home_team:'B',away_team:'D',home_score:1}),match({match_no:47,home_score:9}),match({match_no:4,status:'cancelled',home_score:9}),match({match_no:5,division:'Other',home_score:9})]);
 const rows=c.calcStandings('Ward');assert.equal(rows.reduce((n,r)=>n+r.p,0),6);assert.equal(rows.find(r=>r.team==='A').pts,3);assert.equal(rows.find(r=>r.team==='B').pts,3);
});
test('postponed match stops contributing and malformed scores are excluded',()=>{
 const f=match({home_score:2}),c=setup([f]);f.status='postponed';assert.equal(c.calcStandings('Ward')[0].p,0);
 f.status='live';f.home_score=-1;assert.equal(c.calcStandings('Ward')[0].p,0);
});
test('stale standings explain paused updates and do not label teams LIVE',()=>{
 const c=setup([match()]);assert.match(c.standingStatusText('Ward'),/provisional/);c.liveUpdatesAvailable=()=>false;
 assert.match(c.standingStatusText('Ward'),/Updates paused/);assert.doesNotMatch(c.standingTeamLabel(c.calcStandings('Ward')[0]),/>LIVE</);
});

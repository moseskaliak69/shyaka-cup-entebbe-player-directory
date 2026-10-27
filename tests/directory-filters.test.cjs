const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function harness(){
 const nodes={playerParish:{value:'KATABI'},playerTeam:{value:'KIWAFU EAST'},playerSearch:{value:''},playerGrid:{},playerCountHome:{}};
 const c={players:[{name:'A',number:' A01 ',village:'BUSAMBAGA',parish:'Katabi'},{name:'B',number:'a01',village:'KITUBULU',parish:' KATABI '},{name:'C',number:'C01',village:'KIWAFU EAST',parish:'Kiwafu'}],$:id=>nodes[id],currentTeams:()=>['BUSAMBAGA','KITUBULU','KIWAFU EAST'],esc:s=>String(s||''),approvedAdmin:false,document:{querySelectorAll:()=>[]},observePlayerPhotos:()=>{}};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function directoryKey('),html.indexOf('async function openLicenceViewer(')),c);
 return {c,nodes};
}
test('parish selection normalizes case and spaces and removes unrelated villages',()=>{
 const {c,nodes}=harness();c.updatePlayerTeamOptions();
 assert.match(nodes.playerTeam.innerHTML,/BUSAMBAGA/);assert.match(nodes.playerTeam.innerHTML,/KITUBULU/);assert.doesNotMatch(nodes.playerTeam.innerHTML,/KIWAFU EAST/);assert.equal(nodes.playerTeam.value,'');
 c.renderPlayers();assert.match(nodes.playerGrid.innerHTML,/>A<\/h4>/);assert.match(nodes.playerGrid.innerHTML,/>B<\/h4>/);assert.doesNotMatch(nodes.playerGrid.innerHTML,/>C<\/h4>/);
});
test('compatible village selection survives refresh and all parishes restores villages',()=>{
 const {c,nodes}=harness();nodes.playerTeam.value='KITUBULU';c.updatePlayerTeamOptions();assert.equal(nodes.playerTeam.value,'KITUBULU');nodes.playerParish.value='';c.updatePlayerTeamOptions();assert.match(nodes.playerTeam.innerHTML,/KIWAFU EAST/);
});
test('duplicate registration checks normalize numbers without changing existing identities',()=>{
 const {c}=harness();assert.equal(c.playerNumberConflict('a01'),true);assert.equal(c.playerNumberConflict('D01'),false);assert.equal(c.parishLabel(' KATABI '),'Katabi');assert.equal(c.players[0].number,' A01 ');
});
test('overdue scheduled matches get an unresolved label without changing their status',()=>{
 const c={Intl,Date,fixtureEffectiveStatus:f=>f.status,liveUpdatesAvailable:()=>true};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function fixtureOverdue('),html.indexOf('function fixtureCardHtml(')),c);
 const f={status:'scheduled',match_date:'2020-01-01'};assert.equal(c.fixtureStatusLabel(f),'Awaiting match update');assert.equal(f.status,'scheduled');assert.equal(c.fixtureStatusLabel({...f,status:'cancelled'}),'Cancelled');assert.equal(c.fixtureStatusLabel({...f,status:'completed'}),'Full Time');
});

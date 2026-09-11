const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {identity,badge,label}=require('../public-teams.js');
const names=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/const TEAM_NAMES=(\[[^;]+\]);/)[1]);
test('all 24 villages have distinct initials',()=>{assert.equal(names.length,24);assert.equal(new Set(names.map(name=>identity(name).initials)).size,24);});
test('the six agreed team initials are stable',()=>{for(const [name,initials] of Object.entries({'Kitooro':'KI','Kiwafu East':'KE','Kiwafu Central':'KC','Lugonjo':'LU','Misoli':'MI','Old Entebbe':'OE'}))assert.equal(identity(name).initials,initials);});
test('import spelling and whitespace preserve identity',()=>{assert.equal(identity(' KITORO ').initials,'KI');assert.equal(identity(' Kiwafu   East ').initials,'KE');});
test('unconfirmed opponents are not assigned an invented village',()=>{assert.equal(identity('TBD').initials,'?');assert.equal(identity('').initials,'?');});
test('new teams have a useful two-character fallback',()=>{assert.equal(identity('Example').initials,'EX');assert.equal(identity('New Village').initials,'NV');});
test('team names and badge size cannot inject markup',()=>{assert.ok(!label('<img src=x onerror=alert(1)>').includes('<img src=x'));assert.ok(!badge('Misoli','" onclick="x').includes('onclick'));});

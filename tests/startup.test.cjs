const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('first HTML paint contains the current shell and keeps the legacy home hidden',()=>{
 const initial=html.slice(0,html.indexOf('<script src="vendor/'));
 assert.match(initial,/<div class="public-premium-home" hidden aria-hidden="true">/);
 assert.match(initial,/<div id="publicHome">[\s\S]*Loading tournament/);
 assert.match(initial,/<h1>SHYAKA CUP<\/h1><small>ENTEBBE 2026<\/small>/);
 const nav=initial.match(/<nav[^>]*id="mobileBottomNav"[^>]*>([\s\S]*?)<\/nav>/)[1];
 assert.equal((nav.match(/<button /g)||[]).length,4);
 assert.doesNotMatch(nav,/>Table<|>More</);
 const presentation=fs.readFileSync(path.join(root,'public-design.js'),'utf8');
 assert.match(presentation,/const root = document.getElementById\('publicHome'\)/);
});
test('startup scripts are local, preloaded and available for offline caching',()=>{
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const match of html.matchAll(/<script src="([^"]+)"/g)){
  const file=match[1];assert.ok(!file.startsWith('http'),'No third-party startup script: '+file);
  assert.ok(fs.existsSync(path.join(root,file)),file+' exists');
  assert.ok(html.includes('rel="preload" href="'+file+'" as="script"'),file+' preloads');
  assert.ok(sw.includes("'/"+file+"'"),file+' is cached');
 }
});
test('pinned SDK bundle exposes the existing Supabase browser client',()=>{
 const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'vendor/supabase-2.116.0.min.js'),'utf8'),c);
 assert.equal(typeof c.supabase.createClient,'function');
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const cache=require('../offline-cache.js');

function storage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}

test('public emergency cache excludes player and private referee data',()=>{
  const store=storage();
  cache.save(store,{
    fixtures:[{id:1,status:'live'}],
    players:[{name:'Must remain private',license:'licenses/1.pdf'}],
    refereeReports:[{id:1,is_public:false,remarks:'Private'},{id:2,is_public:true,remarks:'Published'}]
  });
  const saved=JSON.parse(store.getItem(cache.KEY));
  assert.equal(Object.hasOwn(saved,'players'),false);
  assert.deepEqual(saved.refereeReports,[{id:2,is_public:true,remarks:'Published'}]);
});

test('last successful public snapshot can be restored',()=>{
  const store=storage();
  assert.equal(cache.save(store,{fixtures:[{match_no:6}],newsItems:[{title:'Kick off'}]}),true);
  const restored=cache.load(store);
  assert.deepEqual(restored.fixtures,[{match_no:6}]);
  assert.deepEqual(restored.newsItems,[{title:'Kick off'}]);
  assert.ok(restored.savedAt);
});

test('broken cached JSON is ignored safely',()=>{
  const store=storage();
  store.setItem(cache.KEY,'{broken');
  assert.equal(cache.load(store),null);
});

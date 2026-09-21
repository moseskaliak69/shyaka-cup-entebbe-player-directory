const {test}=require('node:test');
const assert=require('node:assert/strict');
const cache=require('../offline-cache.js');
const now=Date.parse('2026-09-21T08:00:00Z');
function storage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}}
test('cache excludes players, private reports, unpublished content and non-public fields',()=>{
 const store=storage();const snapshot=cache.update(null,{fixtures:[{id:1,status:'live',licence_url:'SECRET'}],players:[{name:'SECRET'}],newsItems:[{title:'Draft',published:false}],matchHighlights:[{published:false}],refereeReports:[{id:1,is_public:false,remarks:'Private'},{id:2,is_public:true,remarks:'Published',created_by:'SECRET'}]},now);
 assert.equal(cache.save(store,snapshot,now),true);const saved=JSON.parse(store.getItem(cache.KEY));
 assert.equal(JSON.stringify(saved).includes('SECRET'),false);assert.equal(Object.hasOwn(saved,'players'),false);
 assert.deepEqual(saved.refereeReports,[{id:2,is_public:true,remarks:'Published'}]);assert.deepEqual(saved.newsItems,[]);assert.deepEqual(saved.matchHighlights,[]);
});
test('successful snapshots restore with original section timestamps',()=>{
 const store=storage(),snapshot=cache.update(null,{fixtures:[{match_no:6}],newsItems:[{title:'Kick off',published:true}]},now);
 cache.save(store,snapshot,now);assert.deepEqual(cache.load(store,now),snapshot);
});
test('partial updates preserve the age of sections that did not refresh',()=>{
 const first=cache.update(null,{fixtures:[{id:1}],newsItems:[{title:'Old',published:true}]},now);
 const next=cache.update(first,{fixtures:[{id:2}]},now+60000);
 assert.equal(next.updatedAt.newsItems,first.updatedAt.newsItems);assert.notEqual(next.updatedAt.fixtures,first.updatedAt.fixtures);
});
test('successful empty responses remove old records',()=>{
 const first=cache.update(null,{fixtures:[{id:1}],refereeReports:[{id:1,is_public:true}]},now);
 const next=cache.update(first,{fixtures:[],refereeReports:[]},now+1000);
 assert.deepEqual(next.fixtures,[]);assert.deepEqual(next.refereeReports,[]);
});
test('reports expire after one hour; tournament snapshots after 24 hours',()=>{
 const store=storage(),first=cache.update(null,{fixtures:[{id:1}],refereeReports:[{id:1,is_public:true}]},now);
 cache.save(store,first,now);const next=cache.load(store,now+cache.REPORT_MAX_AGE);
 assert.deepEqual(next.refereeReports,[]);assert.equal(next.fixtures.length,1);
 assert.equal(JSON.parse(store.getItem(cache.KEY)).refereeReports.length,0);
 assert.equal(cache.load(store,now+cache.MAX_AGE),null);
});
test('corrupt, invalid-date, future and legacy caches are discarded',()=>{
 const store=storage();store.setItem(cache.KEY,'{broken');assert.equal(cache.load(store,now),null);
 for(const stamp of ['invalid',new Date(now+1000).toISOString()]){store.setItem(cache.KEY,JSON.stringify({version:2,fixtures:[{id:1}],updatedAt:{fixtures:stamp}}));assert.equal(cache.load(store,now),null)}
 store.setItem(cache.LEGACY_KEY,'private legacy data');cache.load(store,now);assert.equal(store.getItem(cache.LEGACY_KEY),null);
});
test('storage quota and blocked storage fail safely',()=>{
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('quota')},removeItem(){throw Error('blocked')}};
 assert.equal(cache.save(blocked,{},now),false);assert.equal(cache.load(blocked,now),null);assert.equal(cache.load(null,now),null);
});
test('media references cannot smuggle private or signed player URLs into cache',()=>{
 for(const url of ['https://tjabrrvfxlyqkhzhtnyb.supabase.co/storage/v1/object/sign/player-files/licenses/a.jpg','https://tjabrrvfxlyqkhzhtnyb.supabase.co/storage/v1/object/public/gallery/a.jpg?token=secret','https://other.test/photo.jpg']){
  const c=cache.update(null,{galleryItems:[{id:1,image_url:url}]},now);assert.equal(c.galleryItems[0].image_url,undefined);
 }
 const url='https://tjabrrvfxlyqkhzhtnyb.supabase.co/storage/v1/object/public/gallery/a.jpg';assert.equal(cache.update(null,{galleryItems:[{image_url:url}]},now).galleryItems[0].image_url,url);
});

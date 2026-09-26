const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../gallery-images.js');
const cache=require('../offline-cache.js');
const base='https://tjabrrvfxlyqkhzhtnyb.supabase.co/storage/v1/object/public/gallery/';
const file=new Blob(['original'],{type:'image/jpeg'});
const prepared={preview:new Blob(['preview'],{type:'image/jpeg'}),thumbnail:new Blob(['thumb'],{type:'image/jpeg'})};
function dbMock({failUpload=0,conflict=false,onUpload=()=>{}}={}){
 const uploaded=[],updates=[],downloads=[];
 const bucket={upload:async(path,blob)=>{uploaded.push({path,blob});onUpload(uploaded.length);return uploaded.length===failUpload?{error:Error('Upload failed')}:{}} ,getPublicUrl:path=>({data:{publicUrl:base+path}}),download:async path=>{downloads.push(path);return {data:file}}};
 const db={storage:{from:name=>{assert.equal(name,'gallery');return bucket}},from:name=>{assert.equal(name,'gallery');const q={update:patch=>{updates.push({patch,filters:[]});return q},eq:(key,value)=>{updates.at(-1).filters.push([key,value]);return q},select:async()=>({data:conflict?[]:[{id:1}]})};return q}};
 return {db,uploaded,updates,downloads};
}
test('gallery variants preserve the original and survive the offline cache',()=>{
 const url=base+'gallery/a%20photo.jpg.shyaka-v1/unique/preview.jpg';
 const media=api.variants(url);
 assert.equal(media.original,base+'gallery/a%20photo.jpg');assert.equal(media.thumbnail,url.replace('preview','thumb'));
 const saved=cache.update(null,{galleryItems:[{id:1,image_url:url}]});
 assert.equal(saved.galleryItems[0].image_url,url);
 assert.equal(api.variants(saved.galleryItems[0].image_url).original,media.original);
 for(const untrusted of ['https://other.test/gallery/a.jpg',base+'a.jpg?token=private',base+'%2E%2E/private.jpg'])assert.equal(api.sourcePath(untrusted),null);
});
test('image bounds preserve portrait/landscape aspect ratios and do not enlarge photos',()=>{
 assert.deepEqual(api.dimensions(6000,4000,1600),{width:1600,height:1067});
 assert.deepEqual(api.dimensions(4000,6000,400),{width:267,height:400});
 assert.deepEqual(api.dimensions(120,80,400),{width:120,height:80});
 assert.throws(()=>api.dimensions(0,5,400));
 assert.throws(()=>api.validate({type:'image/jpeg',size:api.MAX_SOURCE_BYTES+1}),/8 MB/);
 assert.throws(()=>api.validate({type:'image/svg+xml',size:100}),/JPG/);
});
test('new uploads preserve the original and publish only after both resized files succeed',async()=>{
 const h=dbMock();const url=await api.uploadNew(h.db,file,()=>true,async()=>prepared);
 assert.equal(h.uploaded.length,3);assert.equal(h.uploaded[0].blob,file);
 assert.equal(h.uploaded[1].blob,prepared.thumbnail);assert.equal(h.uploaded[2].blob,prepared.preview);
 assert.equal(api.variants(url).original,base+h.uploaded[0].path);
 const failed=dbMock({failUpload:2});await assert.rejects(api.uploadNew(failed.db,file,()=>true,async()=>prepared));assert.equal(failed.updates.length,0);
});
test('existing photos keep originals, change rows conditionally and skip already optimized rows',async()=>{
 const h=dbMock(),rows=[{id:1,image_url:base+'gallery/old.jpg'},{id:2,image_url:base+'gallery/already.jpg.shyaka-v1/abc/preview.jpg'}];
 const result=await api.optimizeExisting(h.db,rows,{allowed:()=>true,preparePhoto:async()=>prepared});
 assert.deepEqual(result,{done:1,failed:0,total:1});assert.equal(h.uploaded.length,2);
 assert.deepEqual(h.updates[0].filters,[['id',1],['image_url',base+'gallery/old.jpg']]);
 assert.equal(api.variants(rows[0].image_url).original,base+'gallery/old.jpg');
 assert.equal((await api.optimizeExisting(h.db,rows,{allowed:()=>true})).total,0);
});
test('failed and concurrently changed photos retain their original URL and remain retryable',async()=>{
 for(const options of [{failUpload:2},{conflict:true}]){
  const h=dbMock(options),rows=[{id:1,image_url:base+'old.jpg'}];
  const result=await api.optimizeExisting(h.db,rows,{allowed:()=>true,preparePhoto:async()=>prepared});
  assert.equal(result.failed,1);assert.equal(rows[0].image_url,base+'old.jpg');
 }
});
test('signed-out visitors cannot upload or continue an in-flight optimization',async()=>{
 const h=dbMock();await assert.rejects(api.uploadNew(h.db,file,()=>false),/sign in/);assert.equal(h.uploaded.length,0);
 let allowed=true;const interrupted=dbMock({onUpload:()=>{allowed=false}}),rows=[{id:1,image_url:base+'old.jpg'}];
 const result=await api.optimizeExisting(interrupted.db,rows,{allowed:()=>allowed,preparePhoto:async()=>prepared});
 assert.equal(result.failed,1);assert.equal(interrupted.uploaded.length,1);assert.equal(interrupted.updates.length,0);
});

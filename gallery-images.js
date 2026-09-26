(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.ShyakaGalleryImages=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ORIGIN='https://tjabrrvfxlyqkhzhtnyb.supabase.co';
 const PREFIX='/storage/v1/object/public/gallery/';
 const MAX_SOURCE_BYTES=8*1024*1024;
 const PREVIEW_BYTES=500*1024,THUMB_BYTES=80*1024;
 function sourcePath(value){
  try{
   const url=new URL(value);
   if(url.origin!==ORIGIN||url.search||url.hash||!url.pathname.startsWith(PREFIX))return null;
   const path=decodeURIComponent(url.pathname.slice(PREFIX.length));
   if(!path||path.split('/').some(p=>!p||p==='.'||p==='..'))return null;
   return path;
  }catch(error){return null}
 }
 function variants(value){
  const path=sourcePath(value);
  const marker=path?.match(/^(.*)\.shyaka-v1\/([a-zA-Z0-9-]+)\/preview\.jpg$/);
  if(!marker)return {preview:value,thumbnail:value,original:value,optimized:false};
  const base=ORIGIN+PREFIX;
  const encode=path=>path.split('/').map(encodeURIComponent).join('/');
  return {preview:value,thumbnail:base+encode(path.replace(/preview\.jpg$/,'thumb.jpg')),original:base+encode(marker[1]),optimized:true};
 }
 function dimensions(width,height,limit){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Could not read this photo.');
  const scale=Math.min(1,limit/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
 }
 function validate(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP photo.');
  if(!file.size||file.size>MAX_SOURCE_BYTES)throw Error('Choose a photo smaller than 8 MB so its original can be preserved.');
 }
 async function decode(file){
  if(typeof createImageBitmap==='function')return createImageBitmap(file,{imageOrientation:'from-image'});
  const url=URL.createObjectURL(file),img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not read this photo. Try saving it as JPG.'));img.src=url});return img}
  finally{URL.revokeObjectURL(url)}
 }
 async function encode(image,limit,maxBytes){
  const canvas=document.createElement('canvas');
  let size=dimensions(image.width,image.height,limit);
  try{
   for(let attempt=0;attempt<5;attempt++){
    canvas.width=size.width;canvas.height=size.height;
    const context=canvas.getContext('2d');if(!context)throw Error('Photo resizing is unavailable in this browser.');
    context.fillStyle='#fff';context.fillRect(0,0,size.width,size.height);context.drawImage(image,0,0,size.width,size.height);
    for(const quality of [.86,.76,.66,.56]){
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
     if(!blob)throw Error('Could not prepare this photo.');
     if(blob.size<=maxBytes)return blob;
    }
    size=dimensions(size.width,size.height,Math.floor(Math.max(size.width,size.height)*.8));
   }
   throw Error('This photo could not be reduced enough. Please choose another photo.');
  }finally{canvas.width=canvas.height=1}
 }
 async function prepare(file){
  validate(file);const image=await decode(file);
  try{
   if(image.width*image.height>40000000)throw Error('Choose a photo under 40 megapixels.');
   const preview=await encode(image,1600,PREVIEW_BYTES);
   const thumbnail=await encode(image,400,THUMB_BYTES);
   return {preview,thumbnail};
  }finally{image.close?.()}
 }
 function requireAdmin(allowed){if(!allowed())throw Error('Please sign in as an administrator to continue.')}
 async function storageRequest(work){
  let timer;
  try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Photo transfer timed out. Please retry.')),60000)})])}
  finally{clearTimeout(timer)}
 }
 async function uploadCopies(db,originalPath,prepared,allowed){
  const base=originalPath+'.shyaka-v1/'+crypto.randomUUID(),bucket=db.storage.from('gallery');
  // Use new immutable URLs; publish the row only after both copies succeed.
  for(const [name,blob] of [['thumb',prepared.thumbnail],['preview',prepared.preview]]){
   requireAdmin(allowed);
   const result=await storageRequest(bucket.upload(base+'/'+name+'.jpg',blob,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false}));
   if(result.error)throw result.error;
  }
  requireAdmin(allowed);
  return bucket.getPublicUrl(base+'/preview.jpg').data.publicUrl;
 }
 async function uploadNew(db,file,allowed,preparePhoto=prepare){
  requireAdmin(allowed);validate(file);const prepared=await preparePhoto(file);
  requireAdmin(allowed);
  const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
  const originalPath='gallery/'+crypto.randomUUID()+'/original.'+extension;
  const result=await storageRequest(db.storage.from('gallery').upload(originalPath,file,{contentType:file.type,upsert:false}));
  if(result.error)throw result.error;
  return uploadCopies(db,originalPath,prepared,allowed);
 }
 async function optimizeExisting(db,items,{allowed,progress=()=>{},preparePhoto=prepare}){
  requireAdmin(allowed);
  const candidates=items.filter(g=>!variants(g.image_url).optimized);
  let done=0,failed=0;
  for(let i=0;i<candidates.length;i++){
   requireAdmin(allowed);progress({done,failed,current:i+1,total:candidates.length});
   const g=candidates[i],original=g.image_url,path=sourcePath(original);
   try{
    if(!path)throw Error('Unsupported gallery source');
    const source=await storageRequest(db.storage.from('gallery').download(path));if(source.error)throw source.error;
    requireAdmin(allowed);const prepared=await preparePhoto(source.data);
    const url=await uploadCopies(db,path,prepared,allowed);
    requireAdmin(allowed);
    const changed=await db.from('gallery').update({image_url:url}).eq('id',g.id).eq('image_url',original).select('id');
    if(changed.error)throw changed.error;
    if(!changed.data?.length)throw Error('Photo changed while preparing it');
    g.image_url=url;done++;
   }catch(error){failed++}
  }
  progress({done,failed,current:candidates.length,total:candidates.length});
  return {done,failed,total:candidates.length};
 }
 return {MAX_SOURCE_BYTES,PREVIEW_BYTES,THUMB_BYTES,sourcePath,variants,dimensions,validate,prepare,uploadNew,optimizeExisting};
});

(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShyakaOfflineCache=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const KEY='shyaka-cup-public-cache-v1';
  const LISTS=['fixtures','events','newsItems','galleryItems','matchHighlights','teamMeta'];

  function clean(snapshot){
    const safe={savedAt:snapshot?.savedAt||new Date().toISOString()};
    for(const key of LISTS)safe[key]=Array.isArray(snapshot?.[key])?snapshot[key]:[];
    safe.refereeReports=Array.isArray(snapshot?.refereeReports)
      ?snapshot.refereeReports.filter(report=>report&&report.is_public===true)
      :[];
    return safe;
  }

  function save(storage,snapshot){
    if(!storage)return false;
    try{storage.setItem(KEY,JSON.stringify(clean(snapshot)));return true}catch(error){return false}
  }

  function load(storage){
    if(!storage)return null;
    try{
      const cached=JSON.parse(storage.getItem(KEY)||'null');
      if(!cached||!cached.savedAt||!Array.isArray(cached.fixtures))return null;
      return clean(cached);
    }catch(error){return null}
  }

  return {KEY,clean,save,load};
});

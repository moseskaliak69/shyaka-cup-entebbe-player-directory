(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShyakaOfflineCache=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const KEY='shyaka-cup-public-cache-v2';
  const LEGACY_KEY='shyaka-cup-public-cache-v1';
  const MAX_AGE=24*60*60*1000;
  const REPORT_MAX_AGE=60*60*1000;
  // Persist only fields used in public views, never entire database rows.
  const FIELDS={
    fixtures:'id match_no match_date division home_team away_team venue match_time stage status home_score away_score updated_at',
    events:'id fixture_id event_type player_name team_name minute notes created_at',
    newsItems:'id title body category published published_at',
    galleryItems:'id caption image_url created_at',
    matchHighlights:'id fixture_id title video_url duration_seconds published created_at',
    teamMeta:'id team_name division coach captain',
    refereeReports:'id fixture_id referee_name assistant_referee_1 assistant_referee_2 fourth_official kickoff_time final_score yellow_cards red_cards pitch_condition team_conduct incidents remarks is_public updated_at'
  };
  const LISTS=Object.keys(FIELDS);
  function publicMediaURL(value,bucket){
    try{const url=new URL(value);return url.origin==='https://tjabrrvfxlyqkhzhtnyb.supabase.co'&&!url.search&&url.pathname.startsWith('/storage/v1/object/public/'+bucket+'/')}catch(error){return false}
  }
  function rows(key,list){
    return (Array.isArray(list)?list:[]).filter(row=>row&&typeof row==='object'&&!Array.isArray(row))
      .filter(row=>key==='refereeReports'?row.is_public===true:(key==='newsItems'||key==='matchHighlights')?row.published===true:true)
      .map(row=>Object.fromEntries(FIELDS[key].split(' ').filter(field=>Object.hasOwn(row,field)&&
        (row[field]===null||['string','number','boolean'].includes(typeof row[field]))&&
        (!['image_url','video_url'].includes(field)||publicMediaURL(row[field],field==='image_url'?'gallery':'match-highlights'))).map(field=>[field,row[field]])));
  }
  function clean(snapshot,now=Date.now()){
    const safe={version:2,updatedAt:{}};
    for(const key of LISTS){
      const stamp=snapshot?.updatedAt?.[key],time=Date.parse(stamp);
      const age=now-time,limit=key==='refereeReports'?REPORT_MAX_AGE:MAX_AGE;
      safe[key]=[];
      if(Number.isFinite(time)&&age>=0&&age<limit&&Array.isArray(snapshot?.[key])){
        safe[key]=rows(key,snapshot[key]);safe.updatedAt[key]=new Date(time).toISOString();
      }
    }
    return safe;
  }
  function update(previous,patch,now=Date.now()){
    const next=clean(previous,now);
    for(const key of LISTS)if(Array.isArray(patch?.[key])){
      next[key]=rows(key,patch[key]);next.updatedAt[key]=new Date(now).toISOString();
    }
    return next;
  }
  function save(storage,snapshot,now=Date.now()){
    try{if(!storage)return false;storage.removeItem(LEGACY_KEY);storage.setItem(KEY,JSON.stringify(clean(snapshot,now)));return true}catch(error){return false}
  }
  function load(storage,now=Date.now()){
    try{
      if(!storage)return null;storage.removeItem(LEGACY_KEY);
      const cached=JSON.parse(storage.getItem(KEY)||'null');
      if(cached?.version!==2)return null;
      const safe=clean(cached,now);
      // Remove expired rows from persistent storage as well as from the display.
      storage.setItem(KEY,JSON.stringify(safe));
      return Object.keys(safe.updatedAt).length?safe:null;
    }catch(error){return null}
  }
  return {KEY,LEGACY_KEY,LISTS,FIELDS,MAX_AGE,REPORT_MAX_AGE,rows,clean,update,save,load};
});

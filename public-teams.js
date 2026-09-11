/* Shared identity for every public tournament surface. */
(function (root) {
  'use strict';
  const teams = {
    'BANGA NAKIWOGO':['BN','blue'], BUGONGA:['BU','green'], BUSAMBAGA:['BS','red'],
    KAKEKA:['KA','purple'], 'KIGUNGU CENTRAL':['KG','blue'], KITASA:['KT','green'],
    KITOORO:['KI','blue'], KITUBULU:['KB','red'], 'KIWAFU CENTRAL':['KC','purple'],
    'KIWAFU EAST':['KE','green'], 'KIWAFU WEST':['KW','red'], LUGONJO:['LU','green'],
    'LUNYO CENTRAL':['LC','blue'], 'LUNYO EAST':['LE','purple'], 'MANYAGO 1':['M1','green'],
    'MANYAGO 2':['M2','blue'], MAYANZI:['MY','purple'], MISOLI:['MI','red'],
    NAKASAMBA:['NK','green'], NAMATE:['NM','blue'], NSAMIZI:['NS','purple'],
    'OLD ENTEBBE':['OE','blue'], 'POST OFFICE':['PO','red'], VIRUS:['VI','green']
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function identity(name) {
    let key = String(name || '').trim().replace(/\s+/g,' ').toUpperCase();
    if(key === 'KITORO') key = 'KITOORO';
    if(teams[key]) return {name:key, initials:teams[key][0],tone:teams[key][1]};
    if(!key || /^(TBD|TBA|TO BE CONFIRMED)$/.test(key)) return {name:key||'TBD',initials:'?',tone:'blue'};
    const words=key.split(' '), initials=words.length>1?words.slice(0,2).map(w=>w[0]).join(''):key.slice(0,2);
    return {name:key,initials,tone:'blue'};
  }
  function badge(name, size='small') {
    const team=identity(name), scale=['small','large','tiny'].includes(size)?size:'small';
    return `<span class="club-badge club-badge--${scale} club-badge--${team.tone}" aria-hidden="true"><span class="club-badge-face"></span><b>${escape(team.initials)}</b><img src="public-icons/ball-football.svg" alt=""></span>`;
  }
  function label(name) {return `<span class="club-label">${badge(name,'tiny')}<span>${escape(name||'TBD')}</span></span>`;}
  root.ShyakaTeams={identity,badge,label};
  if(typeof module==='object'&&module.exports)module.exports=root.ShyakaTeams;
})(typeof window==='undefined'?globalThis:window);

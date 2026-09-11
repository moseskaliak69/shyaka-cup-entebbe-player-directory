/* Public presentation only. Existing data, authentication and uploads stay in index.html. */
(() => {
  const home = document.querySelector('.public-premium-home');
  home.hidden = true;
  home.setAttribute('aria-hidden', 'true');
  const root = document.createElement('div'); root.id = 'publicHome'; home.before(root);
  const gallery = $('view-gallery');
  const photoPanel = gallery.querySelector('.panel'); photoPanel.hidden = true;
  const highlights = document.createElement('div'); highlights.id = 'publicHighlights'; gallery.prepend(highlights);
  document.querySelector('.brand .crest').src='public-assets/crest.webp';
  const brand = document.querySelector('.brand h1'); brand.textContent = 'SHYAKA CUP';
  brand.nextElementSibling.textContent = 'ENTEBBE 2026';
  const galleryNav = document.querySelector('#nav [data-view="gallery"]'); galleryNav.textContent = 'Highlights';
  const icon = name => `<img class="public-icon" src="public-icons/${name}.svg" alt="">`;
  const menu = document.createElement('button'); menu.className='public-menu'; menu.setAttribute('aria-label','More tournament information'); menu.setAttribute('aria-expanded','false'); menu.innerHTML=icon('list'); brand.parentElement.after(menu);
  const publicMobileItems = [['home','house-fill','Home'],['fixtures','calendar4','Fixtures'],['livescores','broadcast','Live'],['gallery','play-circle','Highlights']];
  function renderMobileNav(){
    const items=approvedAdmin?[...publicMobileItems,['players','people','Players']]:publicMobileItems;
    $('mobileBottomNav').innerHTML=items.map(([view,img,label])=>`<button data-public-view="${view}">${icon(img)}<span>${label}</span></button>`).join('');
    $('mobileBottomNav').style.gridTemplateColumns=`repeat(${items.length},minmax(0,1fr))`;
  }
  renderMobileNav();
  const sponsor = () => '<div class="public-sponsor"><small>Supported by</small><button data-public-view="sponsor">Hon. Shyaka Stephen Gashaija</button></div>';
  for(const [id,label] of [['fixtureSearch','Search team or venue'],['fixtureDivision','Division'],['fixtureStatus','Stage'],['standingDivision','Standings division'],['matchCentreSelect','Select match']])$(id).setAttribute('aria-label',label);
  const moreSheet=$('mobileMoreSheet');moreSheet.setAttribute('aria-label','More tournament information');
  function toggleMenu(force){const open=force??!moreSheet.classList.contains('open');moreSheet.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));}
  for(const button of moreSheet.querySelectorAll('[data-mobile-view]')){const labels={results:'Results',standings:'Standings',matchcentre:'Match Centre',stats:'Statistics',knockout:'Knockout',news:'News',sponsor:'Sponsor',gallery:'Highlights'};if(labels[button.dataset.mobileView])button.textContent=labels[button.dataset.mobileView];}
  menu.onclick=()=>toggleMenu();
  document.addEventListener('keydown',event=>{if(event.key==='Escape')toggleMenu(false);});
  const originalCheckSession = checkSession;
  checkSession = async function(){
    const approved=await originalCheckSession();
    renderMobileNav();
    return approved;
  };
  if(db)db.auth.onAuthStateChange(()=>queueMicrotask(renderMobileNav));
  const originalShow = showView;
  showView = function(view){ originalShow(view);toggleMenu(false);const active = document.querySelector('.view.active')?.id.replace('view-','');document.body.dataset.publicView=active;document.querySelectorAll('#mobileBottomNav [data-public-view]').forEach(b=>{const selected=b.dataset.publicView===active||(['results','standings','matchcentre','knockout','teams','stats'].includes(active)&&b.dataset.publicView==='fixtures');b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});if(active==='gallery')renderHighlights(); };
  const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Kampala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const sortFixtures = (a,b) => String(a.match_date||'9999').localeCompare(String(b.match_date||'9999')) || a.match_no-b.match_no;
  let mode = 'latest', match = '';
  const matchName = h => {const f=highlightFixture(h);return f?`${f.home_team} vs ${f.away_team}`:h.title||'Match highlight';};
  const dateLabel = date => !date?'Date TBA':date===todayKey()?'Today':new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'Africa/Kampala'});
  function openFixture(number){$('matchCentreSelect').value=String(number);renderMatchCentre();showView('matchcentre');}
  function fixtureRow(f){const scored=['live','completed'].includes(f.status);return `<button class="public-fixture" data-public-match="${esc(f.match_no)}" aria-label="${esc(f.home_team)} versus ${esc(f.away_team)}, ${esc(dateLabel(f.match_date))}, ${esc(f.match_time||'time to be confirmed')}"><span class="fixture-side">${ShyakaTeams.badge(f.home_team)}<strong>${esc(f.home_team)}</strong></span><span class="fixture-time">${scored?`${esc(f.home_score??0)} – ${esc(f.away_score??0)}`:esc(f.match_time||'TBA')}<small>${scored?esc(fixtureStatusLabel(f)):esc(dateLabel(f.match_date))}</small></span><span class="fixture-side away"><strong>${esc(f.away_team)}</strong>${ShyakaTeams.badge(f.away_team)}</span></button>`;}
  function drawHome(){
    document.querySelector('#view-fixtures .panel-head .pill').textContent=fixtures.length+' fixtures';
    const upcoming=fixtures.filter(f=>(!f.status||f.status==='scheduled')&&(!f.match_date||f.match_date>=todayKey())).sort(sortFixtures);
    const live=fixtures.find(f=>f.status==='live');
    const recent=fixtures.filter(f=>f.status==='completed').sort((a,b)=>sortFixtures(b,a));
    const featured=live||upcoming[0]||recent[0];
    const todayFixtures=upcoming.filter(f=>f.match_date===todayKey()&&f!==featured);
    const rows=(todayFixtures.length?todayFixtures:upcoming.filter(f=>f!==featured)).slice(0,2);
    const secondStat=`<b>${fixtures.length}</b><span>Fixtures</span>`;
    root.innerHTML=`${featured?`<button class="public-scoreboard" data-public-match="${esc(featured.match_no)}" aria-label="Open ${esc(featured.home_team)} versus ${esc(featured.away_team)} match centre"><span class="public-score-meta"><b>${live?'LIVE MATCH':featured.status==='completed'?'LATEST RESULT':'NEXT MATCH'}</b><span></span><small>SHYAKA CUP ENTEBBE 2026</small></span><span class="public-score-line"><span class="score-team">${ShyakaTeams.badge(featured.home_team,'large')}<strong>${esc(featured.home_team)}</strong></span><b>${live||featured.status==='completed'?`${esc(featured.home_score??0)} – ${esc(featured.away_score??0)}`:'VS'}</b><span class="score-team">${ShyakaTeams.badge(featured.away_team,'large')}<strong>${esc(featured.away_team)}</strong></span></span><span class="public-match-details"><span>${icon('calendar4')}<span><b>${esc(dateLabel(featured.match_date))}</b><strong>${esc(featured.match_time||'Time TBA')}</strong></span></span><span>${icon('geo-alt-fill')}<span><b>${esc(featured.venue||'Venue TBA')}</b><small>Entebbe</small></span></span></span><span class="public-card-caption"><i></i>MORE THAN A TOURNAMENT<i></i></span></button>`:'<div class="public-empty"><h2>Next match</h2><p>The next match will appear here when its date is confirmed.</p><button class="public-outline" data-public-view="fixtures">View fixtures</button></div>'}<div class="public-stat-row"><button data-public-view="teams">${icon('people-fill')}<span><b>${currentTeams().length}</b><span>Villages</span></span></button><button data-public-view="fixtures">${icon('calendar3')}<span>${secondStat}</span></button></div><div class="public-section-title"><h2>${todayFixtures.length?'Today’s fixtures':'Upcoming fixtures'}</h2><button data-public-view="fixtures" aria-label="View all fixtures">${icon('arrow-right')}</button></div><div class="home-fixtures">${rows.map(fixtureRow).join('')||'<div class="public-empty">No other upcoming fixtures.</div>'}</div>`;
  }
  const originalHome = renderHome;
  renderHome=function(){originalHome();drawHome();};
  // The core refresh already invokes renderHome, preserving current score updates.
  const originalFixtureCard=fixtureCardHtml;
  fixtureCardHtml=function(f){return `<button class="match-card-button" data-public-match="${esc(f.match_no)}" aria-label="Open ${esc(f.home_team)} versus ${esc(f.away_team)}">${originalFixtureCard(f)}</button>`;};
  $('matchCentreSelect').onchange=()=>renderMatchCentre();
  function clipMarkup(h,featured=false){const f=highlightFixture(h); const duration=formatClock(Number(h.duration_seconds)||30);return `<article class="public-clip ${featured?'featured':''}"><button class="public-video" data-public-clip="${esc(h.id)}" aria-label="Play ${esc(h.title||matchName(h))}"><video muted playsinline preload="none" data-preview-src="${esc(h.video_url||'')}" aria-hidden="true" tabindex="-1"></video>${icon('play-circle')}<span class="public-duration">${esc(duration)}</span></button><div><button class="public-clip-title" data-public-clip="${esc(h.id)}">${esc(featured?matchName(h):h.title||matchName(h))}</button><p>${esc(dateLabel(f?.match_date))}${f?.venue?' • '+esc(f.venue):''}</p></div></article>`;}
  let previewObserver;
  renderHighlights=function(){
    previewObserver?.disconnect();
    if($('galleryGrid')?.closest('#publicPhotos'))photoPanel.querySelector('.panel-body').append($('galleryGrid')); 
    const all=matchHighlights.filter(h=>h.published!==false).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
    const groups=[...new Set(all.map(h=>String(h.fixture_id)))];
    if(!groups.includes(match))match=groups[0]||'';
    const list=mode==='match'?all.filter(h=>String(h.fixture_id)===match):all;
    const first=list[0],more=first?list.filter(h=>h!==first&&String(h.fixture_id)===String(first.fixture_id)):[],others=first?list.filter(h=>String(h.fixture_id)!==String(first.fixture_id)):[];
    highlights.innerHTML=`<div class="public-content"><h2 class="public-page-title">Match highlights</h2><p class="public-subtitle">The moments that matter</p><div class="public-tabs" role="group" aria-label="Highlights filter"><button data-public-mode="latest" class="${mode==='latest'?'selected':''}" aria-pressed="${mode==='latest'}">Latest</button><button data-public-mode="match" class="${mode==='match'?'selected':''}" aria-pressed="${mode==='match'}">By match</button><button data-public-mode="photos" class="${mode==='photos'?'selected':''}" aria-pressed="${mode==='photos'}">Photos</button></div>${mode==='match'?`<label class="public-select-label">Select match<select id="publicMatchFilter">${groups.map(g=>`<option value="${esc(g)}" ${g===match?'selected':''}>${esc(matchName(all.find(h=>String(h.fixture_id)===g)))}</option>`).join('')}</select></label>`:''}${mode==='photos'?'<div id="publicPhotos"></div>':first?`${clipMarkup(first,true)}${more.length?`<h3 class="public-section-heading">More from this match</h3>${more.map(h=>clipMarkup(h)).join('')}`:''}${others.length?`<h3 class="public-section-heading">Other matches</h3>${others.map(h=>clipMarkup(h)).join('')}`:''}`:'<div class="public-empty"><h3>Highlights coming soon</h3><p>Published match videos will appear here. Check back after the next match.</p></div>'}${sponsor()}</div>`;
    if($('publicMatchFilter'))$('publicMatchFilter').onchange=e=>{match=e.target.value;renderHighlights();};
    if(mode==='photos'){renderGallery();$('publicPhotos').append($('galleryGrid'));}else if($('galleryGrid').closest('#publicPhotos')) photoPanel.querySelector('.panel-body').append($('galleryGrid'));
    // Fetch only visible video previews, and only while the Highlights page is open.
    if(gallery.classList.contains('active')){
      previewObserver=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{if(!isIntersecting)return;target.preload='metadata';target.src=target.dataset.previewSrc+'#t=0.1';target.addEventListener('loadedmetadata',()=>{try{target.currentTime=Math.min(.1,target.duration||.1);}catch{}},{once:true});previewObserver.unobserve(target);}),{rootMargin:'80px'});
      highlights.querySelectorAll('video').forEach(v=>previewObserver.observe(v));
    }
  };
  document.addEventListener('click',e=>{
    const target=e.target.closest('button');if(!target)return;
    if(target.dataset.publicView)showView(target.dataset.publicView);
    if(target.dataset.publicMatch)openFixture(target.dataset.publicMatch);
    if(target.dataset.publicMode){
      // Return the persistent photo grid before replacing the highlights DOM.
      if($('galleryGrid')?.closest('#publicPhotos'))photoPanel.querySelector('.panel-body').append($('galleryGrid'));
      mode=target.dataset.publicMode;renderHighlights();
    }
    if(target.dataset.publicClip){const h=matchHighlights.find(h=>String(h.id)===target.dataset.publicClip&&h.published!==false);if(h)openMatchHighlight(h);}
  });
  renderFixtures();drawHome();renderHighlights();showView(document.querySelector('.view.active')?.id.replace('view-','')||'home');
})();

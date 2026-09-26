const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function setup(){const nodes={};const doc={body:{classList:{add(){},remove(){}}},activeElement:null};const get=id=>nodes[id]??=(function(){const classes=new Set();return {isConnected:true,classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},setAttribute(){},removeAttribute(k){delete this[k]},focus(){doc.activeElement=this}}})();const c={ShyakaGalleryImages:require('../gallery-images.js'),document:doc,$:get,galleryItems:[{image_url:'a',caption:'A'},{image_url:'b',caption:'B'},{image_url:'c',caption:'C'}]};vm.createContext(c);const html=fs.readFileSync('index.html','utf8');vm.runInContext(html.slice(html.indexOf('let gallerySlideItems='),html.indexOf('let galleryRepairInFlight=')),c);return {c,get};}
test('gallery navigates both directions and wraps without closing',()=>{const {c,get}=setup();c.openGalleryPhoto('b','B');assert.equal(get('galleryLightboxCount').textContent,'2 / 3');c.moveGalleryPhoto(1);assert.equal(get('galleryLightboxImg').src,'c');c.moveGalleryPhoto(1);assert.equal(get('galleryLightboxImg').src,'a');c.moveGalleryPhoto(-1);assert.equal(get('galleryLightboxImg').src,'c');assert.equal(get('galleryLightbox').classList.contains('open'),true);});
test('keyboard and horizontal swipe navigate; vertical gestures do not',()=>{const {c,get}=setup();c.openGalleryPhoto('a','A');c.galleryKeydown({key:'ArrowRight',preventDefault(){}});assert.equal(get('galleryLightboxImg').src,'b');vm.runInContext('galleryTouchStart={x:100,y:100}',c);c.galleryTouchEnd({touches:[],changedTouches:[{clientX:20,clientY:110}]});assert.equal(get('galleryLightboxImg').src,'c');vm.runInContext('galleryTouchStart={x:100,y:100}',c);c.galleryTouchEnd({touches:[],changedTouches:[{clientX:90,clientY:200}]});assert.equal(get('galleryLightboxImg').src,'c');});
test('single image disables navigation and closing restores focus',()=>{const {c,get}=setup();const opener=get('opener');opener.focus();c.galleryItems=[];c.openGalleryPhoto('a','A');assert.equal(get('galleryLightboxNext').disabled,true);c.closeGalleryPhoto();assert.equal(c.document.activeElement,opener);assert.equal(get('galleryLightboxImg').src,undefined);c.moveGalleryPhoto(1);assert.equal(get('galleryLightboxImg').src,undefined);});
test('loading and error states reset between slides and ignore late callbacks',()=>{
 const {c,get}=setup();c.openGalleryPhoto('a','A');
 assert.match(get('galleryLoadStatus').textContent,/Loading/);assert.equal(get('galleryLightboxImg').hidden,true);
 const oldLoad=get('galleryLightboxImg').onload;
 c.moveGalleryPhoto(1);oldLoad();assert.equal(get('galleryLightboxImg').hidden,true);
 get('galleryLightboxImg').onerror();assert.equal(get('galleryRetry').hidden,false);
 assert.match(get('galleryLoadStatus').textContent,/could not load/);
 c.showGallerySlide();assert.equal(get('galleryRetry').hidden,true);get('galleryLightboxImg').onload();
 assert.equal(get('galleryLightboxImg').hidden,false);assert.equal(get('galleryLoadStatus').textContent,'');
 const lateError=get('galleryLightboxImg').onerror;c.closeGalleryPhoto();lateError();assert.equal(get('galleryRetry').hidden,true);
});
test('optimized slides use their preview and offer the original download',()=>{
 const {c,get}=setup();const base='https://tjabrrvfxlyqkhzhtnyb.supabase.co/storage/v1/object/public/gallery/';
 const url=base+'gallery/photo.jpg.shyaka-v1/abc/preview.jpg';c.galleryItems=[{image_url:url}];c.openGalleryPhoto(url,'');
 assert.equal(get('galleryLightboxImg').src,url);assert.equal(get('galleryOriginal').href,base+'gallery/photo.jpg?download=');
 assert.equal(get('galleryOriginal').hidden,false);
 c.closeGalleryPhoto();c.galleryItems=[];c.openGalleryPhoto('javascript:alert(1)','');assert.equal(get('galleryOriginal').hidden,true);
});

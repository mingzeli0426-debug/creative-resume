
'use strict';
(() => {
  const data=JSON.parse(document.getElementById('resume-data').textContent);
  const media=JSON.parse(document.getElementById('media-data').textContent);
  const dialog=document.getElementById('detail'),body=document.getElementById('detail-body');
  const title=document.getElementById('detail-title'),close=document.getElementById('close');
  const intro=document.getElementById('intro'),video=document.getElementById('video'),skip=document.getElementById('skip');
  const hotspots=document.querySelector('.hotspots'),replay=document.getElementById('replay');
  const playbackHint=document.getElementById('playback-hint'),playbackMessage=document.getElementById('playback-message');
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobilePlayback=window.matchMedia('(max-width:760px), (pointer:coarse)').matches;
  const preferredVideo=mobilePlayback&&media.mobileVideo?media.mobileVideo:media.video;
  const mobileCoverSource=document.getElementById('mobile-cover-source');
  const preferredPoster=window.matchMedia(mobileCoverSource.media).matches?mobileCoverSource.srcset:document.querySelector('.cover-image').src;
  const stage=document.querySelector('.stage'),stateContainer=document.getElementById('character-states');
  const stateImages=[],stateReady=[],statePending=[];
  let hoveredCharacter=null,focusedCharacter=null,characterFrame=0;
  function drawCharacterState(){
    characterFrame=0;
    const desired=hoveredCharacter!==null?hoveredCharacter:focusedCharacter;
    const selected=!opening&&!dialog.open&&desired!==null&&stateReady[desired]?desired:null;
    stateImages.forEach((image,index)=>{if(image)image.classList.toggle('is-current',index===selected);});
    stage.classList.toggle('has-character-state',selected!==null);
    stage.dataset.characterState=selected===null?'base':String(selected+1).padStart(2,'0');
  }
  function queueCharacterState(){
    if(!characterFrame)characterFrame=requestAnimationFrame(drawCharacterState);
  }
  function resetCharacterState(){
    hoveredCharacter=null;focusedCharacter=null;queueCharacterState();
  }
  function preloadCharacterStates(force=false){
    if(!force&&!window.matchMedia('(any-hover:hover)').matches)return;
    statePending.splice(0).forEach(load=>load());
  }
  (Array.isArray(media.states)?media.states:[]).slice(0,4).forEach((source,index)=>{
    if(typeof source!=='string'||!source)return;
    const image=new Image();stateImages[index]=image;
    image.alt='';image.className='character-state';image.decoding='async';image.fetchPriority='low';
    image.onload=async()=>{
      try{if(image.decode)await image.decode();}catch{}
      stateReady[index]=image.naturalWidth>0;queueCharacterState();
    };
    image.onerror=()=>{stateReady[index]=false;queueCharacterState();};
    stateContainer.append(image);statePending.push(()=>{image.src=source;});
  });
  document.querySelectorAll('.ticket[data-panel]').forEach(card=>{
    const index=Number(card.dataset.panel);
    card.addEventListener('pointerenter',event=>{
      if(event.pointerType==='touch')return;
      preloadCharacterStates(true);
      hoveredCharacter=index;queueCharacterState();
    });
    card.addEventListener('pointerleave',()=>{
      if(hoveredCharacter===index)hoveredCharacter=null;
      queueCharacterState();
    });
    card.addEventListener('focus',()=>{
      if(card.matches(':focus-visible')){preloadCharacterStates(true);focusedCharacter=index;queueCharacterState();}
    });
    card.addEventListener('blur',()=>{
      if(focusedCharacter===index)focusedCharacter=null;
      queueCharacterState();
    });
  });
  let active=0,trigger=null,opening=false,watchdog=null,playAttempt=0,toastTimer=null,bridgeRetryEligible=false;
  const pad=n=>String(n+1).padStart(2,'0');
  const profileCards=JSON.parse(document.getElementById('profile-cards').textContent);
  let drawnCard=-1;
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  function render(index){
    active=index;const section=data[index];
    title.textContent=section.title;
    document.getElementById('detail-summary').textContent=section.summary;
    document.getElementById('detail-eyebrow').textContent=pad(index)+' / '+section.label;
    document.getElementById('rail-number').textContent=pad(index);
    document.getElementById('rail-label').textContent=section.label;
    document.getElementById('page-status').textContent=pad(index)+' / 04';
    document.querySelectorAll('[data-switch]').forEach(button=>button.setAttribute('aria-current',String(Number(button.dataset.switch)===index)));
    const template=document.getElementById('portfolio-'+index);
    body.replaceChildren(template.content.cloneNode(true));body.scrollTop=0;
    dialog.dataset.section=String(index);
    if(index===2)selectCase('dragon');
    if(index===0)drawnCard=-1;
    if(index===3)initSkillTrack();
    document.getElementById('next').textContent=(index===3?'回到第一栏':'下一栏')+' →';
  }
  function selectCase(key,focus=false){
    const cases=[...body.querySelectorAll('[data-case]')];
    const selected=cases.find(node=>node.dataset.case===key)||cases[0];
    if(!selected)return;
    body.querySelectorAll('[data-open-writing]').forEach(button=>button.setAttribute('aria-current','false'));
    cases.forEach(node=>{node.hidden=node!==selected;});
    body.querySelectorAll('[data-select-case]').forEach(button=>button.setAttribute('aria-current',String(button.dataset.selectCase===selected.dataset.case)));
    if(focus){selected.setAttribute('tabindex','-1');selected.focus({preventScroll:true});body.scrollTo({top:body.scrollTop+selected.getBoundingClientRect().top-body.getBoundingClientRect().top-24,behavior:reduce.matches?'auto':'smooth'});}
  }
  function showProfileCard(index){
    const station=body.querySelector('.ed-draw-station');if(!station)return;
    drawnCard=((index%profileCards.length)+profileCards.length)%profileCards.length;
    const info=profileCards[drawnCard],card=station.querySelector('[data-draw-card]');
    station.querySelector('[data-card-number]').textContent=pad(drawnCard)+' / 04';
    station.querySelector('[data-card-title]').textContent=info.title;
    station.querySelector('[data-card-subtitle]').textContent=info.subtitle;
    const artwork=document.getElementById('portfolio-3').content.querySelector('.art-'+info.art+' svg');
    if(artwork)station.querySelector('[data-card-art]').replaceChildren(artwork.cloneNode(true));
    station.querySelector('[data-draw-label]').textContent='已抽取 / '+pad(drawnCard)+'—04';
    station.querySelector('[data-draw-title]').textContent=info.title;
    station.querySelector('[data-draw-body]').textContent=info.body;
    const tags=el('div','ed-chips');info.tags.forEach(t=>tags.append(el('span','',t)));
    station.querySelector('[data-draw-tags]').replaceChildren(tags);
    station.querySelector('[data-draw-evidence]').textContent=info.evidence;
    station.querySelector('[data-draw-link]').dataset.openCase=info.case;
    station.querySelector('[data-draw-proof]').hidden=false;
    station.querySelector('[data-draw-hint]').textContent='已翻开 '+pad(drawnCard)+' / 04，再点一下换一张。';
    station.querySelectorAll('[data-draw-index]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.drawIndex)===drawnCard)));
    const revealed=card.classList.contains('is-revealed');
    card.classList.add('is-revealed');card.dataset.tone=info.tone;card.setAttribute('aria-pressed','true');
    card.setAttribute('aria-label','当前档案：'+info.title+'。再点一下抽取下一张。');
    if(revealed&&!reduce.matches&&card.animate)card.animate([{transform:'rotate(-2deg) translateY(0)'},{transform:'rotate(2deg) translateY(-10px)'},{transform:'rotate(-2deg) translateY(0)'}],{duration:420,easing:'ease-out'});
  }
  function updateSkillControls(index){
    const track=body.querySelector('[data-skill-track]');if(!track)return;
    const count=track.children.length;index=Math.max(0,Math.min(count-1,index));track.dataset.current=index;
    body.querySelector('[data-skill-count]').textContent=pad(index)+' / '+String(count).padStart(2,'0');
    body.querySelector('[data-skill-prev]').disabled=index===0;
    body.querySelector('[data-skill-next]').disabled=index===count-1;
  }
  function stepSkill(direction){
    const track=body.querySelector('[data-skill-track]');if(!track)return;
    const index=Math.max(0,Math.min(track.children.length-1,Number(track.dataset.current)+direction));
    updateSkillControls(index);
    track.scrollTo({left:track.children[index].offsetLeft-track.children[0].offsetLeft,behavior:reduce.matches?'auto':'smooth'});
  }
  function initSkillTrack(){
    const track=body.querySelector('[data-skill-track]');if(!track)return;
    let timer;
    track.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(()=>{
      let best=0,distance=Infinity;[...track.children].forEach((slide,i)=>{const d=Math.abs(slide.offsetLeft-track.children[0].offsetLeft-track.scrollLeft);if(d<distance){best=i;distance=d;}});updateSkillControls(best);
    },120);},{passive:true});
    track.addEventListener('keydown',event=>{if(event.target!==track)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();stepSkill(event.key==='ArrowRight'?1:-1);}});
  }
  const imageDialog=document.getElementById('image-detail');
  let imageTrigger=null;
  body.addEventListener('click',event=>{
    const draw=event.target.closest('[data-draw-card]');if(draw){showProfileCard(drawnCard+1);return;}
    const pick=event.target.closest('[data-draw-index]');if(pick){showProfileCard(Number(pick.dataset.drawIndex));return;}
    const go=event.target.closest('[data-go-section]');if(go){render(Number(go.dataset.goSection));title.focus({preventScroll:true});return;}
    if(event.target.closest('[data-skill-next]')){stepSkill(1);return;}
    if(event.target.closest('[data-skill-prev]')){stepSkill(-1);return;}
    const writingLink=event.target.closest('[data-open-writing]');
    if(writingLink){
      selectCase('apartment');
      body.querySelectorAll('[data-select-case]').forEach(button=>button.setAttribute('aria-current','false'));
      writingLink.setAttribute('aria-current','true');
      const section=body.querySelector('.ed-writing-showcase');
      section.setAttribute('tabindex','-1');section.focus({preventScroll:true});
      body.scrollTo({top:body.scrollTop+section.getBoundingClientRect().top-body.getBoundingClientRect().top-24,behavior:reduce.matches?'auto':'smooth'});
      return;
    }
    const caseLink=event.target.closest('[data-open-case]');
    if(caseLink){event.preventDefault();const key=caseLink.dataset.openCase;render(2);selectCase(key,true);return;}
    const tab=event.target.closest('[data-select-case]');
    if(tab){selectCase(tab.dataset.selectCase,true);return;}
    const zoom=event.target.closest('[data-zoom]');
    if(zoom){
      imageTrigger=zoom;
      const full=document.getElementById('image-full');full.src=zoom.dataset.zoom;full.alt=zoom.dataset.caption||'';
      document.getElementById('image-caption').textContent=zoom.dataset.caption||'';
      imageDialog.showModal();imageDialog.scrollTop=0;imageDialog.querySelector('button').focus({preventScroll:true});
    }
  });
  imageDialog.querySelector('.image-close').addEventListener('click',()=>imageDialog.close());
  imageDialog.addEventListener('click',event=>{if(event.target===imageDialog)imageDialog.close();});
  imageDialog.addEventListener('close',()=>{if(imageTrigger&&imageTrigger.isConnected)imageTrigger.focus({preventScroll:true});});
  function finishIntro(restoreFocus=false){
    playAttempt++;clearTimeout(watchdog);const wasOpen=opening;opening=false;video.pause();
    bridgeRetryEligible=false;
    intro.classList.add('hidden');intro.classList.remove('is-loading');intro.setAttribute('aria-hidden','true');intro.inert=true;
    intro.dataset.state='idle';playbackHint.hidden=true;
    hotspots.inert=false;replay.disabled=false;replay.textContent='重新播放';
    if(wasOpen)preloadCharacterStates();
    if(restoreFocus&&wasOpen)replay.focus({preventScroll:true});
  }
  function offerIntroPlayback(message,allowBridgeRetry=false){
    const restoreFocus=intro.contains(document.activeElement);
    finishIntro(restoreFocus);
    intro.dataset.state='awaiting-play';
    playbackMessage.textContent=message;playbackHint.hidden=false;
    replay.textContent='播放开场';
    bridgeRetryEligible=allowBridgeRetry&&!reduce.matches&&!document.hidden&&!dialog.open;
  }
  function watchIntro(milliseconds){
    clearTimeout(watchdog);const attempt=playAttempt;
    watchdog=setTimeout(()=>{
      if(attempt===playAttempt&&opening)offerIntroPlayback('加载较慢，可轻触按钮重试');
    },milliseconds);
  }
  async function startIntro(manual=false){
    resetCharacterState();
    if(dialog.open)dialog.close();
    finishIntro();const attempt=++playAttempt;opening=true;
    intro.classList.remove('hidden');intro.classList.add('is-loading');intro.setAttribute('aria-hidden','false');intro.inert=false;
    intro.dataset.state='loading';hotspots.inert=false;replay.disabled=false;
    video.defaultMuted=true;video.muted=true;
    video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.setAttribute('x5-playsinline','');
    video.preload='auto';video.controls=manual;video.poster=preferredPoster;
    const videoURL=new URL(preferredVideo,document.baseURI).href;
    if(!video.src||video.src!==videoURL||video.error){video.src=preferredVideo;video.load();}
    try{video.currentTime=0;}catch{}
    watchIntro(20000);
    try{const result=video.play();if(result)await result;if(attempt!==playAttempt)return;if(manual)skip.focus({preventScroll:true});}
    catch(error){
      if(attempt!==playAttempt)return;
      if(error&&error.name==='NotAllowedError')offerIntroPlayback('当前浏览器需要轻触后播放',!manual);
      else if(error&&error.name==='NotSupportedError')offerIntroPlayback('轻触按钮重试开场，栏目可正常查看');
      else offerIntroPlayback('轻触按钮播放开场，栏目可正常查看');
    }
  }
  video.addEventListener('playing',()=>{
    if(!opening){video.pause();return;}
    intro.classList.remove('is-loading');intro.dataset.state='playing';hotspots.inert=true;playbackHint.hidden=true;
    preloadCharacterStates();watchIntro(30000);
  });
  video.addEventListener('timeupdate',()=>{if(opening&&!video.paused)watchIntro(30000);});
  video.addEventListener('waiting',()=>{if(opening)watchIntro(30000);});
  video.addEventListener('ended',()=>finishIntro(intro.contains(document.activeElement)));
  video.addEventListener('error',()=>{if(opening)offerIntroPlayback('开场暂未加载，轻触按钮重试');});
  document.addEventListener('WeixinJSBridgeReady',()=>{
    if(bridgeRetryEligible&&!reduce.matches&&!document.hidden&&!dialog.open)startIntro(false);
  },{once:true});
  skip.addEventListener('click',()=>finishIntro(true));replay.addEventListener('click',()=>startIntro(true));
  document.getElementById('intro-start').addEventListener('click',()=>startIntro(true));
  document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();
    resetCharacterState();finishIntro();trigger=button;render(Number(button.dataset.panel));
    document.body.classList.add('modal-open');
    try{dialog.showModal();close.focus({preventScroll:true});}catch{document.body.classList.remove('modal-open');notify('当前浏览器不支持详情弹窗，请使用新版浏览器或保存简历PDF。');}
  }));
  document.querySelectorAll('[data-switch]').forEach(button=>button.addEventListener('click',()=>{render(Number(button.dataset.switch));title.focus({preventScroll:true});}));
  document.getElementById('next').addEventListener('click',()=>{render((active+1)%data.length);title.focus({preventScroll:true});});
  close.addEventListener('click',()=>dialog.close());
  let backdropDown=false;
  dialog.addEventListener('pointerdown',event=>{backdropDown=event.target===dialog;});
  dialog.addEventListener('click',event=>{if(event.target===dialog&&backdropDown)dialog.close();backdropDown=false;});
  dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');if(trigger)trigger.focus({preventScroll:true});});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opening){event.preventDefault();finishIntro(true);}});
  function notify(message){const toast=document.getElementById('toast');clearTimeout(toastTimer);toast.textContent=message;toast.classList.add('visible');toastTimer=setTimeout(()=>toast.classList.remove('visible'),5000);}
  async function copyLink(url){
    try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url);return true;}}catch{}
    const field=document.createElement('textarea');field.value=url;field.setAttribute('readonly','');field.style.cssText='position:fixed;opacity:0;left:0;top:0';document.body.append(field);field.select();
    let copied=false;try{copied=document.execCommand('copy');}catch{}field.remove();return copied;
  }
  document.getElementById('share').addEventListener('click',async()=>{
    if(!/^https?:$/.test(location.protocol)){notify('本地版请直接发送这个 HTML 文件；发布上线后才有可分享的网址。');return;}
    const url=location.href;
    if(navigator.share){try{await navigator.share({title:'李明泽 · 创意简历',url});return;}catch(error){if(error.name==='AbortError')return;}}
    notify(await copyLink(url)?'网址已复制，可以分享给 HR。':'无法自动复制，请从浏览器地址栏复制网址。');
  });
  function savePdf(event){
    if(!document.getElementById('pdf').href.startsWith('data:'))return;
    event.preventDefault();
    try{const encoded=document.getElementById('pdf').href.split(',')[1],raw=atob(encoded),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),link=document.createElement('a');link.href=url;link.download='李明泽简历.pdf';link.style.display='none';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch{notify('无法自动保存，请尝试使用电脑上的新版浏览器。');}
  }
  document.getElementById('pdf').addEventListener('click',savePdf);document.getElementById('mobile-pdf').addEventListener('click',savePdf);
  if(reduce.addEventListener)reduce.addEventListener('change',()=>{if(reduce.matches&&opening)finishIntro(intro.contains(document.activeElement));});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&opening)finishIntro(false);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetCharacterState();});
  stage.dataset.characterState='base';
  intro.dataset.state='idle';
  if(!reduce.matches&&!location.hash.startsWith('#section-'))startIntro();else preloadCharacterStates();
})();

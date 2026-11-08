
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
    const fragment=document.createDocumentFragment();
    section.items.forEach(item=>{
      const article=el('article','entry'),top=el('div','entry-top');
      top.append(el('h3','',item.title));if(item.date)top.append(el('time','',item.date));article.append(top);
      if(item.role)article.append(el('p','role',item.role));
      if(item.lead)article.append(el('p','lead',item.lead));
      if(item.metrics){const metrics=el('div','metrics');item.metrics.forEach(([value,label])=>{const metric=el('div','metric');metric.append(el('strong','',value),el('span','',label));metrics.append(metric);});article.append(metrics);}
      item.body.forEach(text=>{
        const paragraph=el('p','description');const split=text.indexOf('：');
        if(split>0&&split<9){paragraph.append(el('strong','',text.slice(0,split+1)),document.createTextNode(text.slice(split+1)));}else paragraph.textContent=text;
        article.append(paragraph);
      });fragment.append(article);
    });
    body.replaceChildren(fragment);body.scrollTop=0;
    document.getElementById('next').textContent=(index===3?'回到第一栏':'下一栏')+' →';
  }
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
    try{dialog.showModal();close.focus({preventScroll:true});}catch{document.body.classList.remove('modal-open');notify('当前浏览器不支持详情弹窗，请使用新版浏览器或保存原始简历。');}
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

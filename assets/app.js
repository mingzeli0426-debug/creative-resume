
'use strict';
(() => {
  const data=JSON.parse(document.getElementById('resume-data').textContent);
  const media=JSON.parse(document.getElementById('media-data').textContent);
  const dialog=document.getElementById('detail'),body=document.getElementById('detail-body');
  const title=document.getElementById('detail-title'),close=document.getElementById('close');
  const intro=document.getElementById('intro'),video=document.getElementById('video'),skip=document.getElementById('skip');
  const hotspots=document.querySelector('.hotspots'),replay=document.getElementById('replay');
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  let active=0,trigger=null,opening=false,watchdog=null,playAttempt=0,toastTimer=null;
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
    intro.classList.add('hidden');intro.setAttribute('aria-hidden','true');intro.inert=true;
    hotspots.inert=false;replay.disabled=false;
    if(restoreFocus&&wasOpen)replay.focus({preventScroll:true});
  }
  async function startIntro(manual=false){
    if(dialog.open)dialog.close();
    finishIntro();const attempt=++playAttempt;opening=true;
    intro.classList.remove('hidden');intro.setAttribute('aria-hidden','false');intro.inert=false;hotspots.inert=true;replay.disabled=true;
    if(!video.src)video.src=media.video;
    try{video.currentTime=0;}catch{}
    video.muted=true;
    watchdog=setTimeout(()=>{if(attempt===playAttempt){finishIntro(manual);notify('开场视频暂时无法播放，已显示简历。');}},7000);
    try{const result=video.play();if(result)await result;if(attempt!==playAttempt)return;if(manual)skip.focus({preventScroll:true});}
    catch{if(attempt===playAttempt){finishIntro(manual);if(manual)notify('视频暂时无法播放，可以直接点击票券浏览简历。');}}
  }
  video.addEventListener('playing',()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>finishIntro(false),Math.max(12000,(Number.isFinite(video.duration)?video.duration:5)*1000+4000));});
  video.addEventListener('ended',()=>finishIntro(intro.contains(document.activeElement)));
  video.addEventListener('error',()=>{if(opening){const focus=intro.contains(document.activeElement);finishIntro(focus);notify('视频加载失败，已显示静态简历。');}});
  skip.addEventListener('click',()=>finishIntro(true));replay.addEventListener('click',()=>startIntro(true));
  document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();finishIntro();trigger=button;render(Number(button.dataset.panel));
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
  if(!reduce.matches&&!location.hash.startsWith('#section-'))startIntro();
})();

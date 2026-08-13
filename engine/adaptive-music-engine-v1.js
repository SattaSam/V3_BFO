(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{},cat=BF.MusicCatalogV1||global.BlueFoxMusicCatalogV1;
if(!cat){console.warn("[BlueFox Music] catalogue absent");return;}
const VERSION="1.0.0",KEY="bluefox_music_settings_v1",clamp=v=>Math.max(0,Math.min(1,Number(v)||0)),clock=()=>global.performance?.now?.()||Date.now();

class AdaptiveMusicEngine{
 constructor(options={}){
  this.audioFactory=options.audioFactory||(()=>new global.Audio());
  this.decks=[this.deck("A"),this.deck("B")];this.active=-1;this.context=cat.contexts.EXPLORATION_CALM;this.priority=10;
  this.sequenceId=null;this.sequence=[];this.index=0;this.repeats=0;this.history=[];this.pending=null;this.started=false;this.unlocked=false;this.disposed=false;
  this.timer=null;this.fadeTimer=null;this.segmentStartedAt=0;this.lastTransition=null;this.lastError=null;this.settings=this.loadSettings();
  this.onUnlock=()=>this.unlock();this.onContext=e=>this.setContext(e.detail?.context,e.detail||{});
  global.addEventListener?.("pointerdown",this.onUnlock,{once:true,passive:true});global.addEventListener?.("keydown",this.onUnlock,{once:true});
  global.addEventListener?.("bluefox:music-context",this.onContext);
 }
 deck(name){const audio=this.audioFactory();audio.preload="auto";audio.loop=false;audio.volume=0;return{name,audio,token:0,step:null};}
 loadSettings(){try{const s=JSON.parse(global.localStorage?.getItem(KEY)||"null");return{enabled:s?.enabled!==false,volume:clamp(s?.volume??.72)};}catch{return{enabled:true,volume:.72};}}
 saveSettings(){global.localStorage?.setItem(KEY,JSON.stringify(this.settings));}
 setEnabled(v){this.settings.enabled=!!v;this.saveSettings();if(!v)this.stop(.5);else if(this.unlocked)this.start();}
 setVolume(v){this.settings.volume=clamp(v);this.saveSettings();if(this.active>=0)this.decks[this.active].audio.volume=this.targetVolume(this.decks[this.active].step);}
 bacSnapshot(){const p=BF.BAC?.readProfile?.()||{},d=BF.getBACDiagnostics?.()||BF.BAC?.getDiagnostics?.()||{};return{priorities:p.priorities||{},emotions:d.relation?.emotions||d.emotions||{}};}
 targetVolume(step){if(!step)return 0;return clamp(this.settings.volume*cat.computeIntensity(this.context,step.track.family,this.bacSnapshot())*(step.segment.gain||1));}
 async unlock(){if(this.unlocked||this.disposed)return;this.unlocked=true;if(this.settings.enabled)await this.start();}
 async start(){if(this.started||!this.unlocked||!this.settings.enabled||this.disposed)return false;this.started=true;this.selectSequence(true);return this.playCurrent(0);}
 chooseSequence(){const c=cat.contextSequences[this.context]||[],recent=this.history.slice(-cat.transitions.recentTrackHistorySize);return c.find(id=>!recent.includes(id))||c[0]||null;}
 selectSequence(force=false){const id=this.chooseSequence();if(!id)return false;if(!force&&id===this.sequenceId)return true;this.sequenceId=id;this.sequence=cat.sequences[id].slice();this.index=0;this.repeats=0;this.history.push(id);if(this.history.length>12)this.history.shift();return true;}
 currentStep(){return this.sequence[this.index]?cat.resolveStep(this.sequence[this.index]):null;}
 setContext(id,detail={}){
  if(!cat.contextProfiles[id])return false;const priority=Number(detail.priority??10),age=(clock()-this.segmentStartedAt)/1000,current=this.active>=0?this.decks[this.active].step:null;
  const urgent=priority>=cat.transitions.priorities.danger||id===cat.contexts.DANGER;
  if(this.started&&current?.segment?.protected&&!urgent&&id!==cat.contexts.MAP_DISCOVERY){this.pending={id,priority};return true;}
  if(this.started&&age<cat.transitions.minimumListenSec&&priority<=this.priority){this.pending={id,priority};return true;}
  const changed=id!==this.context;this.context=id;this.priority=priority;this.pending=null;
  if(changed&&this.started){this.selectSequence(true);this.playCurrent(urgent?cat.transitions.urgentCrossfadeSec:Number(detail.fadeSec??cat.contextProfiles[id].crossfadeSec??cat.transitions.standardCrossfadeSec));}return true;
 }
 applyPending(){if(!this.pending)return false;const p=this.pending;this.pending=null;return this.setContext(p.id,{priority:p.priority});}
 async playCurrent(overrideFade){
  const step=this.currentStep();if(!step||this.disposed||!this.settings.enabled)return false;this.clearTimer();
  const nextIndex=this.active===0?1:0,next=this.decks[nextIndex],previous=this.active>=0?this.decks[this.active]:null,token=++next.token,seg=step.segment;
  const fade=Math.max(0,Number(overrideFade??seg.fadeSec??cat.transitions.standardCrossfadeSec));
  next.step=step;next.audio.src=step.track.file;next.audio.currentTime=seg.startSec;next.audio.volume=fade?0:this.targetVolume(step);
  try{await Promise.resolve(next.audio.play());}catch(error){this.lastError=String(error?.message||error);this.started=false;return false;}
  if(token!==next.token)return false;this.active=nextIndex;this.segmentStartedAt=clock();this.lastTransition={at:Date.now(),context:this.context,sequence:this.sequenceId,track:step.track.id,segment:seg.id,fadeSec:fade};
  this.crossfade(previous,next,fade);const duration=Math.max(.05,seg.endSec-seg.startSec);this.timer=global.setTimeout(()=>this.advance(),Math.max(20,(duration-fade)*1000));return true;
 }
 crossfade(previous,next,duration){
  if(this.fadeTimer)global.clearInterval(this.fadeTimer);const target=this.targetVolume(next.step);
  if(!duration){next.audio.volume=target;if(previous){previous.audio.pause();previous.audio.volume=0;}return;}
  const start=clock(),from=previous?.audio.volume||0;this.fadeTimer=global.setInterval(()=>{const p=clamp((clock()-start)/(duration*1000));next.audio.volume=target*p;if(previous)previous.audio.volume=from*(1-p);
   if(p>=1){global.clearInterval(this.fadeTimer);this.fadeTimer=null;if(previous){previous.audio.pause();previous.audio.volume=0;}}},50);
 }
 advance(){
  if(!this.started||this.disposed)return;const step=this.currentStep();if(!step)return;
  if(this.sequence.length===1&&step.segment.loopable&&this.repeats<cat.transitions.maxConsecutiveLoopRepeats-1)this.repeats++;
  else{this.repeats=0;this.index++;if(this.index>=this.sequence.length){if(this.applyPending())return;this.selectSequence(true);}}
  this.playCurrent();
 }
 clearTimer(){if(this.timer)global.clearTimeout(this.timer);this.timer=null;}
 stop(){this.started=false;this.clearTimer();if(this.fadeTimer)global.clearInterval(this.fadeTimer);this.fadeTimer=null;this.decks.forEach(d=>{d.token++;d.audio.pause();d.audio.volume=0;});}
 diagnostics(){const d=this.active>=0?this.decks[this.active]:null;return{version:VERSION,enabled:this.settings.enabled,unlocked:this.unlocked,started:this.started,context:this.context,priority:this.priority,pending:this.pending,sequence:this.sequenceId,index:this.index,track:d?.step?.track?.id||null,segment:d?.step?.segment?.id||null,volume:d?.audio?.volume||0,bac:this.bacSnapshot(),lastTransition:this.lastTransition,lastError:this.lastError};}
 dispose(){this.disposed=true;this.stop();global.removeEventListener?.("pointerdown",this.onUnlock);global.removeEventListener?.("keydown",this.onUnlock);global.removeEventListener?.("bluefox:music-context",this.onContext);}
}
const validation=cat.validateCatalog();if(!validation.valid){console.error("[BlueFox Music] catalogue invalide",validation.errors);return;}
BF.AdaptiveMusicEngine=AdaptiveMusicEngine;BF.music=new AdaptiveMusicEngine();BF.setMusicContext=(id,detail)=>BF.music.setContext(id,detail);BF.getMusicDiagnostics=()=>BF.music.diagnostics();
global.dispatchEvent?.(new CustomEvent("bluefox:music-ready",{detail:{version:VERSION,tracks:cat.tracks.length}}));
})(window);

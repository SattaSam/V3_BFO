(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{},cat=BF.MusicCatalogV1||global.BlueFoxMusicCatalogV1;
if(!cat){console.warn("[BlueFox Music] catalogue absent");return;}
const VERSION="1.2.0",KEY="bluefox_music_settings_v1",clamp=v=>Math.max(0,Math.min(1,Number(v)||0)),clock=()=>global.performance?.now?.()||Date.now();

class AdaptiveMusicEngine{
 constructor(options={}){
  this.audioFactory=options.audioFactory||(()=>new global.Audio());
  this.decks=[this.deck("A"),this.deck("B")];this.active=-1;this.context=cat.contexts.EXPLORATION_CALM;this.priority=10;
  this.sequenceId=null;this.sequence=[];this.index=0;this.repeats=0;this.history=[];this.pending=null;this.started=false;this.unlocked=false;this.disposed=false;
  this.signal={axis:"exploration",activation:0,event:null,decisionAt:0};this.lastSignalChange=0;
  this.timer=null;this.fadeTimer=null;this.retryTimer=null;this.retryCount=0;this.transitioningAudio=false;this.playGeneration=0;this.segmentStartedAt=0;this.sequenceStartedAt=0;this.lastTransition=null;this.lastError=null;this.settings=this.loadSettings();
  this.cueAudio=this.audioFactory();this.cueAudio.preload="auto";this.cueAudio.loop=false;this.cueAudio.volume=0;this.cueBusyUntil=0;this.cueHistory=[];this.lastCueFile=new Map();this.lastCue=null;
  this.onUnlock=()=>this.unlock();this.onContext=e=>this.setContext(e.detail?.context,e.detail||{});
  global.addEventListener?.("pointerdown",this.onUnlock,{once:true,passive:true});global.addEventListener?.("keydown",this.onUnlock,{once:true});
  global.addEventListener?.("bluefox:music-context",this.onContext);
 }
 deck(name){const audio=this.audioFactory(),deck={name,audio,token:0,step:null};audio.preload="auto";audio.loop=false;audio.volume=0;audio.addEventListener?.("ended",()=>this.onAudioEnded(deck));audio.addEventListener?.("error",()=>this.onAudioError(deck));return deck;}
 onAudioEnded(deck){if(!this.started||this.transitioningAudio||this.decks[this.active]!==deck)return;this.clearTimer();this.advance();}
 onAudioError(deck){if(!this.started||this.transitioningAudio||this.decks[this.active]!==deck)return;this.lastError="audio-error:"+(deck.audio.error?.code||"unknown");global.clearTimeout(this.retryTimer);this.retryTimer=global.setTimeout(()=>this.playCurrent(1),300);}
 loadSettings(){try{const s=JSON.parse(global.localStorage?.getItem(KEY)||"null");return{enabled:s?.enabled!==false,volume:clamp(s?.volume??.72)};}catch{return{enabled:true,volume:.72};}}
 saveSettings(){global.localStorage?.setItem(KEY,JSON.stringify(this.settings));}
 setEnabled(v){this.settings.enabled=!!v;this.saveSettings();if(!v)this.stop(.5);else if(this.unlocked)this.start();}
 setVolume(v){this.settings.volume=clamp(v);this.saveSettings();if(this.active>=0)this.decks[this.active].audio.volume=this.targetVolume(this.decks[this.active].step);if(this.lastCue)this.cueAudio.volume=this.cueVolume(this.lastCue.entry,this.lastCue.variationDb||0);}
 bacSnapshot(){const p=BF.BAC?.readProfile?.()||{},d=BF.getBACDiagnostics?.()||BF.BAC?.getDiagnostics?.()||{};return{priorities:p.priorities||{},emotions:d.relation?.emotions||d.emotions||{}};}
 targetVolume(step){if(!step)return 0;const intensity=cat.computeIntensity(this.context,step.track.family,this.bacSnapshot()),level=.86+intensity*.08,gain=.94+((step.segment.gain||1)-1)*.25;return clamp(this.settings.volume*level*gain);}
 cueVolume(entry,variationDb=0){return clamp(this.settings.volume*Number(entry?.gain||.7)*Math.pow(10,variationDb/20));}
 async playCue(id,detail={}){
  const entry=cat.cues?.[id],time=Date.now();if(!entry||!this.started||!this.unlocked||!this.settings.enabled||this.disposed)return false;
  this.cueHistory=this.cueHistory.filter(item=>item.at>=time-60000);
  const last=this.cueHistory[this.cueHistory.length-1],familyCount=this.cueHistory.filter(item=>item.family===entry.family).length;
  const globalCooldown=Number(cat.transitions.cueGlobalCooldownMs)||8000,familyCooldown=Number(entry.cooldownMs||cat.transitions.cueFamilyCooldownMs)||12000;
  const lastFamily=[...this.cueHistory].reverse().find(item=>item.family===entry.family);
  if(!detail.force&&(time<this.cueBusyUntil||time-(last?.at||0)<globalCooldown||time-(lastFamily?.at||0)<familyCooldown||familyCount>=3))return false;
  const alternatives=entry.files.filter(file=>file!==this.lastCueFile.get(id)),files=alternatives.length?alternatives:entry.files;
  const file=files[Math.floor(Math.random()*files.length)],variationDb=(Math.random()*2)-1;
  this.cueAudio.pause?.();this.cueAudio.src=file;this.cueAudio.currentTime=0;this.cueAudio.volume=this.cueVolume(entry,variationDb);
  try{await Promise.resolve(this.cueAudio.play());}catch(error){this.lastError="cue-audio-error:"+String(error?.message||error);return false;}
  this.cueBusyUntil=time+5000;this.lastCueFile.set(id,file);this.cueHistory.push({id,family:entry.family,file,at:time});this.lastCue={id,file,entry,variationDb,at:time,reason:detail.reason||null};return true;
 }
 async unlock(){if(this.unlocked||this.disposed)return;this.unlocked=true;if(this.settings.enabled)await this.start();}
 async start(){if(this.started||!this.unlocked||!this.settings.enabled||this.disposed)return false;this.started=true;this.selectSequence(true);return this.playCurrent(0);}
 chooseSequence(){const c=cat.contextSequences[this.context]||[],recent=this.history.slice(-cat.transitions.recentTrackHistorySize);return c.map(id=>({id,score:(cat.scoreSequence?cat.scoreSequence(id,this.signal,recent):(recent.includes(id)?0:1))+Math.random()*6})).sort((a,b)=>b.score-a.score)[0]?.id||null;}
 selectSequence(force=false){const id=this.chooseSequence();if(!id)return false;if(!force&&id===this.sequenceId)return true;this.sequenceId=id;this.sequence=cat.sequences[id].slice();this.index=0;this.repeats=0;this.history.push(id);if(this.history.length>12)this.history.shift();return true;}
 currentStep(){return this.sequence[this.index]?cat.resolveStep(this.sequence[this.index]):null;}
 setMusicalState(detail={}){
  const next={axis:detail.axis||this.signal.axis,activation:Math.max(0,Math.min(5,Number(detail.activation??this.signal.activation)||0)),event:detail.event||null,decisionAt:Number(detail.decisionAt)||this.signal.decisionAt};
  const changed=next.axis!==this.signal.axis||next.activation!==this.signal.activation||next.event!==this.signal.event;
  this.signal=next;if(!changed)return false;this.lastSignalChange=Date.now();if(detail.defer||detail.advisory)return true;
  const desired=this.chooseSequence();if(!desired||desired===this.sequenceId||!this.started)return true;
  this.pending={id:this.context,priority:this.priority,sequenceId:desired,requestedAt:Date.now()};return true;
 }
 setContext(id,detail={}){
  if(!cat.contextProfiles[id])return false;const priority=Number(detail.priority??10),urgent=priority>=cat.transitions.priorities.danger;
  const changed=id!==this.context;
  if(!changed){this.priority=priority;return true;}
  if(this.started&&!urgent){this.pending={id,priority,requestedAt:Date.now(),reason:detail.reason||null};return true;}
  this.context=id;this.priority=priority;this.pending=null;
  if(changed&&this.started){this.selectSequence(true);this.playCurrent(urgent?cat.transitions.urgentCrossfadeSec:Number(detail.fadeSec??cat.contextProfiles[id].crossfadeSec??cat.transitions.standardCrossfadeSec));}return true;
 }
 applyPending(){
  if(!this.pending)return false;const p=this.pending;this.pending=null;
  if(!cat.contextProfiles[p.id])return false;
  this.context=p.id;this.priority=Number(p.priority??this.priority);
  if(p.sequenceId&&cat.sequences[p.sequenceId]){this.sequenceId=p.sequenceId;this.sequence=cat.sequences[p.sequenceId].slice();this.index=0;this.repeats=0;this.history.push(p.sequenceId);if(this.history.length>12)this.history.shift();}
  else this.selectSequence(true);
  const fade=Number(cat.contextProfiles[p.id].crossfadeSec??cat.transitions.standardCrossfadeSec);
  this.playCurrent(fade);return true;
 }
 async playCurrent(overrideFade){
  const step=this.currentStep();if(!step||!this.started||this.disposed||!this.settings.enabled)return false;
  const nextIndex=this.active===0?1:0,next=this.decks[nextIndex],previous=this.active>=0?this.decks[this.active]:null,token=++next.token,generation=++this.playGeneration,seg=step.segment;
  const fade=Math.max(0,Number(overrideFade??seg.fadeSec??cat.transitions.standardCrossfadeSec));
  next.step=step;next.audio.src=step.track.file;next.audio.currentTime=seg.startSec;next.audio.volume=fade?0:this.targetVolume(step);
  this.transitioningAudio=true;
  try{await Promise.resolve(next.audio.play());}catch(error){if(generation===this.playGeneration)this.transitioningAudio=false;if(token!==next.token||generation!==this.playGeneration)return false;this.lastError=String(error?.message||error);this.retryCount++;global.clearTimeout(this.retryTimer);this.retryTimer=global.setTimeout(()=>this.playCurrent(overrideFade),Math.min(1500,250*this.retryCount));return false;}
  if(generation===this.playGeneration)this.transitioningAudio=false;if(token!==next.token||generation!==this.playGeneration)return false;this.clearTimer();this.retryCount=0;this.lastError=null;this.active=nextIndex;this.segmentStartedAt=clock();if(this.index===0)this.sequenceStartedAt=this.segmentStartedAt;this.lastTransition={at:Date.now(),context:this.context,sequence:this.sequenceId,track:step.track.id,segment:seg.id,fadeSec:fade};
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
  const sequenceAge=(clock()-this.sequenceStartedAt)/1000,pendingAge=this.pending?(Date.now()-Number(this.pending.requestedAt||Date.now()))/1000:0;
  const sequenceEnding=this.index+1>=this.sequence.length,minimumReached=sequenceAge>=cat.transitions.minimumListenSec,maximumPendingReached=pendingAge>=cat.transitions.maximumPendingSec;
  if(this.pending&&((sequenceEnding&&minimumReached)||maximumPendingReached)){if(this.applyPending())return;}
  if(this.sequence.length===1&&step.segment.loopable&&this.repeats<cat.transitions.maxConsecutiveLoopRepeats-1)this.repeats++;
  else{this.repeats=0;this.index++;if(this.index>=this.sequence.length){if(this.pending&&this.applyPending())return;this.selectSequence(true);}}
  this.playCurrent();
 }
 clearTimer(){if(this.timer)global.clearTimeout(this.timer);this.timer=null;}
 stop(){this.started=false;this.playGeneration++;this.transitioningAudio=false;this.clearTimer();global.clearTimeout(this.retryTimer);this.retryTimer=null;if(this.fadeTimer)global.clearInterval(this.fadeTimer);this.fadeTimer=null;this.decks.forEach(d=>{d.token++;d.audio.pause();d.audio.volume=0;});this.cueAudio.pause?.();this.cueAudio.volume=0;this.cueBusyUntil=0;}
 diagnostics(){const d=this.active>=0?this.decks[this.active]:null;return{version:VERSION,enabled:this.settings.enabled,unlocked:this.unlocked,started:this.started,context:this.context,priority:this.priority,pending:this.pending,signal:this.signal,sequence:this.sequenceId,index:this.index,track:d?.step?.track?.id||null,segment:d?.step?.segment?.id||null,volume:d?.audio?.volume||0,cue:this.lastCue?{id:this.lastCue.id,file:this.lastCue.file,at:this.lastCue.at,reason:this.lastCue.reason}:null,bac:this.bacSnapshot(),lastTransition:this.lastTransition,lastError:this.lastError};}
 dispose(){this.disposed=true;this.stop();global.removeEventListener?.("pointerdown",this.onUnlock);global.removeEventListener?.("keydown",this.onUnlock);global.removeEventListener?.("bluefox:music-context",this.onContext);}
}
const validation=cat.validateCatalog();if(!validation.valid){console.error("[BlueFox Music] catalogue invalide",validation.errors);return;}
BF.AdaptiveMusicEngine=AdaptiveMusicEngine;BF.music=new AdaptiveMusicEngine();BF.setMusicContext=(id,detail)=>BF.music.setContext(id,detail);BF.playMusicCue=(id,detail)=>BF.music.playCue(id,detail);BF.getMusicDiagnostics=()=>BF.music.diagnostics();
global.dispatchEvent?.(new CustomEvent("bluefox:music-ready",{detail:{version:VERSION,tracks:cat.tracks.length}}));
})(window);

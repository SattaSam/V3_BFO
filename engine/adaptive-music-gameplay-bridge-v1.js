(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{},music=BF.music,cat=BF.MusicCatalogV1||global.BlueFoxMusicCatalogV1;
if(!music||!cat){console.warn("[BlueFox Music Bridge] moteur musical absent");return;}
const VERSION="1.0.0",leases=new Map(),listeners=[],objectTimes=[];
let current=null,timer=null,lastMission=null,lastReason="initialization";
const now=()=>Date.now(),lower=v=>String(v||"").toLowerCase();
const priorities={ambient:10,mission:40,interaction:55,action:75,danger:90,narrative:100};

function on(type,handler){global.addEventListener(type,handler);listeners.push([type,handler]);}
function lease(source,context,priority,durationMs,reason){
 if(!cat.contextProfiles[context])return false;
 leases.set(source,{source,context,priority,expiresAt:durationMs===Infinity?Infinity:now()+durationMs,reason});
 lastReason=reason||source;evaluate();return true;
}
function release(source){const changed=leases.delete(source);if(changed)evaluate();return changed;}
function activeLeases(){const time=now();for(const [key,item] of leases)if(item.expiresAt!==Infinity&&item.expiresAt<=time)leases.delete(key);return [...leases.values()].sort((a,b)=>b.priority-a.priority||b.expiresAt-a.expiresAt);}
function actionContext(action){
 const value=lower(action);
 if(/rest|eat|food|sleep/.test(value))return cat.contexts.REST;
 if(/analy|research/.test(value))return cat.contexts.RESEARCH;
 if(/inspect|observe|scan/.test(value))return cat.contexts.ARCHAEOLOGY;
 if(/build|craft|construct|repair/.test(value))return cat.contexts.CRAFT;
 if(/run|escape|danger|fight/.test(value))return cat.contexts.ACTION_DYNAMIC;
 return null;
}
function baseline(){
 const engine=BF.currentEngine,action=lastMission?.currentAction?.type;
 if(engine?.transitioning)return{context:cat.contexts.EXPLORATION_SIGNIFICANT,priority:priorities.interaction,reason:"map-transition"};
 if(engine?.currentRoutine?.type){
  const context=actionContext(engine.currentRoutine.type);
  if(context)return{context,priority:priorities.mission,reason:"routine:"+engine.currentRoutine.type};
 }
 const missionContext=actionContext(action);
 if(missionContext)return{context:missionContext,priority:priorities.mission,reason:"mission-action:"+action};
 return{context:cat.contexts.EXPLORATION_CALM,priority:priorities.ambient,reason:"ambient-exploration"};
}
function evaluate(){
 const winner=activeLeases()[0]||baseline(),key=winner.context+"|"+winner.priority;
 if(key===current)return;current=key;lastReason=winner.reason;
 music.setContext(winner.context,{priority:winner.priority,source:"gameplay-bridge",reason:winner.reason});
 global.dispatchEvent?.(new CustomEvent("bluefox:music-context-resolved",{detail:{...winner,version:VERSION}}));
}
function tags(event){return[...(event.tags||[]),event.category,event.family,event.knowledgeFamily,event.objectId].map(lower).filter(Boolean);}
function onObject(event){
 const e=event.detail||{},type=e.type,labels=tags(e);
 objectTimes.push(now());while(objectTimes.length&&objectTimes[0]<now()-8000)objectTimes.shift();
 if(type==="PHENOMENON_OBSERVED")lease("phenomenon",cat.contexts.EXPLORATION_SIGNIFICANT,65,70000,"phenomenon-observed");
 else if(type==="OBJECT_ANALYZED"||type==="KNOWLEDGE_ACQUIRED")lease("knowledge",cat.contexts.RESEARCH,priorities.interaction,80000,"knowledge-interaction");
 else if(["OBJECT_CRAFTED","OBJECT_BUILT","OBJECT_REPAIRED"].includes(type))lease("craft",cat.contexts.CRAFT,priorities.interaction,70000,"craft-interaction");
 else if((type==="OBJECT_SEEN"||type==="OBJECT_INSPECTED")&&labels.some(v=>/ruin|relic|artefact|artifact|technology|ancient|civilization/.test(v)))
  lease("archaeology",cat.contexts.ARCHAEOLOGY,priorities.interaction,80000,"archaeology-interaction");
 if(objectTimes.length>=4)lease("action-burst",cat.contexts.ACTION_DYNAMIC,priorities.action,55000,"rapid-actions");
}
function onMission(event){lastMission=event.detail||null;evaluate();}
function onTransition(event){
 const detail=event.detail||{};
 lease("map-arrival",detail.isNew?cat.contexts.MAP_DISCOVERY:cat.contexts.EXPLORATION_CALM,detail.isNew?70:25,detail.isNew?42000:35000,detail.isNew?"new-map-discovery":"known-map");
}
function onMilestone(event){
 const d=event.detail||{},context=d.type==="expertise"?cat.contexts.RESEARCH:cat.contexts.EXPLORATION_SIGNIFICANT;
 lease("map-milestone",context,70,85000,"map-"+(d.type||"milestone")+"-"+(d.threshold??""));
}
function onSurvival(event){
 const detail=event.detail||{},reason=lower(detail.reason),state=detail.state||{};
 if(reason.includes("hazard"))lease("hazard",cat.contexts.DANGER,priorities.danger,60000,detail.reason);
 else if(state.needs?.criticalRest||Number(state.energy)<20)lease("critical-rest",cat.contexts.REST,85,90000,"critical-rest");
 else if(state.needs?.rest||Number(state.energy)<38)lease("rest",cat.contexts.REST,65,60000,"rest-needed");
 else{release("critical-rest");release("rest");}
}
function onVisibility(){
 if(global.document?.hidden)music.stop();else if(music.unlocked&&music.settings.enabled)music.start();
}
on("bluefox:object-event",onObject);on("bluefox:mission-state",onMission);on("bluefox:map-transition-completed",onTransition);
on("bluefox:map-milestone",onMilestone);on("bluefox:survival-changed",onSurvival);global.document?.addEventListener?.("visibilitychange",onVisibility);
timer=global.setInterval(evaluate,1000);evaluate();

BF.MusicGameplayBridge=Object.freeze({
 version:VERSION,priorities,
 setTemporaryContext:(source,context,priority=55,durationMs=60000,reason="external")=>lease(source,context,priority,durationMs,reason),
 releaseContext:release,
 getDiagnostics:()=>({version:VERSION,current,lastReason,leases:activeLeases(),baseline:baseline()}),
 dispose:()=>{if(timer)global.clearInterval(timer);listeners.forEach(([type,handler])=>global.removeEventListener(type,handler));global.document?.removeEventListener?.("visibilitychange",onVisibility);leases.clear();}
});
BF.getMusicBridgeDiagnostics=()=>BF.MusicGameplayBridge.getDiagnostics();
})(window);

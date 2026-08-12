(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{};
if(BF.LegacyMSCAdjustR6)return;
const source=BF.MicroScenes;
if(!source?.data)return;
const lifts=Object.freeze({
 "MSC-CUSTOM-CAMP-BASE":1.25,
 "MSC-CUSTOM-CAMP-BASE-REINFORCED":2.00
});
const data={...source.data};
Object.entries(data).forEach(([key,scene])=>{
 const lift=Number(lifts[scene?.id])||0;
 if(!lift)return;
 data[key]=Object.freeze({...scene,legacyHistorical:true,r6LiftY:lift,objects:Object.freeze((scene.objects||[]).map(e=>Object.freeze({...e,offset:Object.freeze([Number(e.offset?.[0])||0,(Number(e.offset?.[1])||0)+lift,Number(e.offset?.[2])||0]),rotation:Object.freeze([Number(e.rotation?.[0])||0,Number(e.rotation?.[1])||0,Number(e.rotation?.[2])||0])})))});
});
const original=source;
BF.MicroScenes=Object.freeze({...original,data:Object.freeze(data),
 get(q){return data[q]||Object.values(data).find(s=>s?.id===q||s?.name===q)||null;},
 list(biome){const by=new Map();Object.values(data).forEach(s=>{if(!s?.id)return;if(biome&&!s.biomes?.includes?.("all")&&!s.biomes?.includes?.(biome))return;by.set(s.id,s);});return [...by.values()].sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id),"fr",{sensitivity:"base"}));}
});
BF.LegacyMSCAdjustR6=Object.freeze({version:"legacy-y-r6",lifts});
console.info("[BlueFox R6] Camp Base +1.25 / Reinforced +2.00, rotations historiques inchangées.");
})(window);
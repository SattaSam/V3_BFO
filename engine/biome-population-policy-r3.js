(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{};
const base=BF.BiomeRules;
if(!base?.getMapPopulation||BF.BiomePopulationPolicy?.version==="population-r3")return;
const FAUNA=new Set(["fun_creature","small_creature","brouteur","sauteur","patte_creature","nocturnal_animal","amphibian_species"]);
const CAMP_ONLY=new Set(["camp","base","reinforced_base","base_fire","wood_plane","toile"]);
const DESERT_FORBIDDEN=new Set(["tree","nature_tree","luminescent_tree","crystalline_tree","bush","fern","lunar_vine","pool","spore","lantern_mushrooms","fiber","adaptive_plant","frond"]);
const VOLCANIC_FORBIDDEN=new Set(["tree","nature_tree","luminescent_tree","crystalline_tree","bush","fern","lunar_vine","pool","spore","lantern_mushrooms","fiber"]);
const SPECIAL=new Set(["magnetic","crystalline","atypical","alien"]);
const NATURE=new Set(["forest","plain","swamp","fungal","aquatic","coastal","archipelago"]);
const MINERAL=new Set(["desert","volcanic","magnetic","crystalline","archaeological","ruins"]);
const RARE_PLANTS=new Set(["prismatic_orchid","rare_biological_resource"]);
const RARE_MINERALS=new Set(["stellar_iridium","energy_crystal"]);
const addOrRaise=(arr,type,w)=>{const e=arr.find(x=>x[0]===type);if(e)e[1]=Math.max(e[1],w);else arr.push([type,w]);};
const deterministic=(d)=>{const s=`${d?.id||""}:${d?.seed||""}:${d?.number||""}`;let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0)/4294967296;};
const patch=(def,pop)=>{
 const profile=pop.profileId||def?.profile||"alien";
 const start=!!(def?.isStartingMap||def?.startingMap||def?.id==="crystal"||Number(def?.number)===1);
 let dec=(pop.decorations||[]).map(e=>[e[0],Number(e[1])||0]);
 let rw=(pop.resourceWeights||[]).map(e=>({...e}));
 let rocks=Number(pop.rockCount)||0;
 dec=dec.filter(([t])=>!CAMP_ONLY.has(t));
 if(profile==="desert"){
   dec=dec.filter(([t])=>!DESERT_FORBIDDEN.has(t));
   rw=rw.filter(e=>!["fiber","adaptive_plant","lunar_vine","thermosap_moss"].includes(e.family));
   addOrRaise(dec,"cactus",6); rocks=Math.max(rocks,14);
 } else if(profile==="volcanic"){
   dec=dec.filter(([t])=>!VOLCANIC_FORBIDDEN.has(t));
   rw=rw.filter(e=>!["fiber","lunar_vine"].includes(e.family));
   addOrRaise(dec,"frond",5); addOrRaise(dec,"needle",8); rocks=Math.max(rocks,16);
 }
 if(profile==="plain"){
   dec=dec.filter(([t])=>t!=="nature_tree");
   addOrRaise(dec,"lunar_vine",16); addOrRaise(dec,"bush",15); addOrRaise(dec,"frond",18); addOrRaise(dec,"luminescent_tree",5);
   const tree=dec.find(e=>e[0]==="tree"); if(tree)tree[1]=Math.min(tree[1],5); rocks=Math.min(rocks,6);
 }
 if(profile==="forest"){addOrRaise(dec,"tree",36);addOrRaise(dec,"fern",22);rocks=Math.min(rocks,5);}
 if(profile==="swamp"){addOrRaise(dec,"tree",18);addOrRaise(dec,"fern",24);rocks=Math.min(rocks,4);}
 if(profile==="fungal"){addOrRaise(dec,"lantern_mushrooms",30);rocks=Math.min(rocks,5);}
 if(profile==="frozen"){dec=dec.filter(([t])=>!["spore","lunar_vine","fern"].includes(t));addOrRaise(dec,"nature_tree",5);addOrRaise(dec,"strong_rock",9);}
 if(SPECIAL.has(profile))rw=rw.map(e=>({...e,weight:(RARE_MINERALS.has(e.family)||["magnetic_ore","logic_prism","pulse_core","memory_capsule"].includes(e.family))?e.weight*1.35:e.weight}));
 if(!NATURE.has(profile)&&!SPECIAL.has(profile)){rw=rw.filter(e=>!RARE_PLANTS.has(e.family));dec=dec.filter(([t])=>!RARE_PLANTS.has(t));}
 if(!MINERAL.has(profile)&&!SPECIAL.has(profile))rw=rw.filter(e=>!RARE_MINERALS.has(e.family));
 if(start){dec=dec.filter(([t])=>!FAUNA.has(t)&&!/drone|tech_relic|logic_prism|pulse_core|memory_capsule|stellar_iridium|energy_crystal/.test(t));rw=rw.filter(e=>!/drone|logic_prism|pulse_core|memory_capsule|stellar_iridium|energy_crystal/.test(e.family));}
 if(!["ruins","archaeological"].includes(profile))dec.forEach(e=>{if(["arch","eroded_monolith","stele"].includes(e[0]))e[1]=Math.min(e[1],1);});
 // limit fauna to one or two types per map
 const faunaTypes=[...new Set(dec.filter(([t])=>FAUNA.has(t)).map(([t])=>t))];
 const keep=new Set(faunaTypes.length<=1?faunaTypes:(deterministic(def)<.48?faunaTypes.slice(0,1):faunaTypes.slice(0,2)));
 dec=dec.filter(([t])=>!FAUNA.has(t)||keep.has(t));
 return {...pop,rockCount:rocks,decorations:dec,resourceWeights:Object.freeze(rw.map(Object.freeze)),policyVersion:"population-r3"};
};
const orig=base.getMapPopulation.bind(base);
BF.BiomeRules=Object.freeze({...base,getMapPopulation(def){return patch(def,orig(def));}});
BF.BiomePopulationPolicy=Object.freeze({version:"population-r3"});
})(window);
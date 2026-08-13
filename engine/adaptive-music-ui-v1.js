(function(global){
"use strict";
const BF=global.BlueFox3D=global.BlueFox3D||{};
const VERSION="1.0.0";
let button=null;
let layoutObserver=null;
let layoutFrame=0;
const MENU_GAP=6;
const CONTROL_SIZE=42;
const MENU_LABELS=["inventaire","recherche","reglages","planete","journal","missions"];
function normalizedText(value){
 return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function findMenuBar(){
 if(!document.querySelectorAll)return null;
 const candidates=[];
 document.querySelectorAll("nav,section,div").forEach((element)=>{
  const rect=element.getBoundingClientRect?.();
  if(!rect||rect.width<250||rect.height<40||rect.height>140||rect.bottom<global.innerHeight*.65)return;
  const text=normalizedText(element.textContent);
  const matches=MENU_LABELS.reduce((count,label)=>count+(text.includes(label)?1:0),0);
  if(matches>=5)candidates.push({element,area:rect.width*rect.height});
 });
 candidates.sort((a,b)=>a.area-b.area);
 return candidates[0]?.element||null;
}
function positionControls(){
 layoutFrame=0;
 const controls=[
  document.querySelector?.(".bluefox-camera-button"),
  document.querySelector?.(".bluefox-speech-button"),
  button
 ].filter(Boolean);
 const menu=findMenuBar();
 if(!menu||controls.length<3)return false;
 const top=Math.max(6,Math.round(menu.getBoundingClientRect().top-CONTROL_SIZE-MENU_GAP));
 controls.forEach((control)=>{
  control.style.top=`${top}px`;
  control.style.bottom="auto";
 });
 layoutObserver?.disconnect();
 layoutObserver=null;
 return true;
}
function schedulePosition(){
 if(layoutFrame)return;
 if(global.requestAnimationFrame)layoutFrame=global.requestAnimationFrame(positionControls);
 else positionControls();
}
function watchLayout(){
 positionControls();
 if(!layoutObserver&&global.MutationObserver){
  layoutObserver=new MutationObserver(schedulePosition);
  layoutObserver.observe(document.body,{childList:true,subtree:true});
 }
 global.addEventListener("resize",schedulePosition);
}
function update(){
 const enabled=BF.music?.settings?.enabled!==false;
 if(!button)return;
 button.classList.toggle("disabled",!enabled);
 button.setAttribute("aria-pressed",enabled?"true":"false");
 button.setAttribute("aria-label",enabled?"Couper la musique":"Activer la musique");
 button.title=enabled?"Couper la musique":"Activer la musique";
 button.querySelector("span").textContent=enabled?"🔊":"🔇";
}
function install(){
 if(button||!BF.music)return false;
 button=document.createElement("button");
 button.type="button";
 button.className="bluefox-music-button";
 button.innerHTML="<span>🔊</span>";
 button.addEventListener("click",()=>{
  BF.music.setEnabled(!BF.music.settings.enabled);
  update();
  global.dispatchEvent(new CustomEvent("bluefox:music-toggle",{detail:{enabled:BF.music.settings.enabled}}));
 });
 document.body.appendChild(button);update();watchLayout();return true;
}
function dispose(){
 layoutObserver?.disconnect();layoutObserver=null;
 if(layoutFrame&&global.cancelAnimationFrame)global.cancelAnimationFrame(layoutFrame);
 layoutFrame=0;global.removeEventListener?.("resize",schedulePosition);
 button?.remove();button=null;
}
if(!install())global.addEventListener("bluefox:music-ready",install,{once:true});
BF.MusicUI=Object.freeze({version:VERSION,install,update,dispose});
})(window);

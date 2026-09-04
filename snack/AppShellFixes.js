import React, { useEffect } from "react";
import RetailerAccountBridge from "./RetailerAccountBridge";

const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function closestPressable(node){
  let el=node;
  while(el&&el!==document.body){
    const role=el.getAttribute?.("role");
    if(role==="button"||el.tagName==="BUTTON"||el.onclick)return el;
    el=el.parentElement;
  }
  return node?.parentElement||null;
}

function exactTextNode(text){
  const all=Array.from(document.querySelectorAll("span,div,button,p"));
  return all.find(el=>el.children.length===0&&String(el.textContent||"").trim()===text)||null;
}

function moveGuestButton(){
  const kidsText=exactTextNode("Kids");
  const guestText=Array.from(document.querySelectorAll("span,div,button,p")).find(el=>el.children.length===0&&/^Add guests$|^\d+ guests?$/.test(String(el.textContent||"").trim()));
  if(!kidsText||!guestText)return;
  const kidsBtn=closestPressable(kidsText);
  const guestBtn=closestPressable(guestText);
  if(!kidsBtn||!guestBtn||kidsBtn===guestBtn)return;
  const row=kidsBtn.parentElement;
  if(!row)return;
  if(guestBtn.parentElement!==row||guestBtn.previousElementSibling!==kidsBtn){
    row.insertBefore(guestBtn,kidsBtn.nextSibling);
  }
  Object.assign(guestBtn.style,{
    position:"relative",right:"auto",left:"auto",top:"auto",bottom:"auto",zIndex:"auto",
    marginLeft:"7px",marginRight:"0",padding:"9px 12px",alignSelf:"auto",transform:"none"
  });
  Object.assign(row.style,{display:"flex",flexDirection:"row",flexWrap:"nowrap",alignItems:"center"});
}

function readWorkingPlan(){
  try{
    const raw=window.localStorage.getItem("ows-working-state");
    const state=raw?JSON.parse(raw):{};
    return state?.plan||{};
  }catch{return {}}
}

function findPlanEntryForMeta(el,plan){
  let ancestor=el.parentElement;
  while(ancestor&&ancestor!==document.body){
    const text=String(ancestor.textContent||"");
    for(const day of DAYS){
      if(!text.includes(day))continue;
      const entries=Array.isArray(plan?.[day])?plan[day]:[];
      const match=entries.find(item=>item?.meal&&text.includes(String(item.meal)));
      if(match)return match;
    }
    ancestor=ancestor.parentElement;
  }
  const pageText=String(document.body?.textContent||"");
  for(const day of DAYS){
    for(const item of (plan?.[day]||[])){
      if(item?.meal&&pageText.includes(String(item.meal))&&Number(item?.guestCount||0)>0)return item;
    }
  }
  return null;
}

function updateMealAudienceLabels(){
  if(typeof window==="undefined")return;
  const plan=readWorkingPlan();
  const leaves=Array.from(document.querySelectorAll("span,div,p"));
  leaves.forEach(el=>{
    if(el.children.length)return;
    const text=String(el.textContent||"").trim();
    const match=text.match(/^(.+?)\s*·\s*([0-9.]+)\s+portion units$/i);
    if(!match)return;

    const audience=match[1].trim();
    const units=match[2];
    const people=audience.split(",").map(x=>x.trim()).filter(Boolean);
    const adults=people.filter(x=>/^Adult\b/i.test(x)).length;
    const children=people.filter(x=>/^(Child|Kid)\b/i.test(x)).length;
    const item=findPlanEntryForMeta(el,plan);
    const guests=Math.max(0,Number(item?.guestCount||0));

    if(!adults&&!children&&!guests)return;
    const parts=[];
    if(adults)parts.push(`${adults} adult${adults===1?"":"s"}`);
    if(children)parts.push(`${children} ${children===1?"child":"children"}`);
    if(guests)parts.push(`${guests} guest${guests===1?"":"s"}`);
    const next=`${parts.join(" · ")} · ${units} portion units`;
    if(text!==next)el.textContent=next;
  });
}

function runFixes(){
  moveGuestButton();
  updateMealAudienceLabels();
}

export default function AppShellFixes(){
  useEffect(()=>{
    if(typeof document==="undefined")return;
    let raf=0;
    const run=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(runFixes)};
    const observer=new MutationObserver(run);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["style"]});
    const timer=setInterval(runFixes,400);
    runFixes();
    return()=>{observer.disconnect();clearInterval(timer);cancelAnimationFrame(raf)};
  },[]);
  return <RetailerAccountBridge/>;
}

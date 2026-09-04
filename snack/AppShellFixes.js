import React, { useEffect } from "react";
import RetailerAccountBridge from "./RetailerAccountBridge";

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

export default function AppShellFixes(){
  useEffect(()=>{
    if(typeof document==="undefined")return;
    let raf=0;
    const run=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(moveGuestButton)};
    const observer=new MutationObserver(run);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["style"]});
    const timer=setInterval(moveGuestButton,400);
    moveGuestButton();
    return()=>{observer.disconnect();clearInterval(timer);cancelAnimationFrame(raf)};
  },[]);
  return <RetailerAccountBridge/>;
}

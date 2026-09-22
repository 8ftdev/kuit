import { MotionConfig } from 'motion/react';
import ExpandableMenuNavbar from './ExpandableMenuNavbar';
import { useEffect } from 'react';
export default function Navbar({sections}:{sections:{title?:string;items:{label:string;href:string;meta?:string}[]}[]}) {
 useEffect(() => {
  const destinations:Record<string,string>={a:'/components/',s:'/snippets/',d:'/tools/'};
  const navigate=(event:KeyboardEvent)=>{
   if(event.repeat||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
   if((event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]'))return;
   const href=destinations[event.key.toLowerCase()];
   if(href){event.preventDefault();window.location.assign(href);}
  };
  window.addEventListener('keydown',navigate);
  return ()=>window.removeEventListener('keydown',navigate);
 },[]);
 return <MotionConfig reducedMotion="user"><nav aria-label="Kuit"><ExpandableMenuNavbar brandLabel="kuit" sections={sections} status="Local library" version="v0.1" /></nav></MotionConfig>;
}

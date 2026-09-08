import { useEffect } from 'react'

const bn:Record<string,string>={
 'Search areas, issues or people':'এলাকা, সমস্যা বা মানুষ খুঁজুন','Report issue':'সমস্যা জানান','Home':'হোম','Explore':'খুঁজুন','Browse areas':'এলাকা দেখুন','Issue map':'সমস্যার মানচিত্র','Saved':'সংরক্ষিত','Notifications':'নোটিফিকেশন','My profile':'আমার প্রোফাইল','Community first':'সবার আগে কমিউনিটি','Keep every report factual, respectful and focused on public issues.':'প্রতিটি রিপোর্ট তথ্যভিত্তিক, সম্মানজনক এবং জনসমস্যা-কেন্দ্রিক রাখুন।','Read guidelines →':'নির্দেশনা পড়ুন →','YOUR COMMUNITY FEED':'আপনার কমিউনিটি ফিড','Good morning, Arafat 👋':'সুপ্রভাত, আরাফাত 👋','See what your community is talking about today.':'আজ আপনার কমিউনিটি কী নিয়ে কথা বলছে দেখুন।','Report a problem in your area...':'আপনার এলাকার একটি সমস্যা জানান...','Photo':'ছবি','Location':'লোকেশন','All issues':'সব সমস্যা','Community reports':'কমিউনিটির রিপোর্ট','issues in your feed':'টি সমস্যা আপনার ফিডে','Feed settings':'ফিড সেটিংস','STAY UPDATED':'সর্বশেষ আপডেট','Updates from your reports, followed issues and community.':'আপনার রিপোর্ট, অনুসরণ করা সমস্যা এবং কমিউনিটির আপডেট।','All':'সব','Mentions':'উল্লেখ','Updates':'আপডেট','My recent reports':'আমার সাম্প্রতিক রিপোর্ট','Your published civic issues':'আপনার প্রকাশিত জনসমস্যা','Reports':'রিপোর্ট','About':'পরিচিতি','Edit profile':'প্রোফাইল সম্পাদনা','Edit cover':'কভার ছবি পরিবর্তন','Lives in':'বাসস্থান','Email':'ইমেইল','Phone':'ফোন','Birthday':'জন্মদিন','Work':'কাজ','Education':'শিক্ষা','Take a live photo':'সরাসরি ছবি তুলুন','Live photo evidence':'লাইভ ছবি প্রমাণ','Use my location':'আমার লোকেশন ব্যবহার করুন','Continue':'পরবর্তী','Back':'পেছনে','Publish issue':'রিপোর্ট প্রকাশ করুন','Description':'বিবরণ','Issue title':'সমস্যার শিরোনাম','Category':'ক্যাটাগরি','Severity':'গুরুত্ব','Broken Road':'ভাঙা রাস্তা','Low':'কম','Medium':'মাঝারি','High':'বেশি','Critical':'জরুরি','Admin Panel Login':'অ্যাডমিন প্যানেল লগইন','Username':'ইউজারনেম','Password':'পাসওয়ার্ড','Login':'লগইন','Log out':'লগ আউট'
}

export default function LanguageTranslator(){
 useEffect(()=>{
  let bangla=localStorage.getItem('nv-language')==='bn'
  const originals=new WeakMap<Text,string>()
  const translate=()=>{
   document.documentElement.lang=bangla?'bn':'en'
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT)
   let node:Text|null
   while(node=walker.nextNode() as Text|null){
    const original=originals.get(node)??node.nodeValue??''
    originals.set(node,original)
    const leading=original.match(/^\s*/)?.[0]||'', trailing=original.match(/\s*$/)?.[0]||'', core=original.trim()
    node.nodeValue=leading+(bangla?(bn[core]||core):original.trim())+trailing
   }
   document.querySelectorAll<HTMLElement>('.language').forEach(button=>{
    const text=[...button.childNodes].find(child=>child.nodeType===Node.TEXT_NODE)
    if(text)text.nodeValue=` ${bangla?'English':'বাংলা'}`
   })
  }
  const click=(event:MouseEvent)=>{const button=(event.target as HTMLElement).closest('.language');if(!button)return;bangla=!bangla;localStorage.setItem('nv-language',bangla?'bn':'en');translate()}
  document.addEventListener('click',click)
  setTimeout(translate,0)
  return()=>document.removeEventListener('click',click)
 },[])
 return null
}

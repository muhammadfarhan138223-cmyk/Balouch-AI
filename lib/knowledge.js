import { readFile } from 'node:fs/promises';
export const MAIN = 'https://farhanbalouch.com';
export const PROJECTS = [
 {name:'MovieHub',url:'https://moviehub.farhanbalouch.com'},
 {name:'Nexus AI',url:'https://nexusai.farhanbalouch.com'},
 {name:'Buildora',url:'https://buildora.farhanbalouch.com'},
 {name:'SARAS',url:'https://saras.farhanbalouch.com'},
 {name:'SARAS downloads',url:'https://sarasdownload.farhanbalouch.com'},
 {name:'Farhan Deals',url:'https://farhandeals.store'},
 {name:'Hack AI',url:'https://hackarai.streamlit.app'},
 {name:'Rawi',url:'https://rawi.farhanbalouch.com'},
];
const hosts=new Set([MAIN,...PROJECTS.map(p=>p.url)].map(s=>new URL(s).hostname.replace(/^www\./,'')));
const privatePath=/(?:^|\/)(?:admin|adminpage|login|signin|signup|signout|logout|account|settings|api|auth|checkout|cart|reset-password|verify)(?:\/|$)/i;
export function safePublicUrl(raw,base=MAIN){try{const u=new URL(raw,base);if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.has(u.hostname.replace(/^www\./,''))||privatePath.test(u.pathname))return null;u.search='';return u.href;}catch{return null;}}
export async function publicText(url){
 let target=safePublicUrl(url);if(!target)throw new Error('Outside public source allowlist');
 for(let i=0;i<4;i++){
  const r=await fetch(target,{redirect:'manual',headers:{Accept:'application/json,text/markdown,text/html,text/plain'},signal:AbortSignal.timeout(10000)});
  if(r.status>=300&&r.status<400){const next=safePublicUrl(r.headers.get('location'),target);if(!next||new URL(next).hostname!==new URL(target).hostname)throw new Error('External or private redirect');target=next;continue;}
  if(!r.ok)throw new Error('Source HTTP '+r.status);
  const reader=r.body.getReader(),chunks=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1500000)throw new Error('Source too large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  return {url:target,text:Buffer.concat(chunks).toString('utf8'),type:r.headers.get('content-type')||''};
 }throw new Error('Too many redirects');
}
const clean=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&rsquo;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
export function pageEntry(result,project){
 const {text,url}=result;
 if(/verify you are human|checking your browser|just a moment|access denied|captcha/i.test(text.slice(0,3000)))throw new Error('Public source requires verification');
 const html=/<html|<!doctype/i.test(text);
 const title=html?clean(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||project.name):text.match(/^#\s+(.+)/m)?.[1]||project.name;
 const description=html?(text.match(/<meta\b(?=[^>]*name=["']description["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>/i)?.[1]||''):'';
 const body=html?clean((text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]||'')):text.trim();
 const coverage=html&&body.length<160?'metadata-only':'public-page-snapshot';
 return {id:url,url,title:`${project.name} — ${title}`,kind:'project-page',language:'en',text:[description,body].filter(Boolean).join('\n'),checkedAt:new Date().toISOString(),coverage};
}
export async function crawlProject(project){
 const pages=[],seen=new Set(),queue=[project.url+'/'];
 // Prefer machine-readable public documentation and declared routes; never click buttons or sign in.
 try{const llms=await publicText(project.url+'/llms.txt');if(!/<html|<!doctype/i.test(llms.text)){pages.push(pageEntry(llms,project));for(const m of llms.text.matchAll(/\]\((https:\/\/[^)]+)\)/g)){const u=safePublicUrl(m[1]);if(u&&new URL(u).hostname===new URL(project.url).hostname)queue.push(u);}}}catch{}
 try{const xml=await publicText(project.url+'/sitemap.xml');for(const m of xml.text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)){const u=safePublicUrl(m[1]);if(u&&new URL(u).hostname===new URL(project.url).hostname)queue.push(u);}}catch{}
 const declared=queue.length;
 for(const url of [...new Set(queue)].slice(0,60)){
  if(seen.has(url))continue;seen.add(url);
  try{const result=await publicText(url);const entry=pageEntry(result,project);if(entry.text.length>30)pages.push(entry);}catch{}
 }
 return {project:project.name,url:project.url,checkedAt:new Date().toISOString(),coverage:pages.length?'partial-public-snapshot':'unavailable',pagesRead:pages.length,declaredPages:declared,pageLimit:60,entries:pages};
}
let cache=null,cacheUntil=0,inflight=null;
export async function loadKnowledge(){
 if(cache&&Date.now()<cacheUntil)return cache;
 if(inflight)return inflight;
 inflight=(async()=>{
  const result=await publicText(MAIN+'/site-knowledge.json');
  const main=JSON.parse(result.text);if(main.version!==1||!Array.isArray(main.entries)||!main.entries.length)throw new Error('Site index unavailable');
  let snapshot={projects:[]};try{snapshot=JSON.parse(await readFile(new URL('../data/project-knowledge.json',import.meta.url),'utf8'));}catch{}
  const entries=main.entries.filter(e=>safePublicUrl(e.url)&&typeof e.text==='string');
  for(const project of snapshot.projects||[]){
    entries.push({id:'registry-'+project.project,url:project.url,title:project.project,kind:'project-registry',language:'en',text:`Registered project: ${project.project}. Website: ${project.url}. Public source coverage: ${project.coverage}. Last checked: ${project.checkedAt}. Internal features are not verified by this listing.`,checkedAt:project.checkedAt,coverage:project.coverage});
    for(const entry of project.entries||[])if(safePublicUrl(entry.url))entries.push(entry);
  }
  cache={entries,indexedAt:main.generatedAt,revision:main.revision,projects:snapshot.projects?.map(({entries,...p})=>p)||[]};cacheUntil=Date.now()+30000;return cache;
 })();try{return await inflight;}finally{inflight=null;}
}
const stop=new Set('the and for are what where how does this that with from about please tell mujhe mujhy mera meri mery kya kiya hai ha hy yr yar ka ki ko ky ke se mein main per par kar do kahan'.split(' '));
const words=s=>s.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu)||[];
export function retrieve(data,query,{language='en',limit=7}={}){
 let expanded=query.toLowerCase();
 for(const [pattern,extra]of [[/movie\s*hub|movies?/,' movie hub films'],[/kahani|kahaani|zindagi|biography/,' story journey'],[/latest|recent|new|naya|naye|updates/,' blog stories update'],[/shorts/,' shorts coming soon'],[/buildora/,' builder website'],[/saras/,' saras companion assistant']])if(pattern.test(expanded))expanded+=extra;
 const tokens=[...new Set(words(expanded).filter(w=>w.length>1&&!stop.has(w)))];
 if(!tokens.length)return [];
 const latest=/latest|recent|new|naya|naye/.test(query.toLowerCase());
 const ranked=[];
 for(const entry of data.entries){
  const title=entry.title.toLowerCase(),url=entry.url.toLowerCase();
  const lines=entry.text.match(/[\s\S]{1,1400}(?:\s|$)/g)||[entry.text];
  for(let i=0;i<lines.length;i++){
   const text=lines[i],lower=text.toLowerCase();let score=0;
   for(const word of tokens){if(title.includes(word))score+=8;if(url.includes(word))score+=3;score+=Math.min(5,lower.split(word).length-1);}
   if(score===0)continue;
   if(entry.language===language)score+=2;
   if(entry.kind==='project-page')score+=2;
   if(latest&&['blog','stories'].includes(entry.kind))score+=5+Math.max(0,3-(Date.now()-Date.parse(entry.publishedAt||0))/86400000/30);
   ranked.push({...entry,id:entry.id+'#part-'+i,text,score});
  }
 }
 return ranked.sort((a,b)=>b.score-a.score).filter((e,i,a)=>a.findIndex(x=>x.url===e.url&&x.language===e.language)===i).slice(0,limit);
}
export function sourcesFor(entries){const seen=new Set();return entries.filter(e=>!seen.has(e.url)&&seen.add(e.url)).map(e=>({title:e.title,url:e.url,checkedAt:e.checkedAt,coverage:e.coverage||'published-site-copy'}));}
export function verifiedQuote(raw,entries){
 try{const answer=JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g,''));const source=entries.find(e=>e.id===answer.sourceId);const quote=typeof answer.quote==='string'?answer.quote.trim():'';if(!source||quote.length<8||quote.length>460||!source.text.includes(quote))return null;return {reply:quote,sources:sourcesFor([source]),verifiedExcerpt:true};}catch{return null;}
}

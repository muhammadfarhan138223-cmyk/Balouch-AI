import { loadKnowledge } from '../lib/knowledge.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Use GET.'});
 try{const k=await loadKnowledge();return res.status(200).json({site:'https://farhanbalouch.com',siteIndexedAt:k.indexedAt,liveRefresh:!k.isStale,revision:k.revision,publicEntries:k.entries.length,projects:k.projects,limits:'Public pages only. Project snapshots are partial, dated and refreshed every three hours; private accounts and internal functions are not indexed.'});}
 catch{return res.status(503).json({error:'The current public index is unavailable.'});}
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { safePublicUrl,retrieve,verifiedQuote } from '../lib/knowledge.js';
test('public source fetches exclude private routes, external hosts and credentials',()=>{
 for(const u of ['https://evil.example/x','http://farhanbalouch.com','https://farhanbalouch.com/admin','https://rawi.farhanbalouch.com/api/chat','https://user:pass@farhanbalouch.com/','https://saras.farhanbalouch.com/settings'])assert.equal(safePublicUrl(u),null);
 assert.equal(safePublicUrl('/blog/a?token=private'),'https://farhanbalouch.com/blog/a');
});
const entries=[{id:'movie',url:'https://moviehub.farhanbalouch.com/',title:'MovieHub',kind:'project',language:'en',text:'MovieHub is a movie discovery website.'},{id:'story',url:'https://farhanbalouch.com/story/school',title:'School memories',kind:'story',language:'en',text:'A real school memory in Ahmadpur East.'}];
test('retrieval selects actual source addresses and finds text beyond the old global cutoff',()=>{
 assert.equal(retrieve({entries},'Movie Hub kahan hai')[0].url,entries[0].url);
 const long={...entries[1],text:'Earlier memories. '.repeat(4000)+'A rare school trophy was received in Islamabad.'};
 assert.ok(retrieve({entries:[long]},'rare trophy Islamabad').some(x=>x.text.includes('rare school trophy')));
});
test('quick answers reject invented text or invented source IDs',()=>{
 assert.equal(verifiedQuote(JSON.stringify({sourceId:'fake',quote:entries[0].text}),entries),null);
 assert.equal(verifiedQuote(JSON.stringify({sourceId:'movie',quote:'MovieHub has unlimited free streaming.'}),entries),null);
 const result=verifiedQuote(JSON.stringify({sourceId:'movie',quote:entries[0].text}),entries);
 assert.equal(result.reply,entries[0].text);assert.equal(result.sources[0].url,entries[0].url);
});

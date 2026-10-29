// Public GET-only source sync. No browser, sign-in, private admin or arbitrary URLs.
import { writeFile } from 'node:fs/promises';
import { PROJECTS, crawlProject, publicText, MAIN } from './lib/knowledge.js';
const main=JSON.parse((await publicText(MAIN+'/site-knowledge.json')).text);
if(main.version!==1||!main.entries?.length)throw new Error('Public website index is unavailable; keeping existing knowledge.');
const projects=await Promise.all(PROJECTS.map(crawlProject));
await writeFile('data/project-knowledge.json',JSON.stringify({generatedAt:new Date().toISOString(),mainIndexedAt:main.generatedAt,site:main,projects},null,2)+'\n');
console.log(JSON.stringify(projects.map(({entries,...p})=>p),null,2));

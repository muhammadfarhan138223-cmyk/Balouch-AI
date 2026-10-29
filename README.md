# RAWI

## Public website and project knowledge

`lib/knowledge.js` fetches the current `https://farhanbalouch.com/site-knowledge.json` at request time with a 30-second cache. The personal-site build regenerates that index from the actual published page copy, project data and complete English/Hinglish/Urdu writing. No global character cutoff hides later chapters. Retrieval searches chunks across all indexed text and returns real source addresses.

`sync.js` runs public GET-only requests to the explicitly listed project domains every three hours. It reads the available public `llms.txt`, sitemap and declared pages, up to 60 pages per project. It never signs in, opens private admin/account/API paths or follows off-allowlist redirects. Public projects that cannot be read are marked unavailable. JavaScript-only pages may provide metadata only. A snapshot does not prove runtime feature availability, and this system does not claim complete knowledge of every project or private account.

The existing `/api/chat` remains compatible with the Rawi app. Normal replies use retrieved passages and display source URLs. `mode: "quick"` powers the small main-site guide: the model must select a source ID and a short verbatim excerpt, and the server rejects invented IDs or text not present in the supplied passage. `/api/knowledge-status` reports public index freshness and project coverage. Main-site updates are read without waiting for the project crawl; external project snapshots remain dated.

Provider keys stay in the existing Vercel environment. No browser or new provider key is required by the site guide. Run `node --test tests/*.test.mjs` to validate source boundaries, long-document retrieval and quote verification.

const fs = require("fs");

async function fetchWebsiteData() {
  try {
    const res = await fetch("https://farhanbalouch.com");
    const html = await res.text();

    let cleanText = html
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const fileContent = `// Auto-generated knowledge file from farhanbalouch.com\nexport const websiteKnowledge = ${JSON.stringify(cleanText)};\n`;

    fs.writeFileSync("data/knowledge.js", fileContent);
    console.log("Knowledge file successfully updated!");
  } catch (err) {
    console.error("Error fetching website:", err);
    process.exit(1);
  }
}

fetchWebsiteData();

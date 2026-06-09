const https = require("https");
const fs = require("fs");

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`)); }
            });
            res.on("error", reject);
        }).on("error", reject);
    });
}

function extractGithubPath(url) {
    if (!url) return null;
    const match = url.match(/github\.com\/([^/]+\/[^/?#]+)/);
    return match ? match[1].replace(/\.git$/, "") : null;
}

function generateReadme(tools, siteUrl) {
    const byCategory = {};
    for (const tool of tools) {
        const cat = tool.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(tool);
    }

    const categories = Object.keys(byCategory).sort();
    const count = tools.length;

    let md = `# ToolIndex — Homelab Tools\n\n`;
    md += `> A curated list of **${count} homelab tools**, automatically synced from [ToolIndex](${siteUrl}).\n`;
    md += `> **Submit a tool:** [${siteUrl}/submit](${siteUrl}/submit)\n\n`;
    md += `## Categories\n\n`;

    for (const cat of categories) {
        md += `### ${cat}\n\n`;
        const sorted = byCategory[cat].sort((a, b) => a.name.localeCompare(b.name));
        for (const tool of sorted) {
            const githubPath = extractGithubPath(tool.github_url);
            const badge = githubPath
                ? ` ![GitHub stars](https://img.shields.io/github/stars/${githubPath}?style=flat-square)`
                : "";
            const links = [];
            if (tool.github_url) links.push(`[GitHub](${tool.github_url})`);
            if (tool.website_url && tool.website_url !== tool.github_url) links.push(`[Website](${tool.website_url})`);
            const linkStr = links.length ? `  \n  ${links.join(" · ")}` : "";
            md += `- **${tool.name}**${badge}  \n  ${tool.description}${linkStr}\n\n`;
        }
    }

    md += `---\n\n*Last synced: ${new Date().toISOString().split("T")[0]}*\n`;
    return md;
}

async function main() {
    const siteUrl = (process.env.TOOLINDEX_API_URL || "").replace(/\/+$/, "");
    if (!siteUrl) throw new Error("TOOLINDEX_API_URL environment variable is required");

    console.log(`Fetching from ${siteUrl}/api/export/tools ...`);
    const tools = await fetchJSON(`${siteUrl}/api/export/tools`);
    console.log(`Got ${tools.length} tools`);

    fs.writeFileSync("tools.json", JSON.stringify(tools, null, 2) + "\n");
    fs.writeFileSync("README.md", generateReadme(tools, siteUrl));

    console.log("Generated README.md and tools.json");
}

main().catch((e) => { console.error(e); process.exit(1); });

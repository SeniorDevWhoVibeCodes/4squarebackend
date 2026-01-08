import * as fs from "node:fs";
import * as path from "node:path";

const filePath = path.join(process.cwd(), "server", "market-manager.ts");
const content = fs.readFileSync(filePath, "utf-8");

const versionMatch = content.match(/const SCHEMA_VERSION = (\d+);/);

if (versionMatch) {
    const currentVersion = parseInt(versionMatch[1]);
    const nextVersion = currentVersion + 1;
    const newContent = content.replace(
        `const SCHEMA_VERSION = ${currentVersion};`,
        `const SCHEMA_VERSION = ${nextVersion};`
    );
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Bumped SCHEMA_VERSION from ${currentVersion} to ${nextVersion}`);
} else {
    console.error("❌ Could not find SCHEMA_VERSION in market-manager.ts");
    process.exit(1);
}

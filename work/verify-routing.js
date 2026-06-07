const fs = require("fs");
const path = require("path");

const root = process.cwd();
const requiredFiles = [
  "app/layout.tsx",
  "app/page.tsx",
  "package.json",
  "next.config.js"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing required Next.js routing file: ${file}`);
  }
}

const page = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
if (!/export\s+default\s+function\s+\w+/.test(page) && !/export\s+default\s+\w+/.test(page)) {
  throw new Error("app/page.tsx must export a default component.");
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const script of ["dev", "build", "start"]) {
  if (!pkg.scripts || typeof pkg.scripts[script] !== "string" || !pkg.scripts[script].includes("next")) {
    throw new Error(`package.json must include a valid Next.js ${script} script.`);
  }
}

require(path.join(root, "next.config.js"));

console.log("Routing check passed: app/page.tsx is the homepage and Next.js config/scripts are valid.");

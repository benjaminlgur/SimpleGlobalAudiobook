const fs = require("node:fs");
const path = require("node:path");

const appJson = require("./app.json");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const workspaceRoot = path.resolve(__dirname, "../..");
parseEnvFile(path.join(workspaceRoot, ".env.local"));
parseEnvFile(path.join(workspaceRoot, ".env"));

module.exports = () => ({
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra ?? {}),
    hostedConvexUrl: process.env.EXPO_PUBLIC_HOSTED_CONVEX_URL ?? "",
  },
});

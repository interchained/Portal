/**
 * portal deploy — build and prepare deployment artifacts.
 *
 * Adapters: static | node | docker
 */

import { writeFile, access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import ora from "ora";
import { execa } from "execa";
import prompts from "prompts";
import { banner, header, success, fail, info, step, blank } from "../utils/print.js";

export type DeployAdapter = "static" | "node" | "docker";

export interface DeployOptions {
  adapter?: DeployAdapter;
  outDir?: string;
  tag?: string;
}

const DOCKERFILE = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx vite build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "dist/server.js"]
`;

const SERVER_ENTRY = `import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.static(join(__dirname, ".")));
app.get("*", (_req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

createServer(app).listen(PORT, () => {
  console.log(\`Portal app running on port \${PORT}\`);
});
`;

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function deployCommand(opts: DeployOptions = {}): Promise<void> {
  banner();

  const root = process.cwd();

  let adapter = opts.adapter;
  if (!adapter) {
    const { chosen } = await prompts({
      type: "select",
      name: "chosen",
      message: "Choose deployment adapter:",
      choices: [
        { title: `${pc.bold("static")}  ${pc.dim("— CDN / Netlify / Vercel / S3")}`,   value: "static" },
        { title: `${pc.bold("node")}    ${pc.dim("— Node.js server (Express)")}`,        value: "node"   },
        { title: `${pc.bold("docker")}  ${pc.dim("— Docker container (self-hosted)")}`,  value: "docker" },
      ],
    });
    adapter = chosen as DeployAdapter;
  }

  if (!adapter) { blank(); return; }

  header(`Deploying: ${pc.bold(adapter)}`);
  blank();

  // Always build first
  step("Building production bundle…");
  try {
    await execa("npx", ["vite", "build", "--outDir", opts.outDir ?? "dist"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: "1" },
    });
    success("Build complete");
  } catch {
    fail("Build failed — fix errors before deploying");
    process.exit(1);
  }

  blank();

  if (adapter === "static") {
    success("Static build ready in dist/");
    info("Deploy dist/ to any static host: Netlify, Vercel, S3, Cloudflare Pages, or rsync.");

  } else if (adapter === "node") {
    // Write server entry if missing
    const serverPath = join(root, "dist", "server.js");
    if (!(await exists(serverPath))) {
      step("Writing Node.js server entry (dist/server.js)…");
      await writeFile(serverPath, SERVER_ENTRY, "utf-8");
      success("dist/server.js written");
    }
    info("Run: node dist/server.js");
    info("Set PORT env var to choose the port (default 3000).");

  } else if (adapter === "docker") {
    const dockerfilePath = join(root, "Dockerfile");
    if (!(await exists(dockerfilePath))) {
      step("Writing Dockerfile…");
      await writeFile(dockerfilePath, DOCKERFILE, "utf-8");
      success("Dockerfile written");
    } else {
      info("Dockerfile already exists — using existing one");
    }
    const tag = opts.tag ?? "portal-app:latest";
    step(`Building Docker image: ${tag}…`);
    try {
      await execa("docker", ["build", "-t", tag, "."], {
        cwd: root,
        stdio: "inherit",
      });
      success(`Docker image built: ${tag}`);
      info(`Run: docker run -p 3000:3000 ${tag}`);
    } catch {
      console.log(pc.yellow("⚠ Docker build failed — make sure Docker is running"));
      info("Dockerfile written to project root — build manually when ready.");
    }
  }

  blank();
}

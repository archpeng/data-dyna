#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const srcRoot = path.join(repoRoot, "src");

const toProjectPath = (absolutePath) => path.relative(repoRoot, absolutePath).split(path.sep).join("/");

const rules = [
  {
    id: "contracts-no-business-modules",
    description: "src/contracts must not import project business modules.",
    matches: ({ sourceModule, targetModule }) => sourceModule === "contracts" && targetModule !== "contracts",
  },
  {
    id: "ingestion-no-downstream-modules",
    description: "src/ingestion must not import snapshots, benchmarks, agent, merchant-review, or evidence.",
    matches: ({ sourceModule, targetModule }) =>
      sourceModule === "ingestion" && ["snapshots", "benchmarks", "agent", "merchant-review", "evidence"].includes(targetModule),
  },
  {
    id: "projections-no-downstream-modules",
    description: "src/projections must not import snapshots, benchmarks, agent, merchant-review, or evidence.",
    matches: ({ sourceModule, targetModule }) =>
      sourceModule === "projections" && ["snapshots", "benchmarks", "agent", "merchant-review", "evidence"].includes(targetModule),
  },
  {
    id: "snapshots-no-agent-review-evidence",
    description: "src/snapshots must not import agent, merchant-review, or evidence.",
    matches: ({ sourceModule, targetModule }) =>
      sourceModule === "snapshots" && ["agent", "merchant-review", "evidence"].includes(targetModule),
  },
  {
    id: "benchmarks-no-agent-review-evidence",
    description: "src/benchmarks must not import agent, merchant-review, or evidence.",
    matches: ({ sourceModule, targetModule }) =>
      sourceModule === "benchmarks" && ["agent", "merchant-review", "evidence"].includes(targetModule),
  },
  {
    id: "agent-no-ingestion-stores",
    description: "src/agent must not import ingestion stores or I/O handlers.",
    matches: ({ sourceModule, targetModule }) => sourceModule === "agent" && targetModule === "ingestion",
  },
  {
    id: "agent-no-projection-rebuild-internals",
    description: "src/agent must not import projection rebuild internals.",
    matches: ({ sourceModule, targetModule }) => sourceModule === "agent" && targetModule === "projections",
  },
  {
    id: "evidence-no-agent-sidecar-runtime",
    description: "src/evidence must not import the agent sidecar runtime; use plan schemas/types instead.",
    matches: ({ sourceModule, targetPath }) => sourceModule === "evidence" && targetPath === "src/agent/agent-sidecar.ts",
  },
];

if (process.argv.includes("--list-rules")) {
  for (const rule of rules) {
    console.log(`${rule.id}: ${rule.description}`);
  }
  process.exit(0);
}

function findSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findSourceFiles(absolutePath);
      if (entry.isFile() && /\.[cm]?tsx?$/.test(entry.name)) return [absolutePath];
      return [];
    })
    .sort();
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function collectImports(source) {
  const imports = [];
  const staticImportOrExport = /^\s*(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gm;
  const dynamicImport = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

  for (const match of source.matchAll(staticImportOrExport)) {
    imports.push({ specifier: match[1], line: lineNumberAt(source, match.index ?? 0) });
  }

  for (const match of source.matchAll(dynamicImport)) {
    imports.push({ specifier: match[1], line: lineNumberAt(source, match.index ?? 0) });
  }

  return imports;
}

function resolveRelativeImport(sourceFile, specifier) {
  if (!specifier.startsWith(".")) return undefined;

  const resolved = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.tsx`,
    `${resolved}.mts`,
    `${resolved}.cts`,
    path.join(resolved, "index.ts"),
    path.join(resolved, "index.tsx"),
  ];

  const targetFile = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!targetFile) return undefined;

  const relativeToSrc = path.relative(srcRoot, targetFile);
  if (relativeToSrc.startsWith("..") || path.isAbsolute(relativeToSrc)) return undefined;

  return toProjectPath(targetFile);
}

function moduleName(projectPath) {
  const parts = projectPath.split("/");
  return parts[0] === "src" ? parts[1] : undefined;
}

const sourceFiles = findSourceFiles(srcRoot);
const violations = [];
let checkedImports = 0;

for (const sourceFile of sourceFiles) {
  const source = fs.readFileSync(sourceFile, "utf8");
  const sourcePath = toProjectPath(sourceFile);
  const sourceModule = moduleName(sourcePath);

  for (const imported of collectImports(source)) {
    const targetPath = resolveRelativeImport(sourceFile, imported.specifier);
    if (!targetPath) continue;

    checkedImports += 1;
    const targetModule = moduleName(targetPath);

    for (const rule of rules) {
      if (rule.matches({ sourceModule, sourcePath, targetModule, targetPath })) {
        violations.push({
          rule,
          sourcePath,
          targetPath,
          specifier: imported.specifier,
          line: imported.line,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:");
  for (const violation of violations) {
    console.error(
      `- ${violation.sourcePath}:${violation.line} imports ${violation.specifier} -> ${violation.targetPath} [${violation.rule.id}] ${violation.rule.description}`,
    );
  }
  process.exit(1);
}

console.log(
  `Architecture boundary check passed: ${sourceFiles.length} source files, ${checkedImports} project imports, ${rules.length} rules.`,
);

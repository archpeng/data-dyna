#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rootFlagIndex = process.argv.indexOf("--root");
const repoRoot = rootFlagIndex >= 0 ? path.resolve(process.argv[rootFlagIndex + 1] ?? "") : path.resolve(import.meta.dirname, "..");

if (rootFlagIndex >= 0 && !process.argv[rootFlagIndex + 1]) {
  console.error("Missing value for --root");
  process.exit(2);
}

const planDir = path.join(repoRoot, "docs", "plan");
const readmePath = path.join(planDir, "README.md");
const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function section(text, heading) {
  const headingPattern = `^## ${escapeRegExp(heading)}\\s*$`;
  const match = text.match(new RegExp(headingPattern, "m"));
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const next = rest.search(/^## /m);
  return next >= 0 ? rest.slice(0, next) : rest;
}

function firstBacktickListItem(text, sectionName) {
  const body = section(text, sectionName);
  if (!body) return null;
  return body.match(/^- `([^`]+)`/m)?.[1] ?? null;
}

function activePackFiles(readme) {
  const body = section(readme, "Active Pack");
  if (!body) return [];
  return [...body.matchAll(/^- `docs\/plan\/([^`]+_(?:PLAN|STATUS|WORKSET)\.md)`/gm)].map((match) => match[1]);
}

function parseStageOrder(text) {
  return [...text.matchAll(/^- \[([ xX])] `([^`]+)`/gm)].map((match) => ({
    done: match[1].toLowerCase() === "x",
    id: match[2],
  }));
}

function parseActiveStage(text) {
  const activeSection = section(text, "Active Stage");
  if (!activeSection) return { id: null, owner: null, state: null, priority: null, body: null };
  return {
    id: activeSection.match(/^### `([^`]+)`/m)?.[1] ?? null,
    owner: activeSection.match(/^- Owner: `([^`]+)`/m)?.[1] ?? null,
    state: activeSection.match(/^- State: `([^`]+)`/m)?.[1] ?? null,
    priority: activeSection.match(/^- Priority: `([^`]+)`/m)?.[1] ?? null,
    body: activeSection,
  };
}

function allActiveSteps(text) {
  return [...text.matchAll(/^- active_step: `([^`]+)`/gm)].map((match) => match[1]);
}

function immediateFocus(text) {
  const body = section(text, "Immediate Focus");
  if (!body) return { id: null, owner: null, state: null, priority: null, body: null };
  return {
    id: body.match(/^### `([^`]+)`/m)?.[1] ?? null,
    owner: body.match(/^- Owner: `([^`]+)`/m)?.[1] ?? null,
    state: body.match(/^- State: `([^`]+)`/m)?.[1] ?? null,
    priority: body.match(/^- Priority: `([^`]+)`/m)?.[1] ?? null,
    body,
  };
}

function planBlock(planText, id) {
  const headerPattern = new RegExp("^#### `" + escapeRegExp(id) + "`.*$", "m");
  const match = planText.match(headerPattern);
  if (!match || match.index === undefined) return null;
  const rest = planText.slice(match.index);
  const next = rest.slice(match[0].length).search(/^#### `|^## /m);
  return next >= 0 ? rest.slice(0, match[0].length + next) : rest;
}

function checkRequiredMarkers(label, body, markers) {
  for (const marker of markers) {
    if (!body?.includes(marker)) fail(`${label} missing required marker ${marker}`);
  }
}

if (!fs.existsSync(readmePath)) {
  fail("docs/plan/README.md is missing");
} else {
  const readme = readText(readmePath);
  const activeFiles = activePackFiles(readme);
  const currentActiveSlice = firstBacktickListItem(readme, "Current Active Slice");
  const intendedHandoff = firstBacktickListItem(readme, "Intended Handoff");

  if (activeFiles.length !== 3) fail(`README Active Pack must list exactly 3 pack files, found ${activeFiles.length}`);
  const roles = new Set(activeFiles.map((file) => file.match(/_(PLAN|STATUS|WORKSET)\.md$/)?.[1]).filter(Boolean));
  for (const role of ["PLAN", "STATUS", "WORKSET"]) {
    if (!roles.has(role)) fail(`README Active Pack missing ${role} file`);
  }
  if (!currentActiveSlice) fail("README Current Active Slice is missing");
  if (!intendedHandoff) fail("README Intended Handoff is missing");

  const activePlan = activeFiles.find((file) => file.endsWith("_PLAN.md"));
  const activeStatus = activeFiles.find((file) => file.endsWith("_STATUS.md"));
  const activeWorkset = activeFiles.find((file) => file.endsWith("_WORKSET.md"));

  for (const file of activeFiles) {
    if (!fs.existsSync(path.join(planDir, file))) fail(`README Active Pack file does not exist: ${file}`);
  }

  if (activePlan && activeStatus && activeWorkset && activeFiles.every((file) => fs.existsSync(path.join(planDir, file)))) {
    const planText = readText(path.join(planDir, activePlan));
    const statusText = readText(path.join(planDir, activeStatus));
    const worksetText = readText(path.join(planDir, activeWorkset));
    const activeStage = parseActiveStage(worksetText);
    const focus = immediateFocus(statusText);
    const stageOrder = parseStageOrder(worksetText);
    const pending = stageOrder.filter((stage) => !stage.done);

    if (currentActiveSlice !== activeStage.id) fail(`README active slice ${currentActiveSlice} does not match WORKSET active stage ${activeStage.id}`);
    for (const step of allActiveSteps(statusText)) {
      if (step !== currentActiveSlice) fail(`STATUS active_step ${step} does not match README active slice ${currentActiveSlice}`);
    }
    for (const step of allActiveSteps(worksetText)) {
      if (step !== currentActiveSlice) fail(`WORKSET machine active_step ${step} does not match README active slice ${currentActiveSlice}`);
    }
    if (focus.id && focus.id !== currentActiveSlice) fail(`STATUS Immediate Focus ${focus.id} does not match README active slice ${currentActiveSlice}`);
    if (focus.owner && activeStage.owner && focus.owner !== activeStage.owner) fail(`STATUS focus owner ${focus.owner} does not match WORKSET owner ${activeStage.owner}`);
    if (focus.state && activeStage.state && focus.state !== activeStage.state) fail(`STATUS focus state ${focus.state} does not match WORKSET state ${activeStage.state}`);

    if (currentActiveSlice === "PACK_COMPLETE") {
      if (pending.length > 0) fail(`active PACK_COMPLETE is illegal while active WORKSET has pending stages: ${pending.map((stage) => stage.id).join(", ")}`);
      if (activeStage.owner !== "closeout") fail(`PACK_COMPLETE active owner must be closeout, found ${activeStage.owner}`);
      if (activeStage.state !== "DONE") fail(`PACK_COMPLETE active state must be DONE, found ${activeStage.state}`);
      if (!["autopilot-closeout", "closeout"].includes(intendedHandoff ?? "")) fail(`PACK_COMPLETE intended handoff must be closeout/autopilot-closeout, found ${intendedHandoff}`);
    } else {
      const ordered = stageOrder.find((stage) => stage.id === currentActiveSlice);
      if (!ordered) fail(`active slice ${currentActiveSlice} is not listed in active WORKSET Stage Order`);
      if (ordered?.done) fail(`active slice ${currentActiveSlice} is already checked done in active WORKSET Stage Order`);
      if (intendedHandoff !== activeStage.owner) fail(`README intended handoff ${intendedHandoff} does not match active stage owner ${activeStage.owner}`);
      const block = planBlock(planText, currentActiveSlice ?? "");
      if (!block) fail(`active PLAN missing slice block for ${currentActiveSlice}`);
      checkRequiredMarkers(`active PLAN block ${currentActiveSlice}`, block, ["- Owner:", "- State:", "- Priority:", "目标：", "交付物：", "done_when:", "stop_boundary:", "必须避免："]);
      checkRequiredMarkers(`active WORKSET stage ${currentActiveSlice}`, activeStage.body, ["- Owner:", "- State:", "- Priority:", "目标：", "必须交付：", "done_when:", "stop_boundary:", "必须避免："]);
      checkRequiredMarkers(`active STATUS focus ${currentActiveSlice}`, focus.body, ["- Owner:", "- State:", "- Priority:", "目标：", "必须交付：", "done_when:", "stop_boundary:", "必须避免："]);
    }
  }
}

const worksetFiles = fs.readdirSync(planDir).filter((file) => file.endsWith("_WORKSET.md")).sort();

for (const worksetFile of worksetFiles) {
  const prefix = worksetFile.replace(/_WORKSET\.md$/, "");
  const planFile = `${prefix}_PLAN.md`;
  const statusFile = `${prefix}_STATUS.md`;
  const worksetPath = path.join(planDir, worksetFile);
  const planPath = path.join(planDir, planFile);
  const statusPath = path.join(planDir, statusFile);

  if (!fs.existsSync(planPath)) fail(`${worksetFile} has no matching ${planFile}`);
  if (!fs.existsSync(statusPath)) fail(`${worksetFile} has no matching ${statusFile}`);
  if (!fs.existsSync(planPath) || !fs.existsSync(statusPath)) continue;

  const worksetText = readText(worksetPath);
  const planText = readText(planPath);
  const statusText = readText(statusPath);
  const stageOrder = parseStageOrder(worksetText);
  const statusStages = parseStageOrder(statusText);
  const activeStage = parseActiveStage(worksetText);
  const pending = stageOrder.filter((stage) => !stage.done);
  const statusSteps = allActiveSteps(statusText);
  const worksetSteps = allActiveSteps(worksetText);

  if (stageOrder.length === 0) fail(`${worksetFile} Stage Order has no checklist items`);
  if (!activeStage.id) fail(`${worksetFile} missing Active Stage ID`);
  if (statusStages.length > 0 && statusStages.map((stage) => `${stage.done}:${stage.id}`).join("|") !== stageOrder.map((stage) => `${stage.done}:${stage.id}`).join("|")) {
    fail(`${statusFile} Planned Stages checklist does not match ${worksetFile} Stage Order`);
  }
  if (activeStage.id === "PACK_COMPLETE") {
    if (pending.length > 0) fail(`${worksetFile} is PACK_COMPLETE but has pending stages: ${pending.map((stage) => stage.id).join(", ")}`);
    if (activeStage.owner !== "closeout" || activeStage.state !== "DONE") fail(`${worksetFile} PACK_COMPLETE must be owner closeout and state DONE`);
  } else {
    if (!stageOrder.some((stage) => stage.id === activeStage.id)) fail(`${worksetFile} Active Stage ${activeStage.id} is not in Stage Order`);
    const block = planBlock(planText, activeStage.id);
    if (!block) fail(`${planFile} missing active slice block ${activeStage.id}`);
  }

  for (const stage of stageOrder) {
    if (!planBlock(planText, stage.id)) fail(`${planFile} missing Stage Order slice block ${stage.id}`);
  }
  for (const step of [...statusSteps, ...worksetSteps]) {
    if (step !== activeStage.id) fail(`${prefix} machine active_step ${step} does not match WORKSET Active Stage ${activeStage.id}`);
  }
}

if (failures.length > 0) {
  console.error("Plan control-plane check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Plan control-plane check passed: README plus ${worksetFiles.length} workset pack(s).`);

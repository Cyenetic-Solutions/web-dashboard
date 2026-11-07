#!/usr/bin/env node
import { readFileSync, renameSync, writeFileSync } from "node:fs";

const file = process.env.ROLLOUT_STATE_FILE;
const state = JSON.parse(readFileSync(file, "utf8"));
const args = process.argv.slice(2);
state.calls.push(args);
function finish(output = "", code = 0) {
  writeFileSync(`${file}.next`, JSON.stringify(state));
  renameSync(`${file}.next`, file);
  if (output) process.stdout.write(`${output}\n`);
  process.exit(code);
}
if (args[0] === "ps") {
  if (!args.includes("label=com.docker.compose.project=cyenetic-dashboard") ||
    !args.includes("label=com.docker.compose.service=app")) finish("Unscoped Docker query", 1);
  if (state.scenario === "ps-failure") finish("Docker unavailable", 1);
  const status = args.find((arg) => arg.startsWith("status="))?.slice(7);
  finish(Object.entries(state.containers).filter(([, container]) => container.scoped &&
    (status ? container.status === status : args[1] === "-q" ? container.status === "running" : true))
    .map(([id]) => id).join("\n"));
}
if (args[0] === "compose") {
  if (args.includes("config")) finish("", state.scenario === "config-failure" ? 1 : 0);
  if (args.includes("build")) finish("", state.scenario === "build-failure" ? 1 : 0);
  if (args.includes("up")) {
    if (state.scenario === "no-candidate") finish();
    const unhealthy = state.scenario === "unhealthy";
    state.containers.new = {
      scoped: true, status: state.scenario === "exited" ? "exited" : "running",
      health: unhealthy ? "unhealthy" : state.scenario === "timeout" ? "starting"
        : state.scenario === "missing-health" ? "missing" : "healthy",
      image: state.scenario === "wrong-image" ? "wrong:release" : state.expectedImage, checks: 0,
    };
    if (state.scenario === "multiple-candidates") state.containers["new-bad"] = { ...state.containers.new, health: "unhealthy" };
    finish("", state.scenario === "up-failure" ? 1 : 0);
  }
}
if (args[0] === "inspect") {
  const id = args.at(-1);
  const container = state.containers[id];
  if (!container) finish("Container disappeared", 1);
  if (args[2].includes("Config.Image")) finish(container.image);
  container.checks = (container.checks ?? 0) + 1;
  if (state.scenario === "stability-failure" && container.checks > 1) container.health = "unhealthy";
  if (state.scenario === "starting-then-ready" && container.checks < 3) finish("running starting");
  finish(`${container.status} ${container.health}`);
}
if (args[0] === "stop") {
  if (state.scenario === "stop-failure") finish("Unable to stop old replica", 1);
  for (const id of args.slice(3)) state.containers[id].status = "exited";
  finish();
}
if (args[0] === "rm") {
  for (const id of args.slice(1).filter((arg) => arg !== "-f")) delete state.containers[id];
  finish();
}
if (args[0] === "logs") finish("Mock replica startup log");
finish(`Unexpected Docker command: ${args.join(" ")}`, 1);

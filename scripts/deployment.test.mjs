import assert from "node:assert/strict";
import { chmodSync, copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const expectedImage = `cyenetic-dashboard:${"a".repeat(40)}`;
const original = { scoped: true, status: "running", health: "healthy", image: "previous:release" };
function fixture(scenario, oldCount = 1, stale = false) {
  const directory = mkdtempSync(path.join(tmpdir(), "cyenetic-rollout-"));
  const file = path.join(directory, "state.json");
  const containers = { unrelated: { ...original, scoped: false } };
  for (let i = 0; i < oldCount; i++) containers[`old-${i}`] = { ...original };
  if (stale) containers.stale = { ...original, status: "exited" };
  writeFileSync(file, JSON.stringify({ scenario, expectedImage, containers, calls: [] }));
  copyFileSync("tests/fixtures/rollout-docker.mjs", path.join(directory, "docker"));
  writeFileSync(path.join(directory, "sleep"), "#!/bin/sh\nexit 0\n");
  for (const command of ["docker", "sleep"]) chmodSync(path.join(directory, command), 0o700);
  return {
    run() {
      const result = spawnSync("bash", ["scripts/rollout.sh", expectedImage,
        "--project-name", "cyenetic-dashboard", "-f", "compose.yaml"], {
        encoding: "utf8", timeout: 60000,
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, COMPOSE_PROJECT_NAME: "cyenetic-dashboard", ROLLOUT_STATE_FILE: file },
      });
      return { result, state: JSON.parse(readFileSync(file, "utf8")) };
    },
    retry() { const state = JSON.parse(readFileSync(file, "utf8")); state.scenario = "healthy"; writeFileSync(file, JSON.stringify(state)); },
    interruptible() {
      writeFileSync(path.join(directory, "sleep"), "#!/bin/sh\nexec /bin/sleep 60\n");
      return spawn("bash", ["scripts/rollout.sh", expectedImage, "--project-name", "cyenetic-dashboard", "-f", "compose.yaml"], {
        detached: true, stdio: "ignore",
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, COMPOSE_PROJECT_NAME: "cyenetic-dashboard", ROLLOUT_STATE_FILE: file },
      });
    },
    state() { return JSON.parse(readFileSync(file, "utf8")); },
    cleanup() { rmSync(directory, { recursive: true, force: true }); },
  };
}

for (const [name, count, stale] of [["first deployment", 0, false], ["one existing replica", 1, false],
  ["multiple replicas", 3, false], ["stale failed replica", 1, true], ["starting-then-ready", 1, false]]) {
  test(`rollout succeeds with ${name}`, () => {
    const context = fixture(name === "starting-then-ready" ? name : "healthy", count, stale);
    try {
      const { result, state } = context.run();
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(Object.keys(state.containers).sort(), ["new", "unrelated"]);
      const up = state.calls.find((call) => call.includes("up"));
      assert.ok(up.includes("--no-recreate") && up.includes(`app=${count + 1}`));
      const stopIndex = state.calls.findIndex((call) => call[0] === "stop");
      const healthIndex = state.calls.findLastIndex((call) => call[0] === "inspect");
      if (count) assert.ok(stopIndex > healthIndex, "old replicas stop only after final health check");
    } finally { context.cleanup(); }
  });
}

for (const scenario of ["ps-failure", "config-failure", "build-failure", "up-failure", "no-candidate", "wrong-image",
  "missing-health", "exited", "unhealthy", "timeout", "stability-failure", "multiple-candidates"]) {
  test(`rollout preserves the prior release on ${scenario}`, () => {
    const context = fixture(scenario);
    try {
      const { result, state } = context.run();
      assert.notEqual(result.status, 0);
      assert.deepEqual(state.containers["old-0"], original);
      assert.deepEqual(Object.keys(state.containers).sort(), ["old-0", "unrelated"]);
      assert.ok(!state.calls.some((call) => call[0] === "stop"));
    } finally { context.cleanup(); }
  });
}

test("a failed attempt can be retried without leaving candidate replicas", () => {
  const context = fixture("up-failure");
  try {
    assert.notEqual(context.run().result.status, 0);
    context.retry();
    assert.equal(context.run().result.status, 0);
  } finally { context.cleanup(); }
});

test("cleanup failure after cutover never removes the healthy replacement", () => {
  const context = fixture("stop-failure");
  try {
    const { result, state } = context.run();
    assert.notEqual(result.status, 0);
    assert.equal(state.containers.new.health, "healthy");
    assert.deepEqual(state.containers["old-0"], original);
  } finally { context.cleanup(); }
});

test("interrupted readiness removes the candidate and keeps the prior release", async () => {
  const context = fixture("timeout");
  const child = context.interruptible();
  try {
    for (let attempt = 0; attempt < 50 && !context.state().containers.new?.checks; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(context.state().containers.new?.checks, "candidate reached readiness polling");
    await new Promise((resolve) => setTimeout(resolve, 100));
    const exited = once(child, "exit");
    process.kill(-child.pid, "SIGTERM");
    const [code] = await exited;
    assert.equal(code, 143);
    assert.deepEqual(Object.keys(context.state().containers).sort(), ["old-0", "unrelated"]);
  } finally {
    if (child.exitCode === null) process.kill(-child.pid, "SIGKILL");
    context.cleanup();
  }
});

const valid = { DEPLOY_PATH: "/opt/web/dashboard", COMPOSE_FILE: "compose.yaml", COMPOSE_PROJECT_NAME: "cyenetic-dashboard",
  APP_IMAGE_NAME: "cyenetic-dashboard", COMMIT_SHA: "a".repeat(40), RELEASE_SUFFIX: "1-2" };
function validate(overrides) {
  return spawnSync("bash", ["-c", 'source scripts/deploy-config.sh; validate_release_config'], {
    encoding: "utf8", env: { ...process.env, ...valid, ...overrides },
  });
}
test("deployment config accepts the default isolated root", () => assert.equal(validate({}).status, 0));
for (const [key, value] of [["DEPLOY_PATH", "/opt/web"], ["DEPLOY_PATH", "/opt/web/../other"],
  ["DEPLOY_PATH", "/opt/web/dashboard/nested"], ["COMPOSE_FILE", "../../compose.yaml"], ["COMPOSE_FILE", "file.yml;touch x"],
  ["COMPOSE_PROJECT_NAME", "-other"], ["APP_IMAGE_NAME", "x;echo bad"], ["APP_IMAGE_NAME", "invalid..image"], ["COMMIT_SHA", "bad"], ["RELEASE_SUFFIX", "1;echo bad"]]) {
  test(`rejects unsafe deployment ${key}=${value}`, () => assert.notEqual(validate({ [key]: value }).status, 0));
}

test("SSH config accepts IPv4/IPv6 and rejects invalid ports, options, and empty credentials", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "cyenetic-ssh-validation-"));
  const key = path.join(directory, "key"); const hosts = path.join(directory, "hosts");
  writeFileSync(key, "fixture"); writeFileSync(hosts, "fixture");
  const base = { VPS_HOST: "127.0.0.1", VPS_USER: "deploy", VPS_PORT: "22", SSH_KEY_FILE: key, SSH_KNOWN_HOSTS_FILE: hosts };
  function check(overrides) {
    return spawnSync("bash", ["-c", 'source scripts/deploy-config.sh; validate_ssh_config'], {
      env: { ...process.env, ...base, ...overrides }, encoding: "utf8",
    }).status;
  }
  try {
    for (const VPS_HOST of ["127.0.0.1", "deploy.example.com", "2001:db8::1"]) assert.equal(check({ VPS_HOST }), 0);
    for (const VPS_PORT of ["0", "65536", "999999999999999", "abc", "22;echo x"]) assert.notEqual(check({ VPS_PORT }), 0);
    assert.notEqual(check({ VPS_HOST: "-oProxyCommand=bad" }), 0);
    assert.notEqual(check({ VPS_USER: "root;echo bad" }), 0);
    assert.notEqual(check({ SSH_KEY_FILE: path.join(directory, "missing") }), 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

function validateDashboardUrl(NEXT_PUBLIC_API_URL) {
  return spawnSync("bash", ["-c", 'source scripts/deploy-config.sh; validate_dashboard_config'], {
    encoding: "utf8", env: { ...process.env, NEXT_PUBLIC_API_URL },
  });
}
test("dashboard deployment accepts an HTTPS API origin", () => {
  assert.equal(validateDashboardUrl("https://api.cyenetic.com").status, 0);
  assert.equal(validateDashboardUrl("https://api.cyenetic.com/v1").status, 0);
});
for (const NEXT_PUBLIC_API_URL of ["http://api.cyenetic.com", "https://api.example.com;touch x", "https://api.example.com/../other"]) {
  test(`dashboard deployment rejects unsafe API URL ${NEXT_PUBLIC_API_URL}`, () => {
    assert.notEqual(validateDashboardUrl(NEXT_PUBLIC_API_URL).status, 0);
  });
}

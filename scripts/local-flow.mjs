import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const composeFile = join(repositoryRoot, "deploy", "docker-compose.yml");
const localRoot = join(repositoryRoot, ".local", "flows");

const profiles = {
  setup: {
    name: "setup",
    project: "gallery-local-setup",
    port: 3500,
    password: "local-setup-password-2026",
  },
  demo: {
    name: "demo",
    project: "gallery-local-demo",
    port: 3501,
    password: "local-demo-password-2026",
  },
};

const command = process.argv[2];
if (!["setup", "demo", "verify"].includes(command)) {
  console.error(
    "Usage: npm run local:setup | npm run local:demo | npm run test:local:flows",
  );
  process.exit(1);
}

if (command === "verify") {
  await verifyProfile(profiles.setup);
  await verifyProfile(profiles.demo);
  console.log("Local setup and demo Docker flows passed.");
  process.exit(0);
}

const profile = profiles[command];
const state = prepareProfile(profile);
const setupToken = createSetupToken(profile.name);
const environment = createEnvironment(profile, state, setupToken);

runCompose(profile, environment, ["up", "-d", "--build"]);
await waitForReady(profile);

if (command === "demo") {
  const seed = runDemoSeed(profile, environment);
  const securedEnvironment = { ...environment, SETUP_TOKEN: "" };
  runCompose(profile, securedEnvironment, ["up", "-d"]);
  await waitForReady(profile);
  console.log(`Gallery demo is ready at http://127.0.0.1:${profile.port}`);
  console.log(`Admin: http://127.0.0.1:${profile.port}/login`);
  console.log(`Password: ${profile.password}`);
  console.log(
    `Visitor gallery: http://127.0.0.1:${profile.port}${seed.sharePath}`,
  );
  console.log(`State: ${state.root}`);
  console.log(
    `Stop: docker compose -f deploy/docker-compose.yml -p ${profile.project} down`,
  );
} else {
  console.log(
    `Fresh Gallery setup is ready at http://127.0.0.1:${profile.port}/setup`,
  );
  console.log(`Setup token: ${setupToken}`);
  console.log("Create the administrator through the setup screen.");
  console.log(`State: ${state.root}`);
  console.log(
    `Stop: docker compose -f deploy/docker-compose.yml -p ${profile.project} down`,
  );
}

async function verifyProfile(profile) {
  const state = prepareProfile(profile);
  const setupToken = createSetupToken(`${profile.name}-verify`);
  const environment = createEnvironment(profile, state, setupToken);
  try {
    runCompose(profile, environment, ["up", "-d", "--build"]);
    await waitForReady(profile);

    if (profile.name === "demo") {
      const seed = runDemoSeed(profile, environment);
      if (seed.photoCount !== 4) {
        throw new Error(
          `Demo seed reported ${seed.photoCount ?? 0} photos instead of 4`,
        );
      }
    } else {
      const setup = await fetchJson(
        `http://127.0.0.1:${profile.port}/api/auth/setup`,
        {
          method: "POST",
          headers: {
            "X-Setup-Token": setupToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: profile.password }),
        },
      );
      if (setup.status !== 201) {
        throw new Error(`Setup flow returned HTTP ${setup.status}`);
      }
      const secondSetup = await fetchJson(
        `http://127.0.0.1:${profile.port}/api/auth/setup`,
        {
          method: "POST",
          headers: {
            "X-Setup-Token": setupToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: profile.password }),
        },
      );
      if (secondSetup.status !== 409) {
        throw new Error(`Setup re-entry returned HTTP ${secondSetup.status}`);
      }
    }
    console.log(`✓ local ${profile.name} flow`);
  } finally {
    runCompose(profile, environment, ["down"]);
    rmSync(state.root, { recursive: true, force: true });
  }
}

function prepareProfile(profile) {
  const root = join(localRoot, profile.name);
  const environment = createEnvironment(profile, { root }, "");
  runCompose(profile, environment, ["down"]);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(join(root, "data"), { recursive: true });
  mkdirSync(join(root, "photos"), { recursive: true });
  return { root, data: join(root, "data"), photos: join(root, "photos") };
}

function createEnvironment(profile, state, setupToken) {
  return {
    ...process.env,
    GALLERY_DATA_DIR: state.data ?? join(state.root, "data"),
    GALLERY_PHOTOS_DIR: state.photos ?? join(state.root, "photos"),
        GALLERY_PORT: String(profile.port),
        CORS_ORIGIN: `http://127.0.0.1:${profile.port}`,
        COOKIE_SECURE: 'false',
        SETUP_TOKEN: setupToken,
  };
}

function createSetupToken(label) {
  return `local-${label}-setup-${randomBytes(18).toString("hex")}`;
}

function runCompose(profile, environment, args) {
  const result = spawnSync(
    "docker",
    ["compose", "-f", composeFile, "-p", profile.project, ...args],
    {
      cwd: repositoryRoot,
      env: environment,
      stdio: "inherit",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runDemoSeed(profile, environment) {
  const result = spawnSync(
    process.execPath,
    [join(repositoryRoot, "apps", "api", "scripts", "seed-local-demo.mjs")],
    {
      cwd: repositoryRoot,
      env: {
        ...environment,
        LOCAL_DEMO_URL: `http://127.0.0.1:${profile.port}`,
        LOCAL_DEMO_PASSWORD: profile.password,
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  const output = result.stdout.trim().split("\n").at(-1);
  if (!output) throw new Error("Demo seed returned no result");
  return JSON.parse(output);
}

async function waitForReady(profile) {
  const url = `http://127.0.0.1:${profile.port}/api/ready`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The container may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Gallery did not become ready at ${url}`);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let body = {};
  try {
    body = await response.json();
  } catch {
    // Preserve the status for useful flow failures even when the response is not JSON.
  }
  return { status: response.status, body };
}

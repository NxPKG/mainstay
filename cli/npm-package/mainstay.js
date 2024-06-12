#!/usr/bin/env node
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const { arch, platform } = require("os");
const { version } = require("./package.json");

const PACKAGE_VERSION = `mainstay-cli ${version}`;
const PACKAGE_MAINSTAY_PATH = path.join(__dirname, "mainstay");

function getBinaryVersion(location) {
  const result = spawnSync(location, ["--version"]);
  const error =
    (result.error && result.error.toString()) ||
    (result.stderr.length > 0 && result.stderr.toString().trim()) ||
    null;
  return [error, result.stdout && result.stdout.toString().trim()];
}

function runMainstay(location) {
  const args = process.argv.slice(2);
  const mainstay = spawn(location, args, { stdio: "inherit" });
  mainstay.on("exit", (code, signal) => {
    process.on("exit", () => {
      if (signal) {
        process.kill(process.pid, signal);
      } else {
        process.exit(code);
      }
    });
  });

  process.on("SIGINT", function () {
    mainstay.kill("SIGINT");
    mainstay.kill("SIGTERM");
  });
}

function tryPackageMainstay() {
  if (arch() !== "x64" || platform() !== "linux") {
    console.error(`Only x86_64 / Linux distributed in NPM package right now.`);
    return false;
  }

  const [error, binaryVersion] = getBinaryVersion(PACKAGE_MAINSTAY_PATH);
  if (error !== null) {
    console.error(`Failed to get version of local binary: ${error}`);
    return false;
  }
  if (binaryVersion !== PACKAGE_VERSION) {
    console.error(
      `Package binary version is not correct. Expected "${PACKAGE_VERSION}", found "${binaryVersion}".`
    );
    return false;
  }

  runMainstay(PACKAGE_MAINSTAY_PATH);
  return true;
}

function trySystemMainstay() {
  console.error("Trying globally installed mainstay.");

  const absolutePath = process.env.PATH.split(":")
    .filter((dir) => dir !== path.dirname(process.argv[1]))
    .find((dir) => {
      try {
        fs.accessSync(`${dir}/mainstay`, fs.constants.X_OK);
      } catch {
        return false;
      }
      return true;
    });

  if (!absolutePath) {
    console.error(`Could not find globally installed mainstay, install with cargo.`);
    process.exit();
  }

  const absoluteBinaryPath = `${absolutePath}/mainstay`;

  const [error, binaryVersion] = getBinaryVersion(absoluteBinaryPath);
  if (error !== null) {
    console.error(`Failed to get version of global binary: ${error}`);
    return;
  }
  if (binaryVersion !== PACKAGE_VERSION) {
    console.error(
      `Globally installed mainstay version is not correct. Expected "${PACKAGE_VERSION}", found "${binaryVersion}".`
    );
    return;
  }

  runMainstay(absoluteBinaryPath);
}

tryPackageMainstay() || trySystemMainstay();

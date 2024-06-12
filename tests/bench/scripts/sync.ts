/**
 * Sync all saved data by re-running the tests for each version.
 *
 * This script should be used when the bench program or its tests has changed
 * and all data needs to be updated.
 */

import path from "path";

import {
  MAINSTAY_VERSION_ARG,
  BenchData,
  LockFile,
  Toml,
  VersionManager,
  runMainstayTest,
  spawn,
} from "./utils";

(async () => {
  const bench = await BenchData.open();

  const cargoToml = await Toml.open(
    path.join("..", "programs", "bench", "Cargo.toml")
  );
  const mainstayToml = await Toml.open(path.join("..", "Mainstay.toml"));

  for (const version of bench.getVersions()) {
    console.log(`Updating '${version}'...`);

    const isUnreleased = version === "unreleased";

    // Use the lock file from cache
    await LockFile.replace(version);

    // Set active solana version
    VersionManager.setSolanaVersion(bench.get(version).solanaVersion);

    // Update the mainstay dependency versions
    for (const dependency of ["lang", "spl"]) {
      cargoToml.replaceValue(`mainstay-${dependency}`, () => {
        return isUnreleased
          ? `{ path = "../../../../${dependency}" }`
          : `"${version}"`;
      });
    }

    // Save Cargo.toml
    await cargoToml.save();

    // Update `mainstay test` command to pass version in Mainstay.toml
    mainstayToml.replaceValue(
      "test",
      (cmd) => {
        return cmd.includes(MAINSTAY_VERSION_ARG)
          ? cmd.replace(
              new RegExp(`\\s*${MAINSTAY_VERSION_ARG}\\s+(.+)`),
              (arg, ver) => (isUnreleased ? "" : arg.replace(ver, version))
            )
          : `${cmd} ${MAINSTAY_VERSION_ARG} ${version}`;
      },
      { insideQuotes: true }
    );

    // Save Mainstay.toml
    await mainstayToml.save();

    // Run the command to update the current version's results
    const result = runMainstayTest();

    // Check failure
    if (result.status !== 0) {
      console.error("Please fix the error and re-run this command.");
      process.exitCode = 1;
      return;
    }
  }

  // Sync markdown files
  spawn("mainstay", ["run", "sync-markdown"]);
})();

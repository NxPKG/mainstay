# Benchmark tests

The bench program and its tests are used to measure the performance of Mainstay programs.

## How

We run the same tests that measure some metric for each Mainstay version starting from `0.27.0`. If the difference between the results is greater than 1%, the new data will be saved in `bench.json` and Markdown files in [/bench](https://github.com/nxpkg/mainstay/tree/master/bench) will be updated accordingly.

## Scripts

| :memo: TL;DR                                                                                                                   |
| :----------------------------------------------------------------------------------------------------------------------------- |
| If you've made changes to programs or tests in this directory, run `mainstay run sync`, otherwise run `mainstay test --skip-lint`. |

`mainstay test --skip-lint`: Run all tests and update benchmark files when necessary. This is the only command that needs to be run for most use cases.

---

The following scripts are useful when making changes to how benchmarking works.

`mainstay run sync`: Sync all benchmark files by running tests for each version. If you've made changes to the bench program or its tests, you should run this command to sync the results.

`mainstay run sync-markdown`: Sync Markdown files in [/bench](https://github.com/nxpkg/mainstay/tree/master/bench) based on the data from `bench.json`.

`mainstay run generate-ix`: Generate program instructions with repetitive accounts.

---

The following script is only for the maintainer(s) of Mainstay.

`mainstay run bump-version -- --mainstay-version <VERSION>`: Bump the version in all benchmark files.

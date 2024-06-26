---
title: Installation
description: Mainstay - Installation
---

## Rust

Go [here](https://www.rust-lang.org/tools/install) to install Rust.

{% callout title="You should know!" %}
We recommend reading chapters 1-9 of the [Rust book](https://doc.rust-lang.org/book/title-page.html) which cover the basics of using Rust (Most of the time you don't need advanced Rust to write mainstay programs).
{% /callout %}

## Solana

Go [here](https://docs.solana.com/cli/install-solana-cli-tools) to install Solana and then run `solana-keygen new` to create a keypair at the default location. Mainstay uses this keypair to run your program tests.

{% callout title="You should know!" %}
We also recommend checking out the official [Solana developers page](https://solana.com/developers).
{% /callout %}

## Yarn

Go [here](https://yarnpkg.com/getting-started/install) to install Yarn.

## Mainstay

### Installing using Mainstay version manager (avm) (recommended)

Mainstay version manager is a tool for using multiple versions of the mainstay-cli. It will require the same dependencies as building from source. It is recommended you uninstall the NPM package if you have it installed.

Install `avm` using Cargo. Note this will replace your `mainstay` binary if you had one installed.

```shell
cargo install --git https://github.com/nxpkg/mainstay avm --locked --force
```

On Linux systems you may need to install additional dependencies if cargo install fails. E.g. on Ubuntu:

```shell
sudo apt-get update && sudo apt-get upgrade && sudo apt-get install -y pkg-config build-essential libudev-dev libssl-dev
```

Install the latest version of the CLI using `avm`, and then set it to be the version to use.

```shell
avm install latest
avm use latest
```

Verify the installation.

```shell
mainstay --version
```

### Install using pre-build binary on x86_64 Linux

Mainstay binaries are available via an NPM package [`@nx-pkg/mainstay-cli`](https://www.npmjs.com/package/@nx-pkg/mainstay-cli). Only `x86_64` Linux is supported currently, you must build from source for other OS'.

### Build from source for other operating systems without avm

We can also use Cargo to install the CLI directly. Make sure that the `--tag` argument uses the version you want (the version here is just an example).

```shell
cargo install --git https://github.com/nxpkg/mainstay --tag v0.30.0 mainstay-cli --locked
```

On Linux systems you may need to install additional dependencies if cargo install fails. On Ubuntu,

```shell
sudo apt-get update && sudo apt-get upgrade && sudo apt-get install -y pkg-config build-essential libudev-dev
```

Now verify the CLI is installed properly.

```shell
mainstay --version
```

---
title: Publishing Source
description: Mainstay - Publishing Source
---

The Mainstay Program Registry at [apr.dev](https://apr.dev)
hosts a catalog of verified programs on Solana both written with and without Mainstay. It is recommended
that authors of smart contracts publish their source to promote best
practices for security and transparency.

---

{% callout title="Note" %}
The Mainstay Program Registry is currently in alpha testing. For access to publishing
please ask on [Discord](https://discord.gg/NHHGSXAnXk).
{% /callout %}

## Getting Started

The process for publishing is mostly identical to `crates.io`.

- Signup for an account [here](https://apr.dev).
- Navigate to your Profile on the top navbar.
- Click "Generate New Access Token".
- Run `mainstay login <token>` at the command line.

And you're ready to interact with the registry.

## Configuring a Build

Whether your program is written in Mainstay or not, all source being published must
have an `Mainstay.toml` to define the build.

An example `Mainstay.toml` config looks as follows,

```toml
[toolchain]
mainstay_version = "0.30.0"
solana_version = "1.18.8"

[workspace]
members = ["programs/multisig"]

[provider]
cluster = "mainnet"
wallet = "~/.config/solana/id.json"

[programs.mainnet]
multisig = "A9HAbnCwoD6f2NkZobKFf6buJoN9gUVVvX5PoUnDHS6u"

[programs.localnet]
multisig = "A9HAbnCwoD6f2NkZobKFf6buJoN9gUVVvX5PoUnDHS6u"
```

Here there are four sections.

1. `[toolchain]` (optional) - sets the Mainstay and Solana version to use. By default, the builder will use the current versions.
2. `[workspace]` (optional) - sets the paths--relative to the `Mainstay.toml`--
   to all programs in the local
   workspace, i.e., the path to the `Cargo.toml` manifest associated with each
   program that can be compiled by the `mainstay` CLI. For programs using the
   standard Mainstay workflow, this can be omitted. For programs not written in Mainstay
   but still want to publish, this should be added.
3. `[provider]` - configures the wallet and cluster settings. Here, `mainnet` is used because the registry only supports `mainnet` binary verification at the moment.
4. `[programs.mainnet]` - configures each program in the workspace, providing
   the `address` of the program to verify.

{% callout title="Note" %}
When defining program in `[programs.mainnet]`, make sure the name provided
matches the **lib** name for your program, which is defined
by your program's `Cargo.toml`.
{% /callout %}

### Examples

#### Mainstay Program

An example of a toml file for an Mainstay program can be found [here](https://www.apr.dev/program/22Y43yTVxuUkoRKdm9thyRhQ3SdgQS7c7kB6UNCiaczD/build/2).

#### Non Mainstay Program

An example of a toml file for a non-mainstay program can be found [here](https://www.apr.dev/program/9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin/build/1).

## Publishing

To publish to the Mainstay Program Registry, change directories to the `Mainstay.toml`
defined root and run

```shell
mainstay publish <program-name>
```

where `<program-name>` is as defined in `[programs.mainnet]`, i.e., `multisig`
in the example above.

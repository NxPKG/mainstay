<div>

  <h1>Mainstay</h1>

  <p>
    <strong>Solana Sealevel Framework</strong>
  </p>

  <p>
    <a href="https://github.com/nxpkg/mainstay/actions"><img alt="Build Status" src="https://github.com/nxpkg/mainstay/actions/workflows/tests.yaml/badge.svg" /></a>
    <a href="https://mainstay-lang.com"><img alt="Tutorials" src="https://img.shields.io/badge/docs-tutorials-blueviolet" /></a>
    <a href="https://discord.gg/NHHGSXAnXk"><img alt="Discord Chat" src="https://img.shields.io/discord/889577356681945098?color=blueviolet" /></a>
    <a href="https://opensource.org/licenses/Apache-2.0"><img alt="License" src="https://img.shields.io/github/license/nxpkg/mainstay?color=blueviolet" /></a>
  </p>
</div>

Mainstay is a framework for Solana's [Sealevel](https://medium.com/solana-labs/sealevel-parallel-processing-thousands-of-smart-contracts-d814b378192) runtime providing several convenient developer tools for writing smart contracts.

- Rust eDSL for writing Solana programs
- [IDL](https://en.wikipedia.org/wiki/Interface_description_language) specification
- TypeScript package for generating clients from IDL
- CLI and workspace management for developing complete applications

If you're familiar with developing in Ethereum's [Solidity](https://docs.soliditylang.org/en/v0.7.4/), [Truffle](https://www.trufflesuite.com/), [web3.js](https://github.com/ethereum/web3.js), then the experience will be familiar. Although the DSL syntax and semantics are targeted at Solana, the high level flow of writing RPC request handlers, emitting an IDL, and generating clients from IDL is the same.

## Getting Started

For a quickstart guide and in depth tutorials, see the [mainstay book](https://book.mainstay-lang.com) and the older [documentation](https://mainstay-lang.com) that is being phased out.
To jump straight to examples, go [here](https://github.com/nxpkg/mainstay/tree/master/examples). For the latest Rust and TypeScript API documentation, see [docs.rs](https://docs.rs/mainstay-lang) and the [typedoc](https://nxpkg.github.io/mainstay/ts/index.html).

## Packages

| Package                 | Description                                              | Version                                                                                                                          | Docs                                                                                                            |
| :---------------------- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `mainstay-lang`           | Rust primitives for writing programs on Solana           | [![Crates.io](https://img.shields.io/crates/v/mainstay-lang?color=blue)](https://crates.io/crates/mainstay-lang)                     | [![Docs.rs](https://docs.rs/mainstay-lang/badge.svg)](https://docs.rs/mainstay-lang)                                |
| `mainstay-spl`            | CPI clients for SPL programs on Solana                   | [![crates](https://img.shields.io/crates/v/mainstay-spl?color=blue)](https://crates.io/crates/mainstay-spl)                          | [![Docs.rs](https://docs.rs/mainstay-spl/badge.svg)](https://docs.rs/mainstay-spl)                                  |
| `mainstay-client`         | Rust client for Mainstay programs                          | [![crates](https://img.shields.io/crates/v/mainstay-client?color=blue)](https://crates.io/crates/mainstay-client)                    | [![Docs.rs](https://docs.rs/mainstay-client/badge.svg)](https://docs.rs/mainstay-client)                            |
| `@nx-pkg/mainstay`     | TypeScript client for Mainstay programs                    | [![npm](https://img.shields.io/npm/v/@nx-pkg/mainstay.svg?color=blue)](https://www.npmjs.com/package/@nx-pkg/mainstay)         | [![Docs](https://img.shields.io/badge/docs-typedoc-blue)](https://nxpkg.github.io/mainstay/ts/index.html)     |
| `@nx-pkg/mainstay-cli` | CLI to support building and managing an Mainstay workspace | [![npm](https://img.shields.io/npm/v/@nx-pkg/mainstay-cli.svg?color=blue)](https://www.npmjs.com/package/@nx-pkg/mainstay-cli) | [![Docs](https://img.shields.io/badge/docs-typedoc-blue)](https://nxpkg.github.io/mainstay/cli/commands.html) |

## Note

- **Mainstay is in active development, so all APIs are subject to change.**
- **This code is unaudited. Use at your own risk.**

## Examples

Here's a counter program, where only the designated `authority`
can increment the count.

```rust
use mainstay_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
mod counter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, start: u64) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = *ctx.accounts.authority.key;
        counter.count = start;
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 48)]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut, has_one = authority)]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Counter {
    pub authority: Pubkey,
    pub count: u64,
}
```

For more, see the [examples](https://github.com/nxpkg/mainstay/tree/master/examples)
and [tests](https://github.com/nxpkg/mainstay/tree/master/tests) directories.

## License

Mainstay is licensed under [Apache 2.0](./LICENSE).

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in Mainstay by you, as defined in the Apache-2.0 license, shall be
licensed as above, without any additional terms or conditions.

## Contribution

Thank you for your interest in contributing to Mainstay!
Please see the [CONTRIBUTING.md](./CONTRIBUTING.md) to learn how.

### Thanks ❤️

<div>
  <a href="https://github.com/nxpkg/mainstay/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=nxpkg/mainstay" width="100%" />
  </a>
</div>

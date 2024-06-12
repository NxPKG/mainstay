#!/bin/bash

active_version=$(solana -V | awk '{print $2}')
if [ "$active_version" != "1.18.8" ]; then
  solana-install init 1.18.8
fi

git submodule update --init --recursive --depth 1
cd ts/packages/borsh && yarn --frozen-lockfile && yarn build && yarn link --force && cd ../../../
cd ts/packages/mainstay-errors && yarn --frozen-lockfile && yarn build && yarn link --force && cd ../../../
cd ts/packages/mainstay && yarn --frozen-lockfile && yarn build:node && yarn link && cd ../../../
cd ts/packages/spl-associated-token-account && yarn --frozen-lockfile && yarn build:node && yarn link && cd ../../../
cd ts/packages/spl-token && yarn --frozen-lockfile && yarn build:node && yarn link && cd ../../../
cd examples/tutorial && yarn link @nx-pkg/mainstay @nx-pkg/borsh && yarn --frozen-lockfile && cd ../../
cd tests && yarn link @nx-pkg/mainstay @nx-pkg/borsh @nx-pkg/spl-associated-token-account @nx-pkg/spl-token && yarn --frozen-lockfile && cd ..
cargo install --path cli mainstay-cli --locked --force --debug

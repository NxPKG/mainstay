#!/usr/bin/env node

// Script to list a market, logging the address to stdout.

const utils = require("../tests/utils");
const fs = require("fs");
const mainstay = require("@nx-pkg/mainstay");
const provider = mainstay.MainstayProvider.local();
// hack so we don't have to update serum-common library
// to the new MainstayProvider class and Provider interface
provider.send = provider.sendAndConfirm;

async function main() {
  ORDERBOOK_ENV = await utils.initMarket({
    provider,
  });
  const out = {
    market: ORDERBOOK_ENV.marketA._decoded.ownAddress.toString(),
  };
  console.log(JSON.stringify(out));
}

main();

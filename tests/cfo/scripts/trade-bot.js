#!/usr/bin/env node

// Script to infinitely post orders that are immediately filled.

const process = require("process");
const mainstay = require("@nx-pkg/mainstay");
const PublicKey = mainstay.web3.PublicKey;
const { runTradeBot } = require("../tests/utils");

async function main() {
  const market = new PublicKey(process.argv[2]);
  const provider = mainstay.MainstayProvider.local();
  runTradeBot(market, provider);
}

main();

const assert = require("assert");
const mainstay = require("@nx-pkg/mainstay");

describe("basic-4", () => {
  const provider = mainstay.MainstayProvider.local();

  // Configure the client to use the local cluster.
  mainstay.setProvider(provider);

  const program = mainstay.workspace.Basic4,
    counterSeed = mainstay.utils.bytes.utf8.encode("counter");

  let counterPubkey;

  before(async () => {
    [counterPubkey] = await mainstay.web3.PublicKey.findProgramAddress(
      [counterSeed],
      program.programId
    );
  });

  it("Is runs the constructor", async () => {
    // Initialize the program's state struct.
    await program.methods
      .initialize()
      .accounts({
        counter: counterPubkey,
        authority: provider.wallet.publicKey,
        systemProgram: mainstay.web3.SystemProgram.programId,
      })
      .rpc();

    // Fetch the state struct from the network.
    const counterAccount = await program.account.counter.fetch(counterPubkey);

    assert.ok(counterAccount.count.eq(new mainstay.BN(0)));
  });

  it("Executes a method on the program", async () => {
    await program.methods
      .increment()
      .accounts({
        counter: counterPubkey,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const counterAccount = await program.account.counter.fetch(counterPubkey);
    assert.ok(counterAccount.count.eq(new mainstay.BN(1)));
  });
});

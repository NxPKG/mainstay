const assert = require("assert");
const mainstay = require("@nx-pkg/mainstay");
const { SystemProgram } = mainstay.web3;

describe("basic-2", () => {
  const provider = mainstay.MainstayProvider.local();

  // Configure the client to use the local cluster.
  mainstay.setProvider(provider);

  // Counter for the tests.
  const counter = mainstay.web3.Keypair.generate();

  // Program for the tests.
  const program = mainstay.workspace.Basic2;

  it("Creates a counter", async () => {
    await program.methods
      .create(provider.wallet.publicKey)
      .accounts({
        counter: counter.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([counter])
      .rpc();

    let counterAccount = await program.account.counter.fetch(counter.publicKey);

    assert.ok(counterAccount.authority.equals(provider.wallet.publicKey));
    assert.ok(counterAccount.count.toNumber() === 0);
  });

  it("Updates a counter", async () => {
    await program.methods
      .increment()
      .accounts({
        counter: counter.publicKey,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const counterAccount = await program.account.counter.fetch(
      counter.publicKey
    );

    assert.ok(counterAccount.authority.equals(provider.wallet.publicKey));
    assert.ok(counterAccount.count.toNumber() == 1);
  });
});

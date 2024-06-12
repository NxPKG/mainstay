const { assert } = require("chai");
const mainstay = require("@nx-pkg/mainstay");

describe("composite", () => {
  const provider = mainstay.MainstayProvider.local();

  // Configure the client to use the local cluster.
  mainstay.setProvider(provider);

  it("Is initialized!", async () => {
    const program = mainstay.workspace.Composite;

    const dummyA = mainstay.web3.Keypair.generate();
    const dummyB = mainstay.web3.Keypair.generate();

    const tx = await program.rpc.initialize({
      accounts: {
        dummyA: dummyA.publicKey,
        dummyB: dummyB.publicKey,
        rent: mainstay.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [dummyA, dummyB],
      instructions: [
        await program.account.dummyA.createInstruction(dummyA),
        await program.account.dummyB.createInstruction(dummyB),
      ],
    });

    await program.rpc.compositeUpdate(
      new mainstay.BN(1234),
      new mainstay.BN(4321),
      {
        accounts: {
          foo: {
            dummyA: dummyA.publicKey,
          },
          bar: {
            dummyB: dummyB.publicKey,
          },
        },
      }
    );

    const dummyAAccount = await program.account.dummyA.fetch(dummyA.publicKey);
    const dummyBAccount = await program.account.dummyB.fetch(dummyB.publicKey);

    assert.isTrue(dummyAAccount.data.eq(new mainstay.BN(1234)));
    assert.isTrue(dummyBAccount.data.eq(new mainstay.BN(4321)));
  });
});

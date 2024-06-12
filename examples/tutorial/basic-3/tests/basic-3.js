const assert = require("assert");
const mainstay = require("@nx-pkg/mainstay");
const { SystemProgram } = mainstay.web3;

describe("basic-3", () => {
  const provider = mainstay.MainstayProvider.local();

  // Configure the client to use the local cluster.
  mainstay.setProvider(provider);

  it("Performs CPI from puppet master to puppet", async () => {
    const puppetMaster = mainstay.workspace.PuppetMaster;
    const puppet = mainstay.workspace.Puppet;

    // Initialize a new puppet account.
    const newPuppetAccount = mainstay.web3.Keypair.generate();
    const tx = await puppet.methods
      .initialize()
      .accounts({
        puppet: newPuppetAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([newPuppetAccount])
      .rpc();

    // Invoke the puppet master to perform a CPI to the puppet.
    await puppetMaster.methods
      .pullStrings(new mainstay.BN(111))
      .accounts({
        puppet: newPuppetAccount.publicKey,
        puppetProgram: puppet.programId,
      })
      .rpc();

    // Check the state updated.
    puppetAccount = await puppet.account.data.fetch(newPuppetAccount.publicKey);
    assert.ok(puppetAccount.data.eq(new mainstay.BN(111)));
  });
});

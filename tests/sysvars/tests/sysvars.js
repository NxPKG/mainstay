const mainstay = require("@nx-pkg/mainstay");
const { assert } = require("chai");

describe("sysvars", () => {
  // Configure the client to use the local cluster.
  mainstay.setProvider(mainstay.MainstayProvider.local());
  const program = mainstay.workspace.Sysvars;

  it("Is initialized!", async () => {
    const tx = await program.methods
      .sysvars()
      .accounts({
        clock: mainstay.web3.SYSVAR_CLOCK_PUBKEY,
        rent: mainstay.web3.SYSVAR_RENT_PUBKEY,
        stakeHistory: mainstay.web3.SYSVAR_STAKE_HISTORY_PUBKEY,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Fails when the wrong pubkeys are provided", async () => {
    try {
      await program.methods
        .sysvars()
        .accounts({
          clock: mainstay.web3.SYSVAR_CLOCK_PUBKEY,
          rent: mainstay.web3.SYSVAR_RENT_PUBKEY,
          stakeHistory: mainstay.web3.SYSVAR_REWARDS_PUBKEY,
        })
        .rpc();
      assert.ok(false);
    } catch (err) {
      const errMsg = "The given public key does not match the required sysvar";
      assert.strictEqual(err.error.errorMessage, errMsg);
      assert.strictEqual(err.error.errorCode.number, 3015);
    }
  });
});

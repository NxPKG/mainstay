import * as mainstay from "@nx-pkg/mainstay";

describe("typescript", () => {
  // Configure the client to use the local cluster.
  mainstay.setProvider(mainstay.MainstayProvider.env());

  it("Is initialized!", async () => {
    // Add your test here.
    const program = mainstay.workspace.Typescript;
    const tx = await program.rpc.initialize();
    console.log("Your transaction signature", tx);
  });
});

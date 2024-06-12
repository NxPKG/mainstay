import * as mainstay from "@nx-pkg/mainstay";
import { Program } from "@nx-pkg/mainstay";
import { Flipper } from "../target/types/flipper";

describe("flipper", () => {
  // Configure the client to use the local cluster.
  const provider = mainstay.MainstayProvider.env();
  mainstay.setProvider(provider);

  const dataAccount = mainstay.web3.Keypair.generate();
  const wallet = provider.wallet;

  const program = mainstay.workspace.Flipper as Program<Flipper>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .new()
      .accounts({ dataAccount: dataAccount.publicKey })
      .signers([dataAccount])
      .rpc();
    console.log("Your transaction signature", tx);

    const val1 = await program.methods
      .get()
      .accounts({ dataAccount: dataAccount.publicKey })
      .view();

    console.log("state", val1);

    await program.methods
      .flip()
      .accounts({ dataAccount: dataAccount.publicKey })
      .rpc();

    const val2 = await program.methods
      .get()
      .accounts({ dataAccount: dataAccount.publicKey })
      .view();

    console.log("state", val2);
  });
});

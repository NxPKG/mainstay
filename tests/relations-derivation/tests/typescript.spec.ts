import * as mainstay from "@nx-pkg/mainstay";
import { MainstayProvider, Program } from "@nx-pkg/mainstay";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { RelationsDerivation } from "../target/types/relations_derivation";

describe("typescript", () => {
  // Configure the client to use the local cluster.
  mainstay.setProvider(mainstay.MainstayProvider.env());

  const program = mainstay.workspace
    .RelationsDerivation as Program<RelationsDerivation>;
  const provider = mainstay.getProvider() as MainstayProvider;

  it("Inits the base account", async () => {
    await program.methods
      .initBase()
      .accounts({
        myAccount: provider.wallet.publicKey,
      })
      .rpc();
  });

  it("Derives relationss", async () => {
    const tx = await program.methods.testRelation().accounts({
      nested: {
        account: (
          await PublicKey.findProgramAddress(
            [Buffer.from("seed", "utf-8")],
            program.programId
          )
        )[0],
      },
    });

    await tx.instruction();
    const keys = await tx.pubkeys();

    expect(keys.myAccount!.equals(provider.wallet.publicKey)).is.true;

    await tx.rpc();
  });

  it("Can use relations derivation with seed constant", async () => {
    await program.methods.testSeedConstant().accounts({}).rpc();
  });
});

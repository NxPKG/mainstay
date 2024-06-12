import * as mainstay from "@nx-pkg/mainstay";
import { Program } from "@nx-pkg/mainstay";
import { assert } from "chai";
import { MultipleSuitesRunSingle } from "../../target/types/multiple_suites_run_single";

describe("multiple-suites-run-single", () => {
  // Configure the client to use the local cluster.
  mainstay.setProvider(mainstay.MainstayProvider.env());

  const program = mainstay.workspace
    .MultipleSuitesRunSingle as Program<MultipleSuitesRunSingle>;

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});

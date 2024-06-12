import * as mainstay from "@nx-pkg/mainstay";

import { Lamports } from "../../target/types/lamports";

describe("lamports", () => {
  // Configure the client to use the local cluster
  mainstay.setProvider(mainstay.MainstayProvider.env());

  const program = mainstay.workspace.Lamports as mainstay.Program<Lamports>;

  it("Can transfer from/to PDA", async () => {
    await program.methods
      .transfer(new mainstay.BN(mainstay.web3.LAMPORTS_PER_SOL))
      .rpc();
  });

  it("Returns an error on overflow", async () => {
    await program.methods.overflow().rpc();
  });
});

import * as mainstay from "@nx-pkg/mainstay";

import { Metadata } from "../target/types/metadata";

describe("Client interactions", () => {
  mainstay.setProvider(mainstay.MainstayProvider.env());
  const program = mainstay.workspace.metadata as mainstay.Program<Metadata>;

  it("Builds and deploys", () => {
    console.log("Program ID:", program.programId.toBase58());
  });
});

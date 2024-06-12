import * as mainstay from "@nx-pkg/mainstay";
import assert from "assert";

import type { DeclareProgram } from "../target/types/declare_program";
import type { External } from "../target/types/external";

describe("declare-program", () => {
  mainstay.setProvider(mainstay.MainstayProvider.env());
  const program: mainstay.Program<DeclareProgram> =
    mainstay.workspace.declareProgram;
  const externalProgram: mainstay.Program<External> = mainstay.workspace.external;

  // TODO: Add a utility type that does this?
  let pubkeys: Awaited<
    ReturnType<
      ReturnType<typeof externalProgram["methods"]["init"]>["rpcAndKeys"]
    >
  >["pubkeys"];

  before(async () => {
    pubkeys = (await externalProgram.methods.init().rpcAndKeys()).pubkeys;
  });

  it("Can CPI", async () => {
    const value = 5;
    await program.methods
      .cpi(value)
      .accounts({ cpiMyAccount: pubkeys.myAccount })
      .rpc();

    const myAccount = await externalProgram.account.myAccount.fetch(
      pubkeys.myAccount
    );
    assert.strictEqual(myAccount.field, value);
  });

  it("Can CPI composite", async () => {
    const value = 3;
    await program.methods
      .cpiComposite(value)
      .accounts({ cpiMyAccount: pubkeys.myAccount })
      .rpc();

    const myAccount = await externalProgram.account.myAccount.fetch(
      pubkeys.myAccount
    );
    assert.strictEqual(myAccount.field, value);
  });

  it("Can use event utils", async () => {
    await program.methods.eventUtils().rpc();
  });
});

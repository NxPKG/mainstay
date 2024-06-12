import * as mainstay from "@nx-pkg/mainstay";
import { MainstayError, Program } from "@nx-pkg/mainstay";
import splToken from "@solana/spl-token";
import { DeclareId } from "../target/types/declare_id";
import { assert } from "chai";

describe("declare_id", () => {
  mainstay.setProvider(mainstay.MainstayProvider.local());
  const program = mainstay.workspace.DeclareId as Program<DeclareId>;

  it("throws error!", async () => {
    try {
      await program.methods.initialize().rpc();
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof MainstayError);
      const err: MainstayError = _err;
      assert.strictEqual(err.error.errorCode.number, 4100);
    }
  });
});

import * as mainstay from "@nx-pkg/mainstay";
import { Program } from "@nx-pkg/mainstay";
import { AccountCommand } from "../target/types/account_command";
import { assert } from "chai";
import { execSync } from "child_process";
import { sleep } from "@project-serum/common";

describe("Test CLI account commands", () => {
  // Configure the client to use the local cluster.
  const provider = mainstay.MainstayProvider.env();

  mainstay.setProvider(provider);

  const program = mainstay.workspace.AccountCommand as Program<AccountCommand>;

  it("Can fetch and deserialize account using the account command", async () => {
    const myAccount = mainstay.web3.Keypair.generate();

    const balance = -2.5;
    const amount = 108;
    const memo = "account test";
    const values = [1, 2, 3, 1000];

    await program.methods
      .initialize(
        balance,
        new mainstay.BN(amount),
        memo,
        values.map((x) => new mainstay.BN(x))
      )
      .accounts({
        myAccount: myAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: mainstay.web3.SystemProgram.programId,
      })
      .signers([myAccount])
      .rpc();

    let output: any = {};
    for (let tries = 0; tries < 20; tries++) {
      try {
        output = JSON.parse(
          execSync(
            `mainstay account account_command.MyAccount ${myAccount.publicKey}`,
            { stdio: "pipe" }
          ).toString()
        );
        break;
      } catch (e) {
        if (!e.stderr.toString().startsWith("Error: AccountNotFound")) {
          throw e;
        }
      }

      await sleep(5000);
    }

    assert(output.balance === balance, "Balance deserialized incorrectly");
    assert(
      output.delegate_pubkey === provider.wallet.publicKey.toBase58(),
      "delegatePubkey deserialized incorrectly"
    );
    assert(
      output.sub.state.Confirmed.amount === amount,
      "Amount deserialized incorrectly"
    );
    assert(
      output.sub.state.Confirmed.memo === memo,
      "Memo deserialized incorrectly"
    );
    for (let i = 0; i < values.length; i++) {
      assert(
        output.sub.values[i] == values[i],
        "Values deserialized incorrectly"
      );
    }
  });
});

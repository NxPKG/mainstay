import * as mainstay from "@nx-pkg/mainstay";
import NodeWallet from "@nx-pkg/mainstay/dist/cjs/nodewallet";

import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { assert } from "chai";
import { RemainingAccounts } from "../../target/types/remaining_accounts";

describe("remaining-accounts", () => {
  // Configure the client to use the local cluster
  mainstay.setProvider(mainstay.MainstayProvider.env());
  const payer = NodeWallet.local().payer;

  const program = mainstay.workspace
    .RemainingAccounts as mainstay.Program<RemainingAccounts>;

  it("Account can be used with remaining accounts - read token account and write someone to Data", async () => {
    const data = mainstay.web3.Keypair.generate();
    await program.methods
      .testInit()
      .accounts({ data: data.publicKey })
      .signers([data])
      .rpc();
    const ata = await Token.createWrappedNativeAccount(
      program.provider.connection,
      TOKEN_PROGRAM_ID,
      payer.publicKey,
      payer,
      0
    );

    // Data is not initialized
    try {
      await program.methods
        .testRemainingAccounts()
        .accounts({
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts([
          { pubkey: ata, isSigner: false, isWritable: false },
          {
            pubkey: mainstay.web3.Keypair.generate().publicKey,
            isSigner: false,
            isWritable: true,
          },
        ])
        .rpc();
      assert.isTrue(false);
    } catch (_err) {
      assert.isTrue(_err instanceof mainstay.MainstayError);
      const err: mainstay.MainstayError = _err;
      assert.strictEqual(err.error.errorCode.number, 3012);
      assert.strictEqual(err.error.errorCode.code, "AccountNotInitialized");
    }

    // Can read and write from account infos from remaining_accounts
    await program.methods
      .testRemainingAccounts()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        { pubkey: ata, isSigner: false, isWritable: false },
        {
          pubkey: data.publicKey,
          isSigner: false,
          isWritable: true,
        },
      ])
      .rpc();

    const dataAccount = await program.account.data.fetch(data.publicKey);
    assert.strictEqual(
      dataAccount.someone.toString(),
      payer.publicKey.toString()
    );

    // Another account
    const another = mainstay.web3.Keypair.generate();
    await program.methods
      .testInitAnother()
      .accounts({ another: another.publicKey })
      .signers([another])
      .rpc();

    try {
      await program.methods
        .testRemainingAccounts()
        .accounts({
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts([
          { pubkey: ata, isSigner: false, isWritable: false },
          {
            pubkey: another.publicKey,
            isSigner: false,
            isWritable: true,
          },
        ])
        .rpc();
      assert.isTrue(false);
    } catch (_err) {
      assert.isTrue(_err instanceof mainstay.MainstayError);
      const err: mainstay.MainstayError = _err;
      assert.strictEqual(err.error.errorCode.number, 3002);
      assert.strictEqual(
        err.error.errorCode.code,
        "AccountDiscriminatorMismatch"
      );
    }
  });
});

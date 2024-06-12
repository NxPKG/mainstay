const mainstay = require("@nx-pkg/mainstay");
const serumCmn = require("@project-serum/common");
const { assert } = require("chai");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

describe("cashiers-check", () => {
  // Configure the client to use the local cluster.
  const provider = mainstay.MainstayProvider.env();
  // hack so we don't have to update serum-common library
  // to the new MainstayProvider class and Provider interface
  provider.send = provider.sendAndConfirm;
  mainstay.setProvider(provider);

  const program = mainstay.workspace.CashiersCheck;

  let mint = null;
  let god = null;
  let receiver = null;

  it("Sets up initial test state", async () => {
    const [_mint, _god] = await serumCmn.createMintAndVault(
      program.provider,
      new mainstay.BN(1000000)
    );
    mint = _mint;
    god = _god;

    receiver = await serumCmn.createTokenAccount(
      program.provider,
      mint,
      program.provider.wallet.publicKey
    );
  });

  const check = mainstay.web3.Keypair.generate();
  const vault = mainstay.web3.Keypair.generate();

  let checkSigner = null;

  it("Creates a check!", async () => {
    let [_checkSigner, nonce] = await mainstay.web3.PublicKey.findProgramAddress(
      [check.publicKey.toBuffer()],
      program.programId
    );
    checkSigner = _checkSigner;

    await program.rpc.createCheck(new mainstay.BN(100), "Hello world", nonce, {
      accounts: {
        check: check.publicKey,
        vault: vault.publicKey,
        checkSigner,
        from: god,
        to: receiver,
        owner: program.provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: mainstay.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [check, vault],
      instructions: [
        await program.account.check.createInstruction(check, 300),
        ...(await serumCmn.createTokenAccountInstrs(
          program.provider,
          vault.publicKey,
          mint,
          checkSigner
        )),
      ],
    });

    const checkAccount = await program.account.check.fetch(check.publicKey);
    assert.isTrue(checkAccount.from.equals(god));
    assert.isTrue(checkAccount.to.equals(receiver));
    assert.isTrue(checkAccount.amount.eq(new mainstay.BN(100)));
    assert.strictEqual(checkAccount.memo, "Hello world");
    assert.isTrue(checkAccount.vault.equals(vault.publicKey));
    assert.strictEqual(checkAccount.nonce, nonce);
    assert.isFalse(checkAccount.burned);

    let vaultAccount = await serumCmn.getTokenAccount(
      program.provider,
      checkAccount.vault
    );
    assert.isTrue(vaultAccount.amount.eq(new mainstay.BN(100)));
  });

  it("Cashes a check", async () => {
    await program.rpc.cashCheck({
      accounts: {
        check: check.publicKey,
        vault: vault.publicKey,
        checkSigner: checkSigner,
        to: receiver,
        owner: program.provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    const checkAccount = await program.account.check.fetch(check.publicKey);
    assert.isTrue(checkAccount.burned);

    let vaultAccount = await serumCmn.getTokenAccount(
      program.provider,
      checkAccount.vault
    );
    assert.isTrue(vaultAccount.amount.eq(new mainstay.BN(0)));

    let receiverAccount = await serumCmn.getTokenAccount(
      program.provider,
      receiver
    );
    assert.isTrue(receiverAccount.amount.eq(new mainstay.BN(100)));
  });
});

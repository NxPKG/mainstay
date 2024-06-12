import * as mainstay from "@nx-pkg/mainstay";
import { MainstayError, Program } from "@nx-pkg/mainstay";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { BpfUpgradeableState } from "../target/types/bpf_upgradeable_state";

describe("bpf_upgradeable_state", () => {
  const provider = mainstay.MainstayProvider.env();
  // Configure the client to use the local cluster.
  mainstay.setProvider(provider);

  const program = mainstay.workspace
    .BpfUpgradeableState as Program<BpfUpgradeableState>;
  const programDataAddress = PublicKey.findProgramAddressSync(
    [program.programId.toBytes()],
    new mainstay.web3.PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
  )[0];

  it("Reads ProgramData and sets field", async () => {
    const settings = mainstay.web3.Keypair.generate();
    const tx = await program.rpc.setAdminSettings(new mainstay.BN(500), {
      accounts: {
        authority: provider.wallet.publicKey,
        systemProgram: mainstay.web3.SystemProgram.programId,
        programData: programDataAddress,
        program: program.programId,
        settings: settings.publicKey,
      },
      signers: [settings],
    });
    assert.strictEqual(
      (
        await program.account.settings.fetch(settings.publicKey)
      ).adminData.toNumber(),
      500
    );
  });

  it("Reads ProgramData and sets field, uses program state", async () => {
    const settings = mainstay.web3.Keypair.generate();
    const tx = await program.rpc.setAdminSettingsUseProgramState(
      new mainstay.BN(500),
      {
        accounts: {
          authority: provider.wallet.publicKey,
          systemProgram: mainstay.web3.SystemProgram.programId,
          programData: programDataAddress,
          program: program.programId,
          settings: settings.publicKey,
        },
        signers: [settings],
      }
    );
    assert.strictEqual(
      (
        await program.account.settings.fetch(settings.publicKey)
      ).adminData.toNumber(),
      500
    );
  });

  it("Validates constraint on ProgramData", async () => {
    const settings = mainstay.web3.Keypair.generate();
    try {
      const authority = mainstay.web3.Keypair.generate();
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          authority.publicKey,
          10000000000
        ),
        "confirmed"
      );
      await program.rpc.setAdminSettings(new mainstay.BN(500), {
        accounts: {
          authority: authority.publicKey,
          systemProgram: mainstay.web3.SystemProgram.programId,
          programData: programDataAddress,
          settings: settings.publicKey,
          program: program.programId,
        },
        signers: [settings, authority],
      });
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof MainstayError);
      const err: MainstayError = _err;
      assert.strictEqual(err.error.errorCode.number, 2003);
      assert.strictEqual(
        err.error.errorMessage,
        "A raw constraint was violated"
      );
    }
  });

  it("Validates that account is ProgramData", async () => {
    const settings = mainstay.web3.Keypair.generate();
    try {
      await program.rpc.setAdminSettings(new mainstay.BN(500), {
        accounts: {
          authority: provider.wallet.publicKey,
          systemProgram: mainstay.web3.SystemProgram.programId,
          programData: program.programId,
          settings: settings.publicKey,
          program: program.programId,
        },
        signers: [settings],
      });
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof MainstayError);
      const err: MainstayError = _err;
      assert.strictEqual(err.error.errorCode.number, 3013);
      assert.strictEqual(
        err.error.errorMessage,
        "The given account is not a program data account"
      );
    }
  });

  it("Validates that account is owned by the upgradeable bpf loader", async () => {
    const settings = mainstay.web3.Keypair.generate();
    try {
      await program.rpc.setAdminSettings(new mainstay.BN(500), {
        accounts: {
          authority: provider.wallet.publicKey,
          systemProgram: mainstay.web3.SystemProgram.programId,
          programData: provider.wallet.publicKey,
          settings: settings.publicKey,
          program: program.programId,
        },
        signers: [settings],
      });
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof MainstayError);
      const err: MainstayError = _err;
      assert.strictEqual(err.error.errorCode.number, 3007);
      assert.strictEqual(
        err.error.errorMessage,
        "The given account is owned by a different program than expected"
      );
    }
  });

  it("Deserializes UpgradableLoaderState and validates that programData is the expected account", async () => {
    const secondProgramAddress = new PublicKey(
      "Fkv67TwmbakfZw2PoW57wYPbqNexAH6vuxpyT8vmrc3B"
    );
    const secondProgramProgramDataAddress = PublicKey.findProgramAddressSync(
      [secondProgramAddress.toBytes()],
      new mainstay.web3.PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
    )[0];

    const settings = mainstay.web3.Keypair.generate();
    try {
      await program.rpc.setAdminSettings(new mainstay.BN(500), {
        accounts: {
          authority: provider.wallet.publicKey,
          systemProgram: mainstay.web3.SystemProgram.programId,
          programData: secondProgramProgramDataAddress,
          settings: settings.publicKey,
          program: program.programId,
        },
        signers: [settings],
      });
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof MainstayError);
      const err: MainstayError = _err;
      assert.strictEqual(err.error.errorCode.number, 6000);
    }
  });

  it("Deserializes Program and validates that programData is the expected account", async () => {
    const secondProgramAddress = new PublicKey(
      "Fkv67TwmbakfZw2PoW57wYPbqNexAH6vuxpyT8vmrc3B"
    );
    const secondProgramProgramDataAddress = PublicKey.findProgramAddressSync(
      [secondProgramAddress.toBytes()],
      new mainstay.web3.PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
    )[0];

    const settings = mainstay.web3.Keypair.generate();
    try {
      await program.rpc.setAdminSettingsUseProgramState(new mainstay.BN(500), {
        accounts: {
          authority: provider.wallet.publicKey,
          systemProgram: mainstay.web3.SystemProgram.programId,
          programData: secondProgramProgramDataAddress,
          settings: settings.publicKey,
          program: program.programId,
        },
        signers: [settings],
      });
      assert.ok(false);
    } catch (_err) {
      assert.isTrue(_err instanceof MainstayError);
      const err: MainstayError = _err;
      assert.strictEqual(err.error.errorCode.number, 2003);
    }
  });
});

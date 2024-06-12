import * as mainstay from "@nx-pkg/mainstay";
import { Program } from "@nx-pkg/mainstay";
import { IdlCommandsOne } from "../target/types/idl_commands_one";
import { IdlCommandsTwo } from "../target/types/idl_commands_two";
import { assert } from "chai";
import { execSync } from "child_process";
import * as fs from "fs";

describe("Test CLI IDL commands", () => {
  // Configure the client to use the local cluster.
  const provider = mainstay.MainstayProvider.env();

  mainstay.setProvider(provider);

  const programOne = mainstay.workspace.IdlCommandsOne as Program<IdlCommandsOne>;
  const programTwo = mainstay.workspace.IdlCommandsTwo as Program<IdlCommandsTwo>;

  it("Can initialize IDL account", async () => {
    execSync(
      `mainstay idl init --filepath target/idl/idl_commands_one.json ${programOne.programId}`,
      { stdio: "inherit" }
    );
  });

  it("Can fetch an IDL using the TypeScript client", async () => {
    const idl = await mainstay.Program.fetchIdl(programOne.programId, provider);
    assert.deepEqual(idl, programOne.rawIdl);
  });

  it("Can fetch an IDL via the CLI", async () => {
    const idl = execSync(`mainstay idl fetch ${programOne.programId}`).toString();
    assert.deepEqual(JSON.parse(idl), programOne.rawIdl);
  });

  it("Can write a new IDL using the upgrade command", async () => {
    // Upgrade the IDL of program one to the IDL of program two to test upgrade
    execSync(
      `mainstay idl upgrade --filepath target/idl/idl_commands_two.json ${programOne.programId}`,
      { stdio: "inherit" }
    );
    const idl = await mainstay.Program.fetchIdl(programOne.programId, provider);
    assert.deepEqual(idl, programTwo.rawIdl);
  });

  it("Can write a new IDL using write-buffer and set-buffer", async () => {
    // "Upgrade" back to program one via write-buffer set-buffer
    let buffer = execSync(
      `mainstay idl write-buffer --filepath target/idl/idl_commands_one.json ${programOne.programId}`
    ).toString();
    buffer = buffer.replace("Idl buffer created: ", "").trim();
    execSync(
      `mainstay idl set-buffer --buffer ${buffer} ${programOne.programId}`,
      { stdio: "inherit" }
    );
    const idl = await mainstay.Program.fetchIdl(programOne.programId, provider);
    assert.deepEqual(idl, programOne.rawIdl);
  });

  it("Can fetch an IDL authority via the CLI", async () => {
    const authority = execSync(`mainstay idl authority ${programOne.programId}`)
      .toString()
      .trim();

    assert.equal(authority, provider.wallet.publicKey.toString());
  });

  it("Can close IDL account", async () => {
    execSync(`mainstay idl close ${programOne.programId}`, { stdio: "inherit" });
    const idl = await mainstay.Program.fetchIdl(programOne.programId, provider);
    assert.isNull(idl);
  });

  it("Can initialize super massive IDL account", async () => {
    execSync(
      `mainstay idl init --filepath testLargeIdl.json ${programOne.programId}`,
      { stdio: "inherit" }
    );
    const idlActual = await mainstay.Program.fetchIdl(
      programOne.programId,
      provider
    );
    const idlExpected = JSON.parse(
      fs.readFileSync("testLargeIdl.json", "utf8")
    );
    assert.deepEqual(idlActual, idlExpected);
  });
});

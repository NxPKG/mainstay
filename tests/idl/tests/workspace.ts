import * as mainstay from "@nx-pkg/mainstay";
import { assert } from "chai";

describe("Workspace", () => {
  mainstay.setProvider(mainstay.MainstayProvider.env());

  it("Can lazy load workspace programs", () => {
    assert.doesNotThrow(() => {
      // Program exists, should not throw
      mainstay.workspace.relationsDerivation;
    });

    assert.throws(() => {
      // IDL path in Mainstay.toml doesn't exist but other tests still run
      // successfully because workspace programs are getting loaded on-demand
      mainstay.workspace.nonExistent;
    }, /non-existent\.json/);
  });

  it("Can get workspace programs by their name independent of casing", () => {
    const camel = mainstay.workspace.relationsDerivation;
    const pascal = mainstay.workspace.RelationsDerivation;
    const kebab = mainstay.workspace["relations-derivation"];
    const snake = mainstay.workspace["relations_derivation"];

    const compareProgramNames = (...programs: mainstay.Program[]) => {
      return programs.every(
        (program) => program.rawIdl.metadata.name === "relations_derivation"
      );
    };

    assert(compareProgramNames(camel, pascal, kebab, snake));
  });

  it("Can use numbers in program names", () => {
    assert.doesNotThrow(() => {
      mainstay.workspace.numbers123;
      mainstay.workspace.Numbers123;
      mainstay.workspace["numbers-123"];
      mainstay.workspace["numbers_123"];
    });
  });
});

import { Idl, Coder } from "@nx-pkg/mainstay";

import { SplRecordAccountsCoder } from "./accounts";
import { SplRecordEventsCoder } from "./events";
import { SplRecordInstructionCoder } from "./instructions";
import { SplRecordTypesCoder } from "./types";

/**
 * Coder for SplRecord
 */
export class SplRecordCoder implements Coder {
  readonly accounts: SplRecordAccountsCoder;
  readonly events: SplRecordEventsCoder;
  readonly instruction: SplRecordInstructionCoder;
  readonly types: SplRecordTypesCoder;

  constructor(idl: Idl) {
    this.accounts = new SplRecordAccountsCoder(idl);
    this.events = new SplRecordEventsCoder(idl);
    this.instruction = new SplRecordInstructionCoder(idl);
    this.types = new SplRecordTypesCoder(idl);
  }
}

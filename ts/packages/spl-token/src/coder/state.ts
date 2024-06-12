import { Idl, StateCoder } from "@nx-pkg/mainstay";

export class SplTokenStateCoder implements StateCoder {
  constructor(_idl: Idl) {}

  encode<T = any>(_name: string, _account: T): Promise<Buffer> {
    throw new Error("SplToken does not have state");
  }
  decode<T = any>(_ix: Buffer): T {
    throw new Error("SplToken does not have state");
  }
}
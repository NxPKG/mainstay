import { PublicKey } from "@solana/web3.js";
import * as borsh from "@project-serum/borsh";

export type Idl = {
  version: string;
  name: string;
  instructions: IdlInstruction[];
  state?: IdlState;
  accounts?: IdlTypeDef[];
  types?: IdlTypeDef[];
  events?: IdlEvent[];
  errors?: IdlErrorCode[];
};

export type IdlEvent = {
  name: string;
  fields: IdlEventField[];
};

export type IdlEventField = {
  name: string;
  type: IdlType;
  index: boolean;
};

export type IdlInstruction = {
  name: string;
  accounts: IdlAccountItem[];
  args: IdlField[];
};

export type IdlState = {
  struct: IdlTypeDef;
  methods: IdlStateMethod[];
};

export type IdlStateMethod = IdlInstruction;

export type IdlAccountItem = IdlAccount | IdlAccounts;

export type IdlAccount = {
  name: string;
  isMut: boolean;
  isSigner: boolean;
};

// A nested/recursive version of IdlAccount.
export type IdlAccounts = {
  name: string;
  accounts: IdlAccountItem[];
};

export type IdlField = {
  name: string;
  type: IdlType;
};

export type IdlTypeDef = {
  name: string;
  type: IdlTypeDefTy;
};

type IdlTypeDefTy = {
  kind: "struct" | "enum";
  fields?: IdlTypeDefStruct;
  variants?: IdlEnumVariant[];
};

type IdlTypeDefStruct = Array<IdlField>;

export type IdlType =
  | "bool"
  | "u8"
  | "i8"
  | "u16"
  | "i16"
  | "u32"
  | "i32"
  | "u64"
  | "i64"
  | "u128"
  | "i128"
  | "bytes"
  | "string"
  | "publicKey"
  | IdlTypeVec
  | IdlTypeOption
  | IdlTypeDefined;

export type IdlTypeVec = {
  vec: IdlType;
};

export type IdlTypeOption = {
  option: IdlType;
};

// User defined type.
export type IdlTypeDefined = {
  defined: string;
};

export type IdlEnumVariant = {
  name: string;
  fields?: IdlEnumFields;
};

type IdlEnumFields = IdlEnumFieldsNamed | IdlEnumFieldsTuple;

type IdlEnumFieldsNamed = IdlField[];

type IdlEnumFieldsTuple = IdlType[];

type IdlErrorCode = {
  code: number;
  name: string;
  msg?: string;
};

// Deterministic IDL address as a function of the program id.
export async function idlAddress(programId: PublicKey): Promise<PublicKey> {
  const base = (await PublicKey.findProgramAddress([], programId))[0];
  return await PublicKey.createWithSeed(base, seed(), programId);
}

// Seed for generating the idlAddress.
export function seed(): string {
  return "mainstay:idl";
}

// The on-chain account of the IDL.
export interface IdlProgramAccount {
  authority: PublicKey;
  data: Buffer;
}

const IDL_ACCOUNT_LAYOUT: borsh.Layout<IdlProgramAccount> = borsh.struct([
  borsh.publicKey("authority"),
  borsh.vecU8("data"),
]);

export function decodeIdlAccount(data: Buffer): IdlProgramAccount {
  return IDL_ACCOUNT_LAYOUT.decode(data);
}

export function encodeIdlAccount(acc: IdlProgramAccount): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = IDL_ACCOUNT_LAYOUT.encode(acc, buffer);
  return buffer.slice(0, len);
}

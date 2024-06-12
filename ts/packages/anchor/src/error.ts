import { PublicKey } from "@solana/web3.js";
import * as errors from "@nx-pkg/mainstay-errors";
import * as features from "./utils/features.js";

export class IdlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdlError";
  }
}

interface ErrorCode {
  code: string;
  number: number;
}

interface FileLine {
  file: string;
  line: number;
}

type Origin = string | FileLine;
type ComparedAccountNames = [string, string];
type ComparedPublicKeys = [PublicKey, PublicKey];
type ComparedValues = ComparedAccountNames | ComparedPublicKeys;

export class ProgramErrorStack {
  constructor(readonly stack: PublicKey[]) {}

  public static parse(logs: string[]) {
    const programKeyRegex = /^Program (\w*) invoke/;
    const successRegex = /^Program \w* success/;

    const programStack: PublicKey[] = [];
    for (let i = 0; i < logs.length; i++) {
      if (successRegex.exec(logs[i])) {
        programStack.pop();
        continue;
      }

      const programKey = programKeyRegex.exec(logs[i])?.[1];
      if (!programKey) {
        continue;
      }
      programStack.push(new PublicKey(programKey));
    }
    return new ProgramErrorStack(programStack);
  }
}

export class MainstayError extends Error {
  readonly error: {
    errorCode: ErrorCode;
    errorMessage: string;
    comparedValues?: ComparedValues;
    origin?: Origin;
  };
  private readonly _programErrorStack: ProgramErrorStack;

  constructor(
    errorCode: ErrorCode,
    errorMessage: string,
    readonly errorLogs: string[],
    readonly logs: string[],
    origin?: Origin,
    comparedValues?: ComparedValues
  ) {
    super(errorLogs.join("\n").replace("Program log: ", ""));
    this.error = { errorCode, errorMessage, comparedValues, origin };
    this._programErrorStack = ProgramErrorStack.parse(logs);
  }

  public static parse(logs: string[]) {
    if (!logs) {
      return null;
    }

    const mainstayErrorLogIndex = logs.findIndex((log) =>
      log.startsWith("Program log: MainstayError")
    );
    if (mainstayErrorLogIndex === -1) {
      return null;
    }
    const mainstayErrorLog = logs[mainstayErrorLogIndex];
    const errorLogs = [mainstayErrorLog];
    let comparedValues: ComparedValues | undefined;
    if (mainstayErrorLogIndex + 1 < logs.length) {
      // This catches the comparedValues where the following is logged
      // <MainstayError>
      // Left:
      // <Pubkey>
      // Right:
      // <Pubkey>
      if (logs[mainstayErrorLogIndex + 1] === "Program log: Left:") {
        const pubkeyRegex = /^Program log: (.*)$/;
        const leftPubkey = pubkeyRegex.exec(logs[mainstayErrorLogIndex + 2])![1];
        const rightPubkey = pubkeyRegex.exec(logs[mainstayErrorLogIndex + 4])![1];
        comparedValues = [
          new PublicKey(leftPubkey),
          new PublicKey(rightPubkey),
        ];
        errorLogs.push(
          ...logs.slice(mainstayErrorLogIndex + 1, mainstayErrorLogIndex + 5)
        );
      }
      // This catches the comparedValues where the following is logged
      // <MainstayError>
      // Left: <value>
      // Right: <value>
      else if (logs[mainstayErrorLogIndex + 1].startsWith("Program log: Left:")) {
        const valueRegex = /^Program log: (Left|Right): (.*)$/;
        const leftValue = valueRegex.exec(logs[mainstayErrorLogIndex + 1])![2];
        const rightValue = valueRegex.exec(logs[mainstayErrorLogIndex + 2])![2];
        errorLogs.push(
          ...logs.slice(mainstayErrorLogIndex + 1, mainstayErrorLogIndex + 3)
        );
        comparedValues = [leftValue, rightValue];
      }
    }
    const regexNoInfo =
      /^Program log: MainstayError occurred\. Error Code: (.*)\. Error Number: (\d*)\. Error Message: (.*)\./;
    const noInfoMainstayErrorLog = regexNoInfo.exec(mainstayErrorLog);
    const regexFileLine =
      /^Program log: MainstayError thrown in (.*):(\d*)\. Error Code: (.*)\. Error Number: (\d*)\. Error Message: (.*)\./;
    const fileLineMainstayErrorLog = regexFileLine.exec(mainstayErrorLog);
    const regexAccountName =
      /^Program log: MainstayError caused by account: (.*)\. Error Code: (.*)\. Error Number: (\d*)\. Error Message: (.*)\./;
    const accountNameMainstayErrorLog = regexAccountName.exec(mainstayErrorLog);
    if (noInfoMainstayErrorLog) {
      const [errorCodeString, errorNumber, errorMessage] =
        noInfoMainstayErrorLog.slice(1, 4);
      const errorCode = {
        code: errorCodeString,
        number: parseInt(errorNumber),
      };
      return new MainstayError(
        errorCode,
        errorMessage,
        errorLogs,
        logs,
        undefined,
        comparedValues
      );
    } else if (fileLineMainstayErrorLog) {
      const [file, line, errorCodeString, errorNumber, errorMessage] =
        fileLineMainstayErrorLog.slice(1, 6);
      const errorCode = {
        code: errorCodeString,
        number: parseInt(errorNumber),
      };
      const fileLine = { file, line: parseInt(line) };
      return new MainstayError(
        errorCode,
        errorMessage,
        errorLogs,
        logs,
        fileLine,
        comparedValues
      );
    } else if (accountNameMainstayErrorLog) {
      const [accountName, errorCodeString, errorNumber, errorMessage] =
        accountNameMainstayErrorLog.slice(1, 5);
      const origin = accountName;
      const errorCode = {
        code: errorCodeString,
        number: parseInt(errorNumber),
      };
      return new MainstayError(
        errorCode,
        errorMessage,
        errorLogs,
        logs,
        origin,
        comparedValues
      );
    } else {
      return null;
    }
  }

  get program(): PublicKey {
    return this._programErrorStack.stack[
      this._programErrorStack.stack.length - 1
    ];
  }

  get programErrorStack(): PublicKey[] {
    return this._programErrorStack.stack;
  }

  public toString(): string {
    return this.message;
  }
}

// An error from a user defined program.
export class ProgramError extends Error {
  private readonly _programErrorStack?: ProgramErrorStack;

  constructor(
    readonly code: number,
    readonly msg: string,
    readonly logs?: string[]
  ) {
    super();
    if (logs) {
      this._programErrorStack = ProgramErrorStack.parse(logs);
    }
  }

  public static parse(
    err: any,
    idlErrors: Map<number, string>
  ): ProgramError | null {
    const errString: string = err.toString();
    // TODO: don't rely on the error string. web3.js should preserve the error
    //       code information instead of giving us an untyped string.
    let unparsedErrorCode: string;
    if (errString.includes("custom program error:")) {
      let components = errString.split("custom program error: ");
      if (components.length !== 2) {
        return null;
      } else {
        unparsedErrorCode = components[1];
      }
    } else {
      const matches = errString.match(/"Custom":([0-9]+)}/g);
      if (!matches || matches.length > 1) {
        return null;
      }
      unparsedErrorCode = matches[0].match(/([0-9]+)/g)![0];
    }

    let errorCode: number;
    try {
      errorCode = parseInt(unparsedErrorCode);
    } catch (parseErr) {
      return null;
    }

    // Parse user error.
    let errorMsg = idlErrors.get(errorCode);
    if (errorMsg !== undefined) {
      return new ProgramError(errorCode, errorMsg, err.logs);
    }

    // Parse framework internal error.
    errorMsg = LangErrorMessage.get(errorCode);
    if (errorMsg !== undefined) {
      return new ProgramError(errorCode, errorMsg, err.logs);
    }

    // Unable to parse the error. Just return the untranslated error.
    return null;
  }

  get program(): PublicKey | undefined {
    return this._programErrorStack?.stack[
      this._programErrorStack.stack.length - 1
    ];
  }

  get programErrorStack(): PublicKey[] | undefined {
    return this._programErrorStack?.stack;
  }

  public toString(): string {
    return this.msg;
  }
}

export function translateError(err: any, idlErrors: Map<number, string>) {
  if (features.isSet("debug-logs")) {
    console.log("Translating error:", err);
  }

  const mainstayError = MainstayError.parse(err.logs);
  if (mainstayError) {
    return mainstayError;
  }

  const programError = ProgramError.parse(err, idlErrors);
  if (programError) {
    return programError;
  }
  if (err.logs) {
    const handler = {
      get: function (target, prop) {
        if (prop === "programErrorStack") {
          return target.programErrorStack.stack;
        } else if (prop === "program") {
          return target.programErrorStack.stack[
            err.programErrorStack.stack.length - 1
          ];
        } else {
          // this is the normal way to return all other props
          // without modifying them.
          // @ts-expect-error
          return Reflect.get(...arguments);
        }
      },
    };
    err.programErrorStack = ProgramErrorStack.parse(err.logs);
    return new Proxy(err, handler);
  }
  return err;
}

export const LangErrorCode = {
  // Instructions.
  InstructionMissing: errors.MAINSTAY_ERROR__INSTRUCTION_MISSING,
  InstructionFallbackNotFound:
    errors.MAINSTAY_ERROR__INSTRUCTION_FALLBACK_NOT_FOUND,
  InstructionDidNotDeserialize:
    errors.MAINSTAY_ERROR__INSTRUCTION_DID_NOT_DESERIALIZE,
  InstructionDidNotSerialize:
    errors.MAINSTAY_ERROR__INSTRUCTION_DID_NOT_SERIALIZE,

  // IDL instructions.
  IdlInstructionStub: errors.MAINSTAY_ERROR__IDL_INSTRUCTION_STUB,
  IdlInstructionInvalidProgram:
    errors.MAINSTAY_ERROR__IDL_INSTRUCTION_INVALID_PROGRAM,
  IdlAccountNotEmpty: errors.MAINSTAY_ERROR__IDL_ACCOUNT_NOT_EMPTY,

  // Event instructions.
  EventInstructionStub: errors.MAINSTAY_ERROR__EVENT_INSTRUCTION_STUB,

  // Constraints.
  ConstraintMut: errors.MAINSTAY_ERROR__CONSTRAINT_MUT,
  ConstraintHasOne: errors.MAINSTAY_ERROR__CONSTRAINT_HAS_ONE,
  ConstraintSigner: errors.MAINSTAY_ERROR__CONSTRAINT_SIGNER,
  ConstraintRaw: errors.MAINSTAY_ERROR__CONSTRAINT_RAW,
  ConstraintOwner: errors.MAINSTAY_ERROR__CONSTRAINT_OWNER,
  ConstraintRentExempt: errors.MAINSTAY_ERROR__CONSTRAINT_RENT_EXEMPT,
  ConstraintSeeds: errors.MAINSTAY_ERROR__CONSTRAINT_SEEDS,
  ConstraintExecutable: errors.MAINSTAY_ERROR__CONSTRAINT_EXECUTABLE,
  ConstraintState: errors.MAINSTAY_ERROR__CONSTRAINT_STATE,
  ConstraintAssociated: errors.MAINSTAY_ERROR__CONSTRAINT_ASSOCIATED,
  ConstraintAssociatedInit: errors.MAINSTAY_ERROR__CONSTRAINT_ASSOCIATED_INIT,
  ConstraintClose: errors.MAINSTAY_ERROR__CONSTRAINT_CLOSE,
  ConstraintAddress: errors.MAINSTAY_ERROR__CONSTRAINT_ADDRESS,
  ConstraintZero: errors.MAINSTAY_ERROR__CONSTRAINT_ZERO,
  ConstraintTokenMint: errors.MAINSTAY_ERROR__CONSTRAINT_TOKEN_MINT,
  ConstraintTokenOwner: errors.MAINSTAY_ERROR__CONSTRAINT_TOKEN_OWNER,
  ConstraintMintMintAuthority:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_MINT_AUTHORITY,
  ConstraintMintFreezeAuthority:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_FREEZE_AUTHORITY,
  ConstraintMintDecimals: errors.MAINSTAY_ERROR__CONSTRAINT_MINT_DECIMALS,
  ConstraintSpace: errors.MAINSTAY_ERROR__CONSTRAINT_SPACE,
  ConstraintAccountIsNone: errors.MAINSTAY_ERROR__CONSTRAINT_ACCOUNT_IS_NONE,
  ConstraintTokenTokenProgram:
    errors.MAINSTAY_ERROR__CONSTRAINT_TOKEN_TOKEN_PROGRAM,
  ConstraintMintTokenProgram:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_TOKEN_PROGRAM,
  ConstraintAssociatedTokenTokenProgram:
    errors.MAINSTAY_ERROR__CONSTRAINT_ASSOCIATED_TOKEN_TOKEN_PROGRAM,
  ConstraintMintGroupPointerExtension:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_GROUP_POINTER_EXTENSION,
  ConstraintMintGroupPointerExtensionAuthority:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_GROUP_POINTER_EXTENSION_AUTHORITY,
  ConstraintMintGroupPointerExtensionGroupAddress:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_GROUP_POINTER_EXTENSION_GROUP_ADDRESS,
  ConstraintMintGroupMemberPointerExtension:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_GROUP_MEMBER_POINTER_EXTENSION,
  ConstraintMintGroupMemberPointerExtensionAuthority:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_GROUP_MEMBER_POINTER_EXTENSION_AUTHORITY,
  ConstraintMintGroupMemberPointerExtensionMemberAddress:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_GROUP_MEMBER_POINTER_EXTENSION_MEMBER_ADDRESS,
  ConstraintMintMetadataPointerExtension:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_METADATA_POINTER_EXTENSION,
  ConstraintMintMetadataPointerExtensionAuthority:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_METADATA_POINTER_EXTENSION_AUTHORITY,
  ConstraintMintMetadataPointerExtensionMetadataAddress:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_METADATA_POINTER_EXTENSION_METADATA_ADDRESS,
  ConstraintMintCloseAuthorityExtension:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_CLOSE_AUTHORITY_EXTENSION,
  ConstraintMintCloseAuthorityExtensionAuthority:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_CLOSE_AUTHORITY_EXTENSION_AUTHORITY,
  ConstraintMintPermanentDelegateExtension:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_PERMANENT_DELEGATE_EXTENSION,
  ConstraintMintPermanentDelegateExtensionDelegate:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_PERMANENT_DELEGATE_EXTENSION_DELEGATE,
  ConstraintMintTransferHookExtension:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_TRANSFER_HOOK_EXTENSION,
  ConstraintMintTransferHookExtensionAuthority:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_TRANSFER_HOOK_EXTENSION_AUTHORITY,
  ConstraintMintTransferHookExtensionProgramId:
    errors.MAINSTAY_ERROR__CONSTRAINT_MINT_TRANSFER_HOOK_EXTENSION_PROGRAM_ID,

  // Require.
  RequireViolated: errors.MAINSTAY_ERROR__REQUIRE_VIOLATED,
  RequireEqViolated: errors.MAINSTAY_ERROR__REQUIRE_EQ_VIOLATED,
  RequireKeysEqViolated: errors.MAINSTAY_ERROR__REQUIRE_KEYS_EQ_VIOLATED,
  RequireNeqViolated: errors.MAINSTAY_ERROR__REQUIRE_NEQ_VIOLATED,
  RequireKeysNeqViolated: errors.MAINSTAY_ERROR__REQUIRE_KEYS_NEQ_VIOLATED,
  RequireGtViolated: errors.MAINSTAY_ERROR__REQUIRE_GT_VIOLATED,
  RequireGteViolated: errors.MAINSTAY_ERROR__REQUIRE_GTE_VIOLATED,

  // Accounts.
  AccountDiscriminatorAlreadySet:
    errors.MAINSTAY_ERROR__ACCOUNT_DISCRIMINATOR_ALREADY_SET,
  AccountDiscriminatorNotFound:
    errors.MAINSTAY_ERROR__ACCOUNT_DISCRIMINATOR_NOT_FOUND,
  AccountDiscriminatorMismatch:
    errors.MAINSTAY_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH,
  AccountDidNotDeserialize: errors.MAINSTAY_ERROR__ACCOUNT_DID_NOT_DESERIALIZE,
  AccountDidNotSerialize: errors.MAINSTAY_ERROR__ACCOUNT_DID_NOT_SERIALIZE,
  AccountNotEnoughKeys: errors.MAINSTAY_ERROR__ACCOUNT_NOT_ENOUGH_KEYS,
  AccountNotMutable: errors.MAINSTAY_ERROR__ACCOUNT_NOT_MUTABLE,
  AccountOwnedByWrongProgram:
    errors.MAINSTAY_ERROR__ACCOUNT_OWNED_BY_WRONG_PROGRAM,
  InvalidProgramId: errors.MAINSTAY_ERROR__INVALID_PROGRAM_ID,
  InvalidProgramExecutable: errors.MAINSTAY_ERROR__INVALID_PROGRAM_EXECUTABLE,
  AccountNotSigner: errors.MAINSTAY_ERROR__ACCOUNT_NOT_SIGNER,
  AccountNotSystemOwned: errors.MAINSTAY_ERROR__ACCOUNT_NOT_SYSTEM_OWNED,
  AccountNotInitialized: errors.MAINSTAY_ERROR__ACCOUNT_NOT_INITIALIZED,
  AccountNotProgramData: errors.MAINSTAY_ERROR__ACCOUNT_NOT_PROGRAM_DATA,
  AccountNotAssociatedTokenAccount:
    errors.MAINSTAY_ERROR__ACCOUNT_NOT_ASSOCIATED_TOKEN_ACCOUNT,
  AccountSysvarMismatch: errors.MAINSTAY_ERROR__ACCOUNT_SYSVAR_MISMATCH,
  AccountReallocExceedsLimit:
    errors.MAINSTAY_ERROR__ACCOUNT_REALLOC_EXCEEDS_LIMIT,
  AccountDuplicateReallocs: errors.MAINSTAY_ERROR__ACCOUNT_DUPLICATE_REALLOCS,

  // Miscellaneous
  DeclaredProgramIdMismatch: errors.MAINSTAY_ERROR__DECLARED_PROGRAM_ID_MISMATCH,
  TryingToInitPayerAsProgramAccount:
    errors.MAINSTAY_ERROR__TRYING_TO_INIT_PAYER_AS_PROGRAM_ACCOUNT,
  InvalidNumericConversion: errors.MAINSTAY_ERROR__INVALID_NUMERIC_CONVERSION,

  // Used for APIs that shouldn't be used anymore.
  Deprecated: errors.MAINSTAY_ERROR__DEPRECATED,
};

export const LangErrorMessage = new Map<number, string>([
  // Instructions.
  [
    LangErrorCode.InstructionMissing,
    "8 byte instruction identifier not provided",
  ],
  [
    LangErrorCode.InstructionFallbackNotFound,
    "Fallback functions are not supported",
  ],
  [
    LangErrorCode.InstructionDidNotDeserialize,
    "The program could not deserialize the given instruction",
  ],
  [
    LangErrorCode.InstructionDidNotSerialize,
    "The program could not serialize the given instruction",
  ],

  // Idl instructions.
  [
    LangErrorCode.IdlInstructionStub,
    "The program was compiled without idl instructions",
  ],
  [
    LangErrorCode.IdlInstructionInvalidProgram,
    "The transaction was given an invalid program for the IDL instruction",
  ],
  [
    LangErrorCode.IdlAccountNotEmpty,
    "IDL account must be empty in order to resize, try closing first",
  ],

  // Event instructions.
  [
    LangErrorCode.EventInstructionStub,
    "The program was compiled without `event-cpi` feature",
  ],

  // Constraints.
  [LangErrorCode.ConstraintMut, "A mut constraint was violated"],
  [LangErrorCode.ConstraintHasOne, "A has one constraint was violated"],
  [LangErrorCode.ConstraintSigner, "A signer constraint was violated"],
  [LangErrorCode.ConstraintRaw, "A raw constraint was violated"],
  [LangErrorCode.ConstraintOwner, "An owner constraint was violated"],
  [
    LangErrorCode.ConstraintRentExempt,
    "A rent exemption constraint was violated",
  ],
  [LangErrorCode.ConstraintSeeds, "A seeds constraint was violated"],
  [LangErrorCode.ConstraintExecutable, "An executable constraint was violated"],
  [
    LangErrorCode.ConstraintState,
    "Deprecated Error, feel free to replace with something else",
  ],
  [LangErrorCode.ConstraintAssociated, "An associated constraint was violated"],
  [
    LangErrorCode.ConstraintAssociatedInit,
    "An associated init constraint was violated",
  ],
  [LangErrorCode.ConstraintClose, "A close constraint was violated"],
  [LangErrorCode.ConstraintAddress, "An address constraint was violated"],
  [LangErrorCode.ConstraintZero, "Expected zero account discriminant"],
  [LangErrorCode.ConstraintTokenMint, "A token mint constraint was violated"],
  [LangErrorCode.ConstraintTokenOwner, "A token owner constraint was violated"],
  [
    LangErrorCode.ConstraintMintMintAuthority,
    "A mint mint authority constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintFreezeAuthority,
    "A mint freeze authority constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintDecimals,
    "A mint decimals constraint was violated",
  ],
  [LangErrorCode.ConstraintSpace, "A space constraint was violated"],
  [
    LangErrorCode.ConstraintAccountIsNone,
    "A required account for the constraint is None",
  ],
  [
    LangErrorCode.ConstraintTokenTokenProgram,
    "A token account token program constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintTokenProgram,
    "A mint token program constraint was violated",
  ],
  [
    LangErrorCode.ConstraintAssociatedTokenTokenProgram,
    "An associated token account token program constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintGroupPointerExtension,
    "A group pointer extension constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintGroupPointerExtensionAuthority,
    "A group pointer extension authority constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintGroupPointerExtensionGroupAddress,
    "A group pointer extension group address constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintGroupMemberPointerExtension,
    "A group member pointer extension constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintGroupMemberPointerExtensionAuthority,
    "A group member pointer extension authority constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintGroupMemberPointerExtensionMemberAddress,
    "A group member pointer extension group address constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintMetadataPointerExtension,
    "A metadata pointer extension constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintMetadataPointerExtensionAuthority,
    "A metadata pointer extension authority constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintMetadataPointerExtensionMetadataAddress,
    "A metadata pointer extension metadata address constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintCloseAuthorityExtension,
    "A close authority constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintCloseAuthorityExtensionAuthority,
    "A close authority extension authority constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintPermanentDelegateExtension,
    "A permanent delegate extension constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintPermanentDelegateExtensionDelegate,
    "A permanent delegate extension delegate constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintTransferHookExtension,
    "A transfer hook extension constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintTransferHookExtensionAuthority,
    "A transfer hook extension authority constraint was violated",
  ],
  [
    LangErrorCode.ConstraintMintTransferHookExtensionProgramId,
    "A transfer hook extension transfer hook program id constraint was violated",
  ],

  // Require.
  [LangErrorCode.RequireViolated, "A require expression was violated"],
  [LangErrorCode.RequireEqViolated, "A require_eq expression was violated"],
  [
    LangErrorCode.RequireKeysEqViolated,
    "A require_keys_eq expression was violated",
  ],
  [LangErrorCode.RequireNeqViolated, "A require_neq expression was violated"],
  [
    LangErrorCode.RequireKeysNeqViolated,
    "A require_keys_neq expression was violated",
  ],
  [LangErrorCode.RequireGtViolated, "A require_gt expression was violated"],
  [LangErrorCode.RequireGteViolated, "A require_gte expression was violated"],

  // Accounts.
  [
    LangErrorCode.AccountDiscriminatorAlreadySet,
    "The account discriminator was already set on this account",
  ],
  [
    LangErrorCode.AccountDiscriminatorNotFound,
    "No 8 byte discriminator was found on the account",
  ],
  [
    LangErrorCode.AccountDiscriminatorMismatch,
    "8 byte discriminator did not match what was expected",
  ],
  [LangErrorCode.AccountDidNotDeserialize, "Failed to deserialize the account"],
  [LangErrorCode.AccountDidNotSerialize, "Failed to serialize the account"],
  [
    LangErrorCode.AccountNotEnoughKeys,
    "Not enough account keys given to the instruction",
  ],
  [LangErrorCode.AccountNotMutable, "The given account is not mutable"],
  [
    LangErrorCode.AccountOwnedByWrongProgram,
    "The given account is owned by a different program than expected",
  ],
  [LangErrorCode.InvalidProgramId, "Program ID was not as expected"],
  [LangErrorCode.InvalidProgramExecutable, "Program account is not executable"],
  [LangErrorCode.AccountNotSigner, "The given account did not sign"],
  [
    LangErrorCode.AccountNotSystemOwned,
    "The given account is not owned by the system program",
  ],
  [
    LangErrorCode.AccountNotInitialized,
    "The program expected this account to be already initialized",
  ],
  [
    LangErrorCode.AccountNotProgramData,
    "The given account is not a program data account",
  ],
  [
    LangErrorCode.AccountNotAssociatedTokenAccount,
    "The given account is not the associated token account",
  ],
  [
    LangErrorCode.AccountSysvarMismatch,
    "The given public key does not match the required sysvar",
  ],
  [
    LangErrorCode.AccountReallocExceedsLimit,
    "The account reallocation exceeds the MAX_PERMITTED_DATA_INCREASE limit",
  ],
  [
    LangErrorCode.AccountDuplicateReallocs,
    "The account was duplicated for more than one reallocation",
  ],

  // Miscellaneous
  [
    LangErrorCode.DeclaredProgramIdMismatch,
    "The declared program id does not match the actual program id",
  ],
  [
    LangErrorCode.TryingToInitPayerAsProgramAccount,
    "You cannot/should not initialize the payer account as a program account",
  ],
  [
    LangErrorCode.InvalidNumericConversion,
    "The program could not perform the numeric conversion, out of range integral type conversion attempted",
  ],

  // Deprecated
  [
    LangErrorCode.Deprecated,
    "The API being used is deprecated and should no longer be used",
  ],
]);

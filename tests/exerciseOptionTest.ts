import * as anchor from "@project-serum/anchor";
import {
  AccountInfo, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
  u64,
} from "@solana/spl-token";
import {
  AccountMeta,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import assert from "assert";
import { mintOptionsTx } from "../psyoptions-ts/src";
import {
  feeAmountPerContract,
  FEE_OWNER_KEY,
} from "../psyoptions-ts/src/fees";

import { OptionMarketV2 } from "../psyoptions-ts/src/types";
import { createMinter, initOptionMarket, initSetup } from "../utils/helpers";

describe("exercise option example", () => {
  const provider = anchor.Provider.env();
  const wallet = provider.wallet as typeof anchor.Wallet;
  const payer = anchor.web3.Keypair.generate();

  const program = anchor.workspace.SollarProtocol as anchor.Program;
  const psyAmericanProgram = anchor.workspace.PsyAmerican as anchor.Program;
  anchor.setProvider(provider);

});
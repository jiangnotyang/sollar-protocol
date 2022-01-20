import * as anchor from "@project-serum/anchor";
import { BN, Provider } from "@project-serum/anchor";
import {
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
  u64,
} from "@solana/spl-token";
import {
  AccountMeta,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getOrAddAssociatedTokenAccountTx } from "../psyoptions-ts/src";
import {
  feeAmountPerContract,
  FEE_OWNER_KEY,
} from "../psyoptions-ts/src/fees";
import { OptionMarketV2 } from "../psyoptions-ts/src/types";

// modified from psy-options ts helper.ts to allow specification of quote and
// underlying tokens

export const optionMarketInitSetup = async (
  provider: anchor.Provider,
  payer: Keypair,
  program: anchor.Program,
  underlyingToken: Token,
  quoteToken: Token,
  opts: {
    underlyingAmountPerContract?: anchor.BN;
    quoteAmountPerContract?: anchor.BN;
    mintFeeToken?: Token;
    exerciseFeeToken?: Token;
    mintFeeOwner?: PublicKey;
    exerciseFeeOwner?: PublicKey;
    expiration?: anchor.BN;
  } = {}
) => {
  const textEncoder = new TextEncoder();
  let underlyingAmountPerContract =
    opts.underlyingAmountPerContract || new anchor.BN("10000000000");
  let quoteAmountPerContract =
    opts.quoteAmountPerContract || new anchor.BN("50000000000");
  let expiration =
    opts.expiration || new anchor.BN(new Date().getTime() / 1000 + 3600);
  let optionMarketKey: PublicKey;
  let bumpSeed: number;
  let mintFeeKey = anchor.web3.Keypair.generate().publicKey;
  let exerciseFeeKey = anchor.web3.Keypair.generate().publicKey;
  let remainingAccounts: AccountMeta[] = [];
  let instructions: TransactionInstruction[] = [];

  [optionMarketKey, bumpSeed] = await anchor.web3.PublicKey.findProgramAddress(
    [
      underlyingToken.publicKey.toBuffer(),
      quoteToken.publicKey.toBuffer(),
      underlyingAmountPerContract.toBuffer("le", 8),
      quoteAmountPerContract.toBuffer("le", 8),
      expiration.toBuffer("le", 8),
    ],
    program.programId
  );

  const [optionMintKey, optionMintBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [optionMarketKey.toBuffer(), textEncoder.encode("optionToken")],
      program.programId
    );

  const [writerMintKey, writerMintBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [optionMarketKey.toBuffer(), textEncoder.encode("writerToken")],
      program.programId
    );
  const [quoteAssetPoolKey, quoteAssetPoolBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [optionMarketKey.toBuffer(), textEncoder.encode("quoteAssetPool")],
      program.programId
    );

  const [underlyingAssetPoolKey, underlyingAssetPoolBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [optionMarketKey.toBuffer(), textEncoder.encode("underlyingAssetPool")],
      program.programId
    );

  // Get the associated fee address if the market requires a fee
  const mintFeePerContract = feeAmountPerContract(underlyingAmountPerContract);
  if (mintFeePerContract.gtn(0)) {
    mintFeeKey = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      opts.mintFeeToken?.publicKey || underlyingToken.publicKey,
      opts.mintFeeOwner || FEE_OWNER_KEY
    );
    remainingAccounts.push({
      pubkey: mintFeeKey,
      isWritable: true,
      isSigner: false,
    });
    const ix = await getOrAddAssociatedTokenAccountTx(
      mintFeeKey,
      opts.mintFeeToken || underlyingToken,
      payer.publicKey,
      opts.mintFeeOwner || FEE_OWNER_KEY
    );
    if (ix) {
      instructions.push(ix);
    }
  }

  const exerciseFee = feeAmountPerContract(quoteAmountPerContract);
  if (exerciseFee.gtn(0)) {
    exerciseFeeKey = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      opts.exerciseFeeToken?.publicKey || quoteToken.publicKey,
      opts.exerciseFeeOwner || FEE_OWNER_KEY
    );
    remainingAccounts.push({
      pubkey: exerciseFeeKey,
      isWritable: false,
      isSigner: false,
    });
    const ix = await getOrAddAssociatedTokenAccountTx(
      exerciseFeeKey,
      opts.exerciseFeeToken || quoteToken,
      payer.publicKey,
      opts.exerciseFeeOwner || FEE_OWNER_KEY
    );
    if (ix) {
      instructions.push(ix);
    }
  }
  const optionMarket: OptionMarketV2 = {
    key: optionMarketKey,
    optionMint: optionMintKey,
    writerTokenMint: writerMintKey,
    underlyingAssetMint: underlyingToken.publicKey,
    quoteAssetMint: quoteToken.publicKey,
    underlyingAssetPool: underlyingAssetPoolKey,
    quoteAssetPool: quoteAssetPoolKey,
    mintFeeAccount: mintFeeKey,
    exerciseFeeAccount: exerciseFeeKey,
    underlyingAmountPerContract,
    quoteAmountPerContract,
    expirationUnixTimestamp: expiration,
    expired: false,
    bumpSeed,
  };

  const optionToken = new Token(
    provider.connection,
    optionMintKey,
    TOKEN_PROGRAM_ID,
    payer
  );

  return {
    quoteToken,
    underlyingToken,
    optionToken,
    underlyingAmountPerContract,
    quoteAmountPerContract,
    expiration,
    optionMarketKey,
    bumpSeed,
    mintFeeKey,
    exerciseFeeKey,
    optionMintKey,
    writerMintKey,
    underlyingAssetPoolKey,
    quoteAssetPoolKey,
    optionMarket,
    remainingAccounts,
    instructions,
  };
};

// Make a CPI call to psyAmerican option program to initialize an options market.
export const initPsyOptionMarket = async (
  program: anchor.Program, 
  payer: Keypair,
  optionMarket: OptionMarketV2,
  remainingAccounts: AccountMeta[],
  instructions: TransactionInstruction[]
) => {
  await program.rpc.initializeMarket(
    optionMarket.underlyingAmountPerContract,
    optionMarket.quoteAmountPerContract,
    optionMarket.expirationUnixTimestamp,
    optionMarket.bumpSeed,
    {
      accounts: {
        authority: payer.publicKey,
        underlyingAssetMint: optionMarket.underlyingAssetMint,
        quoteAssetMint: optionMarket.quoteAssetMint,
        optionMint: optionMarket.optionMint,
        writerTokenMint: optionMarket.writerTokenMint,
        quoteAssetPool: optionMarket.quoteAssetPool,
        underlyingAssetPool: optionMarket.underlyingAssetPool,
        optionMarket: optionMarket.key,
        feeOwner: FEE_OWNER_KEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
      remainingAccounts,
      signers: [payer],
      instructions,
    }
  );
};

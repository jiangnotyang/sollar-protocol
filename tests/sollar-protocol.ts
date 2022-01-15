import * as anchor from '@project-serum/anchor';
import { MarketProxy, OpenOrders, Market } from "@project-serum/serum";
import { MintInfo, Token, TOKEN_PROGRAM_ID, u64, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as serumCmn from "@project-serum/common";
import {
  AccountInfo,
  AccountMeta,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js"
import { Program } from '@project-serum/anchor';
import { assert } from "chai";
import { FEE_OWNER_KEY } from '../psyoptions-ts/src/fees';
import { OptionMarketV2 } from '../psyoptions-ts/src/types';
import { initOptionMarket, initSetup } from '../utils/helpers';
import {
  DEX_PID,
  getMarketAndAuthorityInfo,
  initMarket,
  marketLoader,
  openOrdersSeed,
} from "../utils/serum";
import { devnet } from '../psy-token-registry/src/devnet';
import { SollarProtocol } from '../target/types/sollar_protocol';
import { publicKey, token } from '@project-serum/anchor/dist/cjs/utils';

// Devnet Psyoptions Program ID
const psyoptionsProgramId = new PublicKey("R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs");


// Global Dex Variables
let marketProxy: MarketProxy;
// let wrappedBtcMint = new PublicKey("C6kYXcaRUMqeBF5fhg165RWU7AnpT9z92fvKNoMqjmz6");
// let officialUsdcMint = new PublicKey("E6Z6zLzk8MWY3TY8E87mr88FhGowEPJTeMWzkqtL6qkF");


const textEncoder = new TextEncoder();
const owner = anchor.web3.Keypair.generate();
const payer = anchor.web3.Keypair.generate();
const mintAuthority = anchor.web3.Keypair.generate();

let optionMarket: OptionMarketV2;
let underlyingToken: Token;
let quoteToken: Token;
let optionMarketKey: PublicKey;
let remainingAccounts: AccountMeta[] = [];
let instructions: TransactionInstruction[] = [];

describe('sollar-protocol', () => {

  anchor.setProvider(anchor.Provider.env());
  const provider = anchor.Provider.env();
  const program = anchor.workspace.SollarProtocol as Program<SollarProtocol>;
  const psyAmericanProgram = anchor.workspace.PsyAmerican;

  before(async() => {
    const sig = await provider.connection.requestAirdrop(owner.publicKey, 10000000000);
    await provider.connection.confirmTransaction(
      sig,
      "singleGossip"
    );

    const sig2 = await provider.connection.requestAirdrop(payer.publicKey, 10000000000);
    await provider.connection.confirmTransaction(
      sig2,
      "singleGossip"
    );

    ({
      instructions,
      optionMarket,
      optionMarketKey,
      quoteToken,
      underlyingToken,
      remainingAccounts,
    } = await initSetup(
      provider,
      payer, 
      owner,
      psyAmericanProgram
    ))
  })
  
  it('Initializes option market', async () => {

    await program.rpc.initOptionMarket(
      optionMarket.underlyingAmountPerContract,
      optionMarket.quoteAmountPerContract,
      optionMarket.expirationUnixTimestamp,
      optionMarket.bumpSeed, 
      {
        accounts: {
          user: payer.publicKey,
          psyAmericanProgram: psyAmericanProgram.programId,
          underlyingAssetMint: optionMarket.underlyingAssetMint,
          quoteAssetMint: optionMarket.quoteAssetMint,
          optionMint: optionMarket.optionMint,
          writerTokenMint: optionMarket.writerTokenMint,
          quoteAssetPool: optionMarket.quoteAssetPool,
          underlyingAssetPool: optionMarket.underlyingAssetPool,
          optionMarket: optionMarket.key,
          feeOwner: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
        },
        signers: [payer],
        remainingAccounts,
        instructions,
      }
    );

    const onChainOptionMarket = (await psyAmericanProgram.account.optionMarket.fetch(
      optionMarket.key,
    )) as OptionMarketV2;

    assert.equal(
      onChainOptionMarket.underlyingAssetMint?.toString(),
      underlyingToken.publicKey.toString(),
    );
    assert.equal(
      onChainOptionMarket.quoteAssetMint?.toString(),
      quoteToken.publicKey?.toString(),
    )
    assert.equal(
      onChainOptionMarket.underlyingAssetPool.toString(),
      optionMarket.underlyingAssetPool.toString(),
    )

    assert.equal(
      onChainOptionMarket.quoteAssetPool.toString(),
      optionMarket.quoteAssetPool.toString(),
    );

    assert.equal(
      onChainOptionMarket.mintFeeAccount?.toString(),
      optionMarket.mintFeeAccount.toString(),
    )

    assert.equal(
      onChainOptionMarket.exerciseFeeAccount?.toString(),
      optionMarket.exerciseFeeAccount.toString(),
    )

    assert.equal(
      onChainOptionMarket.expired?.toString(),
      optionMarket.expired.toString(),
    )
  })
});

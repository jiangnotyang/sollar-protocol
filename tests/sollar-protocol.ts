import * as anchor from '@project-serum/anchor';
import { MarketProxy, OpenOrders, Market } from "@project-serum/serum";
import { MintInfo, Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import * as serumCmn from "@project-serum/common";
import {
  AccountInfo,
  AccountMeta,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction
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
import { token } from '@project-serum/anchor/dist/cjs/utils';

// Devnet Psyoptions Program ID
const psyoptionsProgramId = new PublicKey("R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs");

// get all mints of devnet coins


// Global Psyoption Variables
let optionMarket: OptionMarketV2;

// Global Dex Variables
let marketProxy: MarketProxy;
let wrappedBtcMint = new PublicKey("C6kYXcaRUMqeBF5fhg165RWU7AnpT9z92fvKNoMqjmz6");
let officialUsdcMint = new PublicKey("E6Z6zLzk8MWY3TY8E87mr88FhGowEPJTeMWzkqtL6qkF");

let optionMarketKey: PublicKey;
let bumpSeed: number;
let underlyingAmountPerContract = new anchor.BN("1000000000");
let quoteAmountPerContract = new anchor.BN("5200000");
let expiration = new anchor.BN("1642863600");

describe('sollar-protocol', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const provider = anchor.Provider.env();
  const program = anchor.workspace.SollarProtocol as Program<SollarProtocol>;
  const psyAmericanProgram = anchor.workspace.PsyAmerican;

  console.log(psyAmericanProgram);
  const owner = anchor.web3.Keypair.generate();
  const payer = anchor.web3.Keypair.generate();

  it('Finds option market key for BTC/USDC Jan 22, 2022', async () => {
    [optionMarketKey, bumpSeed] = await anchor.web3.PublicKey.findProgramAddress(
      [
        wrappedBtcMint.toBuffer(),
        officialUsdcMint.toBuffer(),
        underlyingAmountPerContract.toBuffer("le", 8),
        quoteAmountPerContract.toBuffer("le", 8),
        expiration.toBuffer("le", 8)
      ],
      psyoptionsProgramId
    );
    console.log(optionMarketKey, bumpSeed);
  });

  it('play around with option order book', async () => {
   
  })
});

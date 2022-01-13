import * as anchor from '@project-serum/anchor';
import { MarketProxy, OpenOrders } from "@project-serum/serum";
import { MintInfo, Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import * as serumCmn from "@project-serum/common";
import {
  AccountInfo,
  AccountMeta,
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
import { SollarProtocol } from '../target/types/sollar_protocol';

describe('sollar-protocol', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.SollarProtocol as Program<SollarProtocol>;

  it('Is initialized!', async () => {
    // Add your test here.
  
  });
});

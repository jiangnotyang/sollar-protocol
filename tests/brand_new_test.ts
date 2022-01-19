import * as anchor from '@project-serum/anchor';
import { MarketProxy, OpenOrders } from "@project-serum/serum";
import { AccountLayout, MintInfo, Token, TOKEN_PROGRAM_ID, u64, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as serumCmn from "@project-serum/common";
import {
  AccountInfo,
  AccountMeta,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
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
import { initOptionMarket, initSetup, createMinter } from '../utils/helpers';
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
import { u16 } from 'buffer-layout';

const Side = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};
const OrderType = {
  Limit: { limit: {} },
  ImmediateOrCancel: { immediateOrCancel: {} },
  PostOnly: { postOnly: {} },
};
const SelfTradeBehavior = {
  DecrementTake: { decremenTtake: {} },
  CancelProvide: { cancelProvide: {} },
  AbortTransaction: { abortTransaction: {} },
};
describe("init option", () => {
  anchor.setProvider(anchor.Provider.env());
  const provider = anchor.Provider.env();
  const program = anchor.workspace.SollarProtocol as Program<SollarProtocol>;
  const psyAmericanProgram = anchor.workspace.PsyAmerican;

});
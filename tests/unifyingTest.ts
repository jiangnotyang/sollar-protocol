import * as anchor from "@project-serum/anchor";
import * as serumCommon from "@project-serum/common";
import {
	AccountMeta,
	Keypair,
	PublicKey,
	SystemProgram,
	SYSVAR_RENT_PUBKEY,
	Transaction,
} from "@solana/web3.js";
import { MintInfo, Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import { MarketProxy, OpenOrders } from "@project-serum/serum";
import { assert } from "chai";
import {
  DEX_PID,
  getMarketAndAuthorityInfo,
  initMarket,
  marketLoader,
  openOrdersSeed,
} from "../utils/serum";
import { OptionMarketV2 } from "../psyoptions-ts/src/types";
import { Market, OptionMarket } from "../psyoptions-ts/src";
import { token } from "@project-serum/anchor/dist/cjs/utils";
import { initSetup } from "../utils/helpers";
import { optionMarketInitSetup, initPsyOptionMarket}  from "../utils/sollarHelper";

let 
  programCallOptionVault: PublicKey,
  programPutOptionVault: PublicKey,
  programUsdcVault: PublicKey,
  programQuoteAssetVault: PublicKey, 
  
  callOptionMint: PublicKey,
  putOptionMint: PublicKey,
  usdcMint: PublicKey, 
  usdcToken: Token,
  quoteAssetMint: PublicKey,
  quoteAssetToken: Token,
  quoteAssetMintAuthority: Keypair,

  user: Keypair,
  userQuoteAssetTokenAccount: PublicKey,
  userUsdcTokenAccount: PublicKey;

let 
  optionMarket: OptionMarketV2,
  callOptionMarket: OptionMarketV2,
  callMarketProxy: MarketProxy,
  callMarketRemainingAccounts: anchor.web3.AccountMeta[],
  callMarketInstructions: anchor.web3.TransactionInstruction[],

  putOptionMarket: OptionMarketV2,
  putMarketProxy: MarketProxy,
  putMarketRemainingAccounts: anchor.web3.AccountMeta[],
  putMarketInstructions: anchor.web3.TransactionInstruction[];


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

const textEncoder = new TextEncoder();
const provider = anchor.Provider.env();
anchor.setProvider(provider);

describe("unified test begin", ()=> {

  user = anchor.web3.Keypair.generate();
  quoteAssetMintAuthority = anchor.web3.Keypair.generate();
  const wallet = provider.wallet as typeof anchor.Wallet;
  const sollarProgram = anchor.workspace.SollarProtocol as anchor.Program;
  const psyAmericanProgram = anchor.workspace.PsyAmerican as anchor.Program;
  describe("set up", ()=> {
    it("test", async()=> {
      // airdrop sol to user
      const sig = await provider.connection.requestAirdrop(user.publicKey, 10000000000);
      await provider.connection.confirmTransaction(
        sig,
        "singleGossip"
      );
      

      // create usdcMint and Token.
      [usdcMint] = await serumCommon.createMintAndVault(
        provider,
        new anchor.BN("10000000000000000"),
        undefined,
        2,
      );
      usdcToken = new Token(
        provider.connection,
        usdcMint,
        TOKEN_PROGRAM_ID,
        wallet.payer
      );
      
       // create quote asset mint
       [quoteAssetMint] = await serumCommon.createMintAndVault(
        provider,
        new anchor.BN("10000000000000000"),
        undefined,
        2,
      )

      quoteAssetToken = new Token(
        provider.connection,
        quoteAssetMint,
        TOKEN_PROGRAM_ID,
        wallet.payer,
      )
      
      // sets up 2 option markets: 1 for put and 1 for call with same expiry.  
      const {
        optionMarket: newCallOptionMarket,
        remainingAccounts: callRemainingAccounts,
        instructions: callInstructions,
      } = await optionMarketInitSetup(
        provider,
        wallet.payer,
        psyAmericanProgram,
        quoteAssetToken,
        usdcToken,
        {
          expiration: new anchor.BN(Math.floor(new Date().getTime())/1000 + 4),
          underlyingAmountPerContract: new anchor.BN("20000"),
          quoteAmountPerContract: new anchor.BN("100"),
        }
      );

      callOptionMarket = newCallOptionMarket;
      callMarketRemainingAccounts = callRemainingAccounts;
      callMarketInstructions = callInstructions;

      //initialize the call option market
      await initPsyOptionMarket(
        psyAmericanProgram,
        wallet.payer,
        callOptionMarket,
        callMarketRemainingAccounts,
        callMarketInstructions
      );
      

      const {
        optionMarket: newPutOptionMarket,
        remainingAccounts: putRemainingAccounts,
        instructions: putInstructions,
      } = await optionMarketInitSetup(
        provider,
        wallet.payer,
        psyAmericanProgram,
        usdcToken,
        quoteAssetToken,
        {
          expiration: new anchor.BN(Math.floor(new Date().getTime())/1000 + 4),
          underlyingAmountPerContract: new anchor.BN("100"),
          quoteAmountPerContract: new anchor.BN("20000"),
        }
      );

      putOptionMarket = newPutOptionMarket;
      putMarketRemainingAccounts = putRemainingAccounts;
      putMarketInstructions = putInstructions;

      // initialize the put option market
      await initPsyOptionMarket(
        psyAmericanProgram,
        wallet.payer,
        putOptionMarket,
        putMarketRemainingAccounts,
        putMarketInstructions
      );
    
      //Get some usdc token to user
      userUsdcTokenAccount = await usdcToken.createAssociatedTokenAccount(user.publicKey);
      await usdcToken.mintTo(
        userUsdcTokenAccount,
        provider.wallet.publicKey,
        [], 
        10000000000000
      );
      
     

      
      
    });

    it("successfully sets up vairous params", async() => {
      
    });
  });
});

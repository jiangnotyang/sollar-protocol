import * as anchor from "@project-serum/anchor";
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
  Transaction,
} from "@solana/web3.js";
import { assert } from "chai";
import { FEE_OWNER_KEY } from "../psyoptions-ts/src/fees";
import { OptionMarketV2 } from "../psyoptions-ts/src/types";
import { initOptionMarket, initSetup } from "../utils/helpers";
import {
  DEX_PID,
  getMarketAndAuthorityInfo,
  initMarket,
  marketLoader,
  openOrdersSeed,
} from "../utils/serum";
import { Market } from "../psyoptions-ts/src";

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

describe("New Order test", () => {
	const provider = anchor.Provider.env();
	const wallet = provider.wallet as typeof anchor.Wallet;
	anchor.setProvider(provider);
	const sollarProgram = anchor.workspace.SollarProtocol as anchor.Program;
	const psyAmericanProgram = anchor.workspace.PsyAmerican as anchor.Program;

	const mintAuthority = anchor.web3.Keypair.generate();
	let underlyingToken: Token,
		usdcToken: Token,
		optionToken: Token;
	
	let optionMarket: OptionMarketV2;

	// DEX Variables
	let marketProxy: MarketProxy,
		marketAuthority: anchor.web3.PublicKey,
		marketAuthorityBump: number,
		usdcMint: anchor.web3.PublicKey,
		usdcMintInfo: MintInfo,
		referral: anchor.web3.PublicKey,
		openOrders: anchor.web3.PublicKey,
		openOrdersBump: number,
		usdcVault: anchor.web3.PublicKey,
		usdcVaultBumpSeed: number,
		usdcVaultAuthority: anchor.web3.PublicKey,
		usdcVaultAuthBump: number;
	
	before(async ()=> {
		// create an option armetk

		const {
			optionMarket: newOptionMarket,
			remainingAccounts,
			instructions,
		} = await initSetup(
			provider,
			wallet.payer,
			mintAuthority,
			psyAmericanProgram
		);

		optionMarket = newOptionMarket;

		await initOptionMarket(
			psyAmericanProgram,
			wallet.payer,
			optionMarket,
			remainingAccounts,
			instructions
		);
		[usdcMint] = await serumCmn.createMintAndVault(
			provider,
			new anchor.BN("100000000000000000"),
			undefined,
			6,
		);

		({marketAuthority, marketAuthorityBump} = await getMarketAndAuthorityInfo(
			psyAmericanProgram,
			optionMarket,
			DEX_PID,
			usdcMint
		));

		({marketA: marketProxy } = await initMarket(
			provider, 
			psyAmericanProgram,
			marketLoader(provider, sollarProgram, optionMarket.key, marketAuthorityBump),
			optionMarket,
			usdcMint,
		));
		
		underlyingToken = new Token(
			provider.connection,
			optionMarket.underlyingAssetMint,
			TOKEN_PROGRAM_ID,
			wallet.payer
		);

		optionToken = new Token(
			provider.connection,
			optionMarket.optionMint,
			TOKEN_PROGRAM_ID,
			wallet.payer
		);

		usdcToken = new Token(
			provider.connection,
			usdcMint,
			TOKEN_PROGRAM_ID,
			wallet.payer            
		);
		referral = await usdcToken.createAssociatedTokenAccount(FEE_OWNER_KEY);
	});
	describe("initiate new order vualt", () => {
		it("create a usdc vault owned by program", async ()=> {
			[usdcVault, usdcVaultBumpSeed] = await anchor.web3.PublicKey.findProgramAddress(
				[usdcToken.publicKey.toBuffer(), textEncoder.encode("vault")],
				sollarProgram.programId,
			);
			[usdcVaultAuthority, usdcVaultAuthBump] = await anchor.web3.PublicKey.findProgramAddress(
				[usdcVault.toBuffer(), textEncoder.encode("usdcVaultAuthority")],
				sollarProgram.programId,
			);

			try {
				await sollarProgram.rpc.initOrderVault({
					accounts: {
						authority: provider.wallet.publicKey,
						usdcMint: usdcMint,
						vault: usdcVault,
						vaultAuthority: usdcVaultAuthority,
						tokenProgram: TOKEN_PROGRAM_ID,
						rent: SYSVAR_RENT_PUBKEY,
						systemProgram: SystemProgram.programId,
					},
				});
			} catch (err) {
				console.log((err as Error).toString());
			}

			const vaultAccount = await usdcToken.getAccountInfo(usdcVault);
			assert.ok(vaultAccount.owner.equals(usdcVaultAuthority));
		});
	});
	describe("place a new order", () => {
		before(async () => {
			usdcMintInfo = await usdcToken.getMintInfo();
			
			await usdcToken.mintTo(
				usdcVault,
				provider.wallet.publicKey,
				[],
				new u64(10_000_000 * usdcMintInfo.decimals)
			);

			[openOrders, openOrdersBump] = await anchor.web3.PublicKey.findProgramAddress(
				[
					openOrdersSeed,
					marketProxy.dexProgramId.toBuffer(),
					marketProxy.market.address.toBuffer(),
					usdcVaultAuthority.toBuffer(),
				],
				psyAmericanProgram.programId
			);
		});
		it("should create an open orders account and place an order on serum orderbook", async()=> {
			const price = 1;
			const size = 22;

			try{
				await sollarProgram.rpc.placeOrder(
					usdcVaultAuthBump,
					openOrdersBump,
					marketAuthorityBump,
					Side.Bid,
					marketProxy.market.priceNumberToLots(price),
					marketProxy.market.baseSizeNumberToLots(size),
					OrderType.PostOnly,
					new anchor.BN(999),
					SelfTradeBehavior.AbortTransaction,
					new anchor.BN(65535),
					new anchor.BN(
						//@ts-ignore
						marketProxy.market._decoded.quoteLotSize.toNumber()
					).mul(
						marketProxy.market
						.baseSizeNumberToLots(size)
						.mul(marketProxy.market.priceNumberToLots(price))
					),
					{
						accounts:{
							userAuthority: provider.wallet.publicKey,
							psyAmericanProgram: psyAmericanProgram.programId,
							dexProgram: DEX_PID,
							openOrders,
							market: marketProxy.market.address,
							psyMarketAuthority: marketAuthority,
							vault: usdcVault,
							vaultAuthority: usdcVaultAuthority,
							//@ts-ignore
							requestQueue: marketProxy.market._decoded.requestQueue,
							//@ts-ignore
							eventQueue: marketProxy.market._decoded.eventQueue,
							marketBids: marketProxy.market.bidsAddress,
							marketAsks: marketProxy.market.asksAddress,
							//@ts-ignore
							coinVault: marketProxy.market._decoded.baseVault,
							//@ts-ignore
							pcVault: marketProxy.market._decoded.quoteVault,

							systemProgram: SystemProgram.programId,
							tokenProgram: TOKEN_PROGRAM_ID,
							rent: SYSVAR_RENT_PUBKEY,
						},
					}
				) 
			} catch (err) {
				console.log("error", (err as Error).toString());
				throw err;
			}

			const openOrdersAcct = await OpenOrders.load(
				provider.connection,
				openOrders,
				DEX_PID,
			);
			assert.ok(openOrdersAcct.owner.equals(openOrders));

			let bids = await marketProxy.market.loadBids(provider.connection);
			let l2 = await bids.getL2(3);
			assert.equal(l2.length, 1);

		});
		describe("Open orders account exists", () => {
			it("should place order without fail", async() => {
				const openOrdersAcct = await OpenOrders.load(
					provider.connection,
					openOrders,
					DEX_PID,
				)
			})
		});
	});
});
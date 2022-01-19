import * as anchor from "@project-serum/anchor";
import { MarketProxy, OpenOrders } from "@project-serum/serum";
import { MintInfo, Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import * as serumCmn from "@project-serum/common";
import {
	AccountMeta,
	Keypair,
	PublicKey,
	SystemProgram,
	SYSVAR_RENT_PUBKEY,
	Transaction,
} from "@solana/web3.js";
import { AccountInfo } from "@solana/spl-token";
import { assert } from "chai";
import { FEE_OWNER_KEY } from "../psyoptions-ts/src/fees";
import { OptionMarketV2 } from "../psyoptions-ts/src/types";
import { initOptionMarket, initSetup, createMinter } from "../utils/helpers";
import { mintOptionsTx } from "../psyoptions-ts/src";
import { Market } from "../psyoptions-ts/src";

describe("exercising an option", () => {
	const provider = anchor.Provider.env();
	const payer = anchor.web3.Keypair.generate();
	const user = anchor.web3.Keypair.generate();
	const mintAuthority = anchor.web3.Keypair.generate();

	const sollarProgram = anchor.workspace.SollarProtocol as anchor.Program;
	const psyAmericanProgram = anchor.workspace.PsyAmerican as anchor.Program;
	anchor.setProvider(provider);

	// Some global variables
	let underlyingToken: Token,
		optionToken: Token,
		optionMarketKey: PublicKey,
		remainingAccounts: AccountMeta[] = [],
		optionMarket: OptionMarketV2,
		vaultAccount: AccountInfo,
		userWriterAccount: Keypair,
		userOptionAccount: Keypair,
		userUnderlyingAccount: Keypair,
		userQuoteAccount: Keypair,
		vaultAuthority: PublicKey,
		vaultAuthorityBump: number,
		exerciseFeeKey: PublicKey;
	
	let size = new u64(1);
	before(async () => {
		await provider.connection.confirmTransaction(
			await provider.connection.requestAirdrop(
				payer.publicKey,
				10_000_000_000
			),
			"confirmed"
		);

		await provider.connection.confirmTransaction(
			await provider.connection.requestAirdrop(
				user.publicKey,
				10_000_000_000
			),
			"confirmed"
		);
			
		// Set up an option market
		const {
			instructions,
			optionMarket: newOptionMarket,
			optionMarketKey: _optionMarketKey,
			quoteToken,
			remainingAccounts: _remainingAccounts,
			underlyingToken: _underlyingToken,
		} = await initSetup(
			provider,
			(provider.wallet as typeof anchor.Wallet).payer,
			mintAuthority,
			psyAmericanProgram
		);
		
		optionMarketKey = _optionMarketKey;
		optionMarket = newOptionMarket;
		remainingAccounts = _remainingAccounts;
		underlyingToken = _underlyingToken;

		await initOptionMarket(
			psyAmericanProgram,
			(provider.wallet as typeof anchor.Wallet).payer,
			optionMarket,
			remainingAccounts,
			instructions
		);
		optionToken = new Token(
			provider.connection,
			optionMarket.optionMint,
			TOKEN_PROGRAM_ID,
			payer,
		);
		
		({
			optionAccount: userOptionAccount,
			underlyingAccount: userUnderlyingAccount,
			writerTokenAccount: userWriterAccount,
			quoteAccount: userQuoteAccount,
		} = await createMinter(
			provider.connection,
			user,
			mintAuthority,
			underlyingToken,
			new anchor.BN(100)
				.mul(optionMarket.underlyingAmountPerContract)
				.muln(2)
				.toNumber(),
			optionMarket.optionMint,
			optionMarket.writerTokenMint,
			quoteToken,
			new anchor.BN(100)
				.mul(optionMarket.quoteAmountPerContract)
				.muln(2)
				.toNumber()
		));

		await mintOptionsTx(
			psyAmericanProgram,
			user,
			userOptionAccount,
			userWriterAccount,
			userUnderlyingAccount,
			new anchor.BN(25),
			optionMarket,
		);
		it("should initialize option vault", async() => {
			const size = new anchor.BN(1);
			const textEncoder = new TextEncoder();
			const [vault, _vaultBump] = await PublicKey.findProgramAddress(
				[optionMarket.optionMint.toBuffer(), textEncoder.encode("vault")],
				sollarProgram.programId,
			);

			[vaultAuthority, vaultAuthorityBump] = await PublicKey.findProgramAddress(
				[optionMarket.key.toBuffer(), textEncoder.encode("vaultAuthority")],
				sollarProgram.programId,
			);
			await sollarProgram.rpc.initializeOptionVault(size, {
				accounts: {
					authority: user.publicKey,
					optionSource: userOptionAccount.publicKey,
					optionMint: optionMarket.optionMint,
					vault,
					vaultAuthority,
					tokenProgram: TOKEN_PROGRAM_ID,
					rent: SYSVAR_RENT_PUBKEY,
					systemProgram: SystemProgram.programId,
				},
				signers: [user]
			});
		});
	});
})


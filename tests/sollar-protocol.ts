import * as anchor from '@project-serum/anchor';
import { MarketProxy, OpenOrders, Market } from "@project-serum/serum";
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
let optionToken: Token;
let remainingAccounts: AccountMeta[] = [];
let instructions: TransactionInstruction[] = [];
let optionMarketKey: PublicKey;
let underLyingAmountPerContract: anchor.BN;
let quoteAmountPerContract: anchor.BN;
let opts: {};
let writerToken: Token;
let writerTokenAccount;
let writerOptionAccount: PublicKey;

let vault: PublicKey;
let vaultAuthority: PublicKey;
let _vaultBump;
let _vaultAuthorityBump;


describe('init option', () => {

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
    // Set up the option market params according to initsetup 
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
      psyAmericanProgram,
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
  });
  describe("Option asset vault", () => {
    it("Initializes a mint option asset vault", async () => {
      [vault, _vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
        [underlyingToken.publicKey.toBuffer(), textEncoder.encode("vault")],
        program.programId,
      );
  
      [vaultAuthority, _vaultAuthorityBump] = await anchor.web3.PublicKey.findProgramAddress(
        [underlyingToken.publicKey.toBuffer(), textEncoder.encode("vaultAuthority")],
        program.programId
      );
  
      await program.rpc.initProgramVaults({
        accounts: {
          authority: payer.publicKey,
          optionUnderlyingAsset: underlyingToken.publicKey,
          mintOptionAssetVault: vault,
          mintOptionAssetVaultAuthority: vaultAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        },
        signers: [payer]
      });
    });
  });
  
  describe("deposit funds into the program mint option asset vault", () => {
    it("should create a token account owned by program for option minting", async() => {
      await underlyingToken.mintTo(vault, owner, [], 10000000000);
      const vaultAccount = await underlyingToken.getAccountInfo(vault);
      console.log(vaultAccount.amount.toNumber());

    });
  });

  describe("Minting options", () => {
    it("should mint options to the program controlled account", async() => {
      writerToken = new Token(
        provider.connection,
        optionMarket.writerTokenMint,
        TOKEN_PROGRAM_ID,
        payer,
      );
      optionToken = new Token(
        provider.connection,
        optionMarket.optionMint,
        TOKEN_PROGRAM_ID,
        payer,
      )
      writerOptionAccount = await optionToken.createAccount(payer.publicKey);

      writerTokenAccount = await writerToken.createAccount(payer.publicKey);
      const writerAccountInfo = await writerToken.getAccountInfo(writerTokenAccount);
      const size = new anchor.BN("1");
      const optionMintInfoBefore = await optionToken.getMintInfo();
      const vaultUnderlyingBefore = await underlyingToken.getAccountInfo(vault);
      const vaultAuthorityBump = _vaultAuthorityBump;
      console.log(optionMarket.underlyingAmountPerContract.toNumber());
      try {
        await program.rpc.mintOption(size, vaultAuthorityBump, {
          accounts: {
            authority: payer.publicKey,
            psyAmericanProgram: psyAmericanProgram.programId,
            mintOptionAssetVault: vault,
            mintOptionAssetVaultAuthority: vaultAuthority,
            underlyingAssetMint: underlyingToken.publicKey,
            underlyingAssetPool: optionMarket.underlyingAssetPool,
            optionMint: optionMarket.optionMint,
            mintedOptionDest: writerOptionAccount,
            writerTokenMint: optionMarket.writerTokenMint,
            mintedWriterTokenDest: writerTokenAccount,
            optionMarket: optionMarket.key,
            feeOwner: FEE_OWNER_KEY,

            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            clock: SYSVAR_CLOCK_PUBKEY,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
          },
          signers: [payer],
        });
      } catch (err) {
        console.log((err as Error).toString());
        throw err;
      }
    });
  });

});


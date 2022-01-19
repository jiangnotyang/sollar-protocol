use anchor_lang::prelude::*;
use anchor_spl::dex::serum_dex::instruction::NewOrderInstructionV1;
use anchor_spl::token::{self, Transfer};
use errors::ErrorCode;
use anchor_lang::InstructionData;
use context::*;
use psy_american::program::PsyAmerican;
use psy_american::cpi::accounts::{ExerciseOption, MintOptionV2};
use anchor_spl::dex::serum_dex;
use anchor_spl::dex::serum_dex::{instruction::SelfTradeBehavior as SerumSelfTradeBehavior, matching::{OrderType as SerumOrderType, Side as SerumSide}};
use psy_american::OptionMarket;
use psy_american::instruction::InitializeMarket;
use std::num::NonZeroU64;

pub mod context;
pub mod errors;
pub mod structs;

declare_id!("GGctambdwXbK5VnbLkyR9xfn3gvJgZVE4yfxQVCkkh5t");

#[derive(Debug, AnchorDeserialize, AnchorSerialize)]
pub enum SelfTradeBehaviour {
    DecrementTake = 0,
    CancelProvide = 1,
    AbortTransaction = 2,
}

impl From<SelfTradeBehaviour> for SerumSelfTradeBehavior {
    fn from(self_trade_behave: SelfTradeBehaviour) -> SerumSelfTradeBehavior {
        match self_trade_behave {
            SelfTradeBehaviour::DecrementTake => SerumSelfTradeBehavior::DecrementTake,
            SelfTradeBehaviour::CancelProvide => SerumSelfTradeBehavior::CancelProvide,
            SelfTradeBehaviour::AbortTransaction => SerumSelfTradeBehavior::AbortTransaction,
        }
    }
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize)]
pub enum NewSide{
    Bid,
    Ask,
}

impl From<NewSide> for SerumSide {
    fn from(side: NewSide) -> SerumSide {
        match side {
            NewSide::Bid => SerumSide::Bid,
            NewSide::Ask => SerumSide::Ask,
        }
    }
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize)]
pub enum OrderType {
    Limit = 0,
    ImmediateOrCancel = 1,
    PostOnly = 2,
}
impl From<OrderType> for SerumOrderType {
    fn from(order_type: OrderType) -> SerumOrderType {
        match order_type {
            OrderType::Limit => SerumOrderType::Limit,
            OrderType::ImmediateOrCancel => SerumOrderType::ImmediateOrCancel,
            OrderType::PostOnly => SerumOrderType::PostOnly,
        }
    }
}

#[program]
pub mod sollar_protocol {
    use super::*;

    pub fn initialize_program(
        ctx: Context<InitializeProgram>,
        _state_nonce: u8,
    ) -> ProgramResult {


        Ok(())
    }

    // Each asset (SPL token) requires a separate mint vault controlled by program.
    // Initialize Deposit Vault creates a vault of a particular mint controlled by the program
    // This function does not take in the deposit. Only prepares a token account controlled by the program
    // to receive the deposit once a deposit asset to mint bond has been confirmed.

    pub fn initialize_deposit_vault(
        ctx: Context<InitializeDepositVault>,
    ) -> ProgramResult {
        let (vault_authority, vault_bump_seed) = Pubkey::find_program_address(
            &[&ctx.accounts.vault_mint.to_account_info().key.to_bytes()],
            ctx.program_id
        );

        let seeds = &[
            &ctx.accounts.vault_mint.to_account_info().key.to_bytes(),
            &[vault_bump_seed][..],
        ];

        if *ctx.accounts.authority.key !=  vault_authority {
            return Err(ErrorCode::InvalidVaultAuthority.into());
        }
        
        let vault = &mut ctx.accounts.vault;
        vault.is_initialized = true;
        vault.vault_bump = vault_bump_seed;
        vault.vault_mint = *ctx.accounts.vault_mint.to_account_info().key;
        vault.authority = *ctx.accounts.authority.key;

        Ok(())
    }

    // Mint a bond based the specific vault mint of the deposited asset
    // & maturity date of the option. Option quotes are grabbed from client side
    // and double checked via IOC Limit order on serum orderbook

    // 
    pub fn mint_bond(
        ctx: Context<MintBond>,
    ) -> ProgramResult {
        
        Ok(())
    }

    // call to psy_American to init an options market
    pub fn init_option_market<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, InitOptionMarket<'info>>,
        underlying_amount_per_contract: u64,
        quote_amount_per_contract: u64,
        expiration_unix_timestamp: i64,
        bump_seed: u8
    ) -> ProgramResult{
        let cpi_program = ctx.accounts.psy_american_program.clone();
        let init_market_args = InitializeMarket {
            underlying_amount_per_contract,
            quote_amount_per_contract,
            expiration_unix_timestamp,
            bump_seed
        };
        let mut cpi_accounts = vec![
            ctx.accounts.user.to_account_metas(Some(true))[0].clone(),
            // The Mint of the underlying asset for the contracts. Also the mint that is in the vault.
            ctx.accounts.underlying_asset_mint.to_account_metas(Some(false))[0].clone(),
            ctx.accounts.quote_asset_mint.to_account_metas(Some(false))[0].clone(),
            // The mint of the option
            ctx.accounts.option_mint.to_account_metas(Some(false))[0].clone(),
            // The Mint of the writer token for the OptionMarket
            ctx.accounts.writer_token_mint.to_account_metas(Some(false))[0].clone(),
            ctx.accounts.quote_asset_pool.to_account_metas(Some(false))[0].clone(),
            // The underlying asset pool for the OptionMarket
            ctx.accounts.underlying_asset_pool.to_account_metas(Some(false))[0].clone(),
            // The PsyOptions OptionMarket to mint from
            ctx.accounts.option_market.to_account_metas(Some(false))[0].clone(),
            // The fee_owner that is a constant in the PsyAmerican contract
            ctx.accounts.fee_owner.to_account_metas(Some(false))[0].clone(),
            // The rest are self explanatory, we can't spell everything out for you ;)
            ctx.accounts.token_program.to_account_metas(Some(false))[0].clone(),
            ctx.accounts.associated_token_program.to_account_metas(Some(false))[0].clone(),
            ctx.accounts.rent.to_account_metas(Some(false))[0].clone(),
            ctx.accounts.system_program.to_account_metas(Some(false))[0].clone(),
            ctx.accounts.clock.to_account_metas(Some(false))[0].clone(),
        ];
        let mut account_infos = vec![
            ctx.accounts.user.to_account_info().clone(),
            ctx.accounts.underlying_asset_mint.to_account_info().clone(),
            ctx.accounts.quote_asset_mint.to_account_info().clone(),
            ctx.accounts.option_mint.to_account_info().clone(),
            ctx.accounts.writer_token_mint.to_account_info().clone(),
            ctx.accounts.quote_asset_pool.to_account_info().clone(),
            ctx.accounts.underlying_asset_pool.to_account_info().clone(),
            ctx.accounts.option_market.to_account_info().clone(),
            ctx.accounts.fee_owner.to_account_info().clone(),
            ctx.accounts.token_program.to_account_info().clone(),
            ctx.accounts.associated_token_program.to_account_info().clone(),
            ctx.accounts.rent.to_account_info().clone(),
            ctx.accounts.system_program.to_account_info().clone(),
            ctx.accounts.clock.to_account_info().clone(),
        ];
        for remaining_account in ctx.remaining_accounts {
            cpi_accounts.push(remaining_account.to_account_metas(Some(false))[0].clone());
            account_infos.push(remaining_account.clone());
        }

        let ix = solana_program::instruction::Instruction {
            program_id: *cpi_program.key,
            accounts: cpi_accounts,
            data: init_market_args.data()
        };

        solana_program::program::invoke(&ix, &account_infos)
    }

    
    // Init option underlying asset mint vault, and Sollar bond vault
    // Currently only init the option asset mint vault but TODO as adding deposit 
    pub fn init_program_vaults(_ctx: Context<InitProgramVaults>, ) -> ProgramResult {
        
        Ok(())
    }

    // mint call option contract 
    pub fn mint_option<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, MintCtx<'info>>, 
        size: u64, 
        vault_authority_bump: u8
    ) -> ProgramResult{
        let cpi_program = ctx.accounts.psy_american_program.clone();

        let cpi_accounts = MintOptionV2 {
            user_authority: ctx.accounts.mint_option_asset_vault_authority.to_account_info(),
            // The Mint of the underlying asset for the contracts. Also the mint that is in the vault.
            underlying_asset_mint: ctx.accounts.underlying_asset_mint.to_account_info(),
            // The underlying asset pool for the OptionMarket
            underlying_asset_pool: ctx.accounts.underlying_asset_pool.to_account_info(),
            // The source account where the underlying assets are coming from. In this case it's the vault.
            underlying_asset_src: ctx.accounts.mint_option_asset_vault.to_account_info(),
            // The mint of the option
            option_mint: ctx.accounts.option_mint.to_account_info(),
            // The destination for the minted options
            minted_option_dest: ctx.accounts.minted_option_dest.to_account_info(),
            // The Mint of the writer token for the OptionMarket
            writer_token_mint: ctx.accounts.writer_token_mint.to_account_info(),
            // The destination for the minted WriterTokens
            minted_writer_token_dest: ctx.accounts.minted_writer_token_dest.to_account_info(),
            // The PsyOptions OptionMarket to mint from
            option_market: ctx.accounts.option_market.to_account_info(),
            // The rest are self explanatory, we can't spell everything out for you ;)
            token_program: ctx.accounts.token_program.to_account_info(),
        };

        let key = ctx.accounts.underlying_asset_mint.key();

        let seeds = &[
            key.as_ref(),
            b"orderVaultAuthority",
            &[vault_authority_bump]
        ];

        let signer = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        psy_american::cpi::mint_option_v2(cpi_ctx, size)
    }
    // new order vault for option order to be used for place order later.
    pub fn init_order_vault(_ctx: Context<InitOrderVault>) -> ProgramResult{
        Ok(())
    }

    pub fn init_option_vault(ctx: Context<InitializeOptionVault>, amount: u64) -> ProgramResult{
        let cpi_accounts = Transfer{
            from: ctx.accounts.option_source.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.authority.clone(),
        };

        let cpi_token_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_token_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn exercise<'a, 'b, 'c, 'info>(ctx: Context<'a, 'b, 'c, 'info, Exercise<'info>>, vault_authority_bump: u8) -> ProgramResult {
        let cpi_program = ctx.accounts.psy_american_program.clone();
        let cpi_accounts = ExerciseOption{
            user_authority: ctx.accounts.authority.to_account_info(),
            option_authority: ctx.accounts.vault_authority.to_account_info(),
            option_market: ctx.accounts.option_market.to_account_info(),
            option_mint: ctx.accounts.option_mint.to_account_info(),
            exerciser_option_token_src: ctx.accounts.exerciser_option_token_src.to_account_info(),
            underlying_asset_pool: ctx.accounts.underlying_asset_pool.to_account_info(),
            underlying_asset_dest: ctx.accounts.underlying_asset_dest.to_account_info(),
            quote_asset_pool: ctx.accounts.quote_asset_pool.to_account_info(),
            quote_asset_src: ctx.accounts.quote_asset_src.to_account_info(),
            fee_owner: ctx.accounts.fee_owner.clone(),
            token_program: ctx.accounts.token_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            clock: ctx.accounts.clock.to_account_info(),
        };
        
        let key = ctx.accounts.option_market.key();

        let seeds = &[
            key.as_ref(),
            b"vaultAuthority", 
            &[vault_authority_bump]
        ];

        let signer = &[&seeds[..]];
        let mut cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        cpi_ctx.remaining_accounts = ctx.remaining_accounts.to_vec();

        psy_american::cpi::exercise_option(cpi_ctx, ctx.accounts.exerciser_option_token_src.amount)
    }

    // place order for option
    pub fn place_order(
        ctx: Context<PlaceOrder>,
        vault_authority_bump: u8,
        open_order_bump: u8,
        open_order_bump_init: u8,
        side: NewSide,
        limit_price: u64,
        max_coin_qty: u64,
        order_type: OrderType,
        client_order_id: u64,
        self_trade_behaviour: SelfTradeBehaviour,
        limit: u16,
        max_native_pc_qty_including_fees: u64,
    ) -> ProgramResult {
        let cpi_program = ctx.accounts.psy_american_program.clone();
        //create new open order account if open_orders account is empty
        if ctx.accounts.open_orders.data_is_empty() {
            solana_program::program::invoke(
                &solana_program::system_instruction::transfer(
                    &ctx.accounts.user_authority.key,
                    &ctx.accounts.vault_authority.key,
                    23357760
                ),
                &[
                    ctx.accounts.user_authority.to_account_info(),
                    ctx.accounts.vault_authority.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;

            let mut ix = serum_dex::instruction::init_open_orders (
                &ctx.accounts.dex_program.key,
                ctx.accounts.open_orders.key,
                ctx.accounts.vault_authority.key,
                ctx.accounts.market.key,
                Some(ctx.accounts.psy_market_authority.key),
            )?;
            ix.program_id = *cpi_program.key;
            ix.accounts[0].pubkey = ctx.accounts.open_orders.key();
            ix.accounts[4].pubkey = ctx.accounts.psy_market_authority.key();
            ix.accounts[4].is_signer = false;
            ix.accounts[1].is_writable = true;
            ix.accounts.insert(0, ctx.accounts.system_program.to_account_metas(Some(false))[0].clone());
            ix.accounts.insert(0, ctx.accounts.dex_program.to_account_metas(Some(false))[0].clone());
            ix.data.insert(0, open_order_bump_init);
            ix.data.insert(0, open_order_bump);
            ix.data.insert(0, 0 as u8);
            ix.data.insert(0, 0 as u8);
            ix.accounts.insert(0, ctx.accounts.dex_program.to_account_metas(Some(false))[0].clone());
            let vault_key = ctx.accounts.vault.key();
            let vault_authority_seeds =  &[
                vault_key.as_ref(),
                b"usdcVaultAuthority",
                &[vault_authority_bump]
            ];

            solana_program::program::invoke_signed(
                &ix,
                &[
                    ctx.accounts.psy_american_program.to_account_info(),
                    ctx.accounts.dex_program.to_account_info(),
                    ctx.accounts.open_orders.to_account_info(),
                    ctx.accounts.vault_authority.to_account_info(),
                    ctx.accounts.market.to_account_info(),
                    ctx.accounts.psy_market_authority.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    ctx.accounts.rent.to_account_info()
                ],
                &[vault_authority_seeds],
            )?;

        }

        let mut new_order_ix = serum_dex::instruction::new_order(
            ctx.accounts.market.key,
            ctx.accounts.open_orders.key,
            ctx.accounts.request_queue.key,
            ctx.accounts.event_queue.key,
            ctx.accounts.market_bids.key,
            ctx.accounts.market_asks.key,
            &ctx.accounts.vault.key(),
            ctx.accounts.vault_authority.key,
            ctx.accounts.coin_vault.key,
            ctx.accounts.pc_vault.key,
            ctx.accounts.token_program.key,
            &ctx.accounts.rent.key(),
            None,
            ctx.accounts.dex_program.key,
            side.into(),
            NonZeroU64::new(limit_price).unwrap(),
            NonZeroU64::new(max_coin_qty).unwrap(),
            order_type.into(),
            client_order_id,
            self_trade_behaviour.into(),
            limit,
            NonZeroU64::new(max_native_pc_qty_including_fees).unwrap()
        )?;


        new_order_ix.program_id = *cpi_program.key;
        new_order_ix.data.insert(0, 1 as u8);
        new_order_ix.data.insert(0, 1 as u8);
        new_order_ix.accounts.insert(0, ctx.accounts.dex_program.to_account_metas(Some(false))[0].clone());
        let vault_key = ctx.accounts.vault.key();
        let vault_authority_seeds = &[
            vault_key.as_ref(),
            b"usdcVaultAuthority",
            &[vault_authority_bump]
        ];

        solana_program::program::invoke_signed(
            &new_order_ix,
            &[
                ctx.accounts.market.to_account_info(),
                ctx.accounts.open_orders.to_account_info(),
                ctx.accounts.request_queue.to_account_info(),
                ctx.accounts.event_queue.to_account_info(),
                ctx.accounts.market_bids.to_account_info(),
                ctx.accounts.market_asks.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.vault_authority.to_account_info(),
                ctx.accounts.coin_vault.to_account_info(),
                ctx.accounts.pc_vault.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.rent.to_account_info(),
            ],
            &[vault_authority_seeds],
        )?;

        Ok(())
    }


}



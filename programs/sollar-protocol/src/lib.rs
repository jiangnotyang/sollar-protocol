use anchor_lang::prelude::*;
use errors::ErrorCode;
use anchor_lang::InstructionData;
use context::*;
use psy_american::program::PsyAmerican;
use psy_american::cpi::accounts::{ExerciseOption, MintOptionV2};
use psy_american::OptionMarket;
use psy_american::instruction::InitializeMarket;

pub mod context;
pub mod errors;
pub mod structs;

declare_id!("GGctambdwXbK5VnbLkyR9xfn3gvJgZVE4yfxQVCkkh5t");

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
        // msg!("cpi_accounts {:?}", cpi_accounts);
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
}



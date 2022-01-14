use anchor_lang::prelude::*;
use errors::ErrorCode;
use context::*;
use psy_american::program::PsyAmerican;
use psy_american::instruction::InitializeMarket;

pub mod context;
pub mod errors;
pub mod structs;

declare_id!("133UvExsEqA1phGRHUgDP2RJQrcPzZSpGgvTrbtD8DbR");

#[program]
pub mod sollar_protocol {
    use super::*;

    // What needs to be initialized except for the deposit vaults
    // a circuit breaker?
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
        let vault = &mut ctx.accounts.vault;

        if !(vault.is_initialized) {
            return Err(ErrorCode::VaultNotInitialized.into());
        }

        

        Ok(())
    }
}



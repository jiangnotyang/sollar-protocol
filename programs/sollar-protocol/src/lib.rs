use anchor_lang::prelude::*;
use errors::ErrorCode;
use context::*;

pub mod context;
pub mod errors;
pub mod structs;

declare_id!("HJXZKYVgk69LLGLEp8tFiUWi6AZ6z4VCNZgTudHMxk2t");

#[program]
pub mod sollar_protocol {
    use super::*;

    // What needs to be initialized except for the deposit vaults
    // A circuit breaker?
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
            &ctx.accounts.vault_mint.to_account_info.key.to_bytes(),
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
        vault.token_program_id = *ctx.accounts.token_program_id.key;

        Ok(())
    }

    pub fn deposit_assets_mint_bond(
        ctx: Context<DepositAssetsMintBond>
    ) -> ProgramResult {
        // Todo
        Ok(())
    }
}

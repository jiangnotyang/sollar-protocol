use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::structs::{State, Vault};

#[derive(Accounts)]
#[instruction(
    state_nonce: u8,
)]
pub struct InitializeProgram<'info> {
    #[account(
        init,
        payer = admin,
        seeds = [b"program_state".as_ref()],
        bump = state_nonce,
    )]
    pub state: Box<Account<'info, State>>,
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(
    vault_nonce: u8
)]
pub struct InitializeDepositVault<'info>{
    pub authority: AccountInfo<'info>,
    #[account(signer)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub vault_mint: Account<'info, Mint>,
    #[account(mut)]
    pub vault_mint_account: Account<'info, TokenAccount>,
    pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct MintBond<'info>{
    pub user: Signer<'info>,
    pub psy_american_program: AccountInfo<'info>,

}

#[derive(Accounts)]
pub struct InitOptionMarket<'info> {
    // Sollar protocol admin wallet
    pub user: Signer<'info>,
    pub psy_american_program: AccountInfo<'info>,

    // Depending on whether call or put is to be put or bought
    pub underlying_asset_mint: Box<Account<'info, Mint>>,
    pub quote_asset_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub option_mint: AccountInfo<'info>,
    #[account(mut)]
    pub writer_token_mint: AccountInfo<'info>,
    #[account(mut)]
    pub quote_asset_pool: AccountInfo<'info>,
    #[account(mut)]
    pub underlying_asset_pool: AccountInfo<'info>,
    #[account(mut)]
    pub option_market: AccountInfo<'info>,
    pub fee_owner: AccountInfo<'info>,

    pub token_program: AccountInfo<'info>,
    pub associated_token_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>


}
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::State;

#[derive(Accounts)]
#[instruction(
    state_nonce: u8,
)]
pub struct InitializeProgramState<'info> {
    #[account(
        init,
        payer = admin,
        seeds = [b"state".as_ref()],
        bump = state_nonce,
    )]
    pub state: Box<Account<'info, State>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(
    vault_nonce: u8
)]
pub struct InitializeVault<'info>{
    pub admin: AccountInfo<'info>,
    #[account(
        init,
        payer = admin,
        seeds = [vault_mint.key.as_ref()],
        bump = vault_nonce,
        token::mint = vault_mint,
        token::authority = admin,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub vault_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    // Todo 
}

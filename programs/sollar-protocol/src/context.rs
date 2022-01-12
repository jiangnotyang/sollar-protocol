use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::State;

#[derive(Accounts)]
#[instruction(
    vault_nonce: u8,
    state_nonce: u8,
)]
pub struct InitializeProgramState<'info> {
    pub admin: Signer<'info>,
    #[account(
        init,
        seeds = [b"program_vault".as_ref()],
        bump = vault_nonce,
        payer = admin,
        token::mint = vault_mint,
        token::authority = authority,
    )]
    pub vault_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init, 
        seeds = [b"program_state".as_ref()],
        bump = state_nonce,
        payer = admin,
    )]
    pub state: Box<Account<'info, State>>,
    pub vault_mint: Account<'info, Mint>,
    pub authority: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

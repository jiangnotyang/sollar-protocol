use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::structs::State;

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
    pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DepositAssetsMintBond<'info>{

}

impl<'info> DepositAssetsMintBond<'info>{
    fn mint_bond_context(&self) -> CpiContext<'_,'_, '_, 'info, Mint<'info>> {

    }
}

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount, Transfer, Token};
use crate::structs::{State, Vault};
use psy_american::OptionMarket;



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
    #[account(mut)]
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

#[derive(Accounts)]

pub struct InitProgramVaults<'info> {
    #[account(mut, signer)]
    pub authority: AccountInfo<'info>,
    pub option_underlying_asset: Box<Account<'info, Mint>>,
    #[account(
        init,
        seeds = [&option_underlying_asset.key().to_bytes()[..], b"vault"],
        bump,
        payer = authority,
        token::mint = option_underlying_asset,
        token::authority = mint_option_asset_vault_authority,
    )]
    pub mint_option_asset_vault: Box<Account<'info, TokenAccount>>,
    pub mint_option_asset_vault_authority: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct MintCtx<'info> {
    #[account(mut)]
    pub authority: AccountInfo<'info>,
    pub psy_american_program: AccountInfo<'info>,
    #[account(mut)]
    pub mint_option_asset_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub mint_option_asset_vault_authority: AccountInfo<'info>,

    // Mint CPI Accounts to PsyAmerican program
    pub underlying_asset_mint: AccountInfo<'info>,
    #[account(mut)]
    pub underlying_asset_pool: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub option_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub minted_option_dest: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub writer_token_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub minted_writer_token_dest: Box<Account<'info, TokenAccount>>,
    pub option_market: Box<Account<'info, OptionMarket>>,
    #[account(mut)]
    pub fee_owner: AccountInfo<'info>,

    pub token_program: AccountInfo<'info>,
    pub associated_token_program: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}
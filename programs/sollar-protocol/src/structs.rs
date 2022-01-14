use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct State {
    pub admin: Pubkey,
    pub halt_status: bool,

}

#[account]
#[derive(Default)]
pub struct Vault {
    pub is_initialized: bool,
    pub vault_mint: Pubkey,
    pub authority: Pubkey,
    pub vault_bump: u8,
    pub token_program_id: Pubkey
}

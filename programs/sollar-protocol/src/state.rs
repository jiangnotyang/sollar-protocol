use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct State {
    pub admin: Pubkey,
    pub is_initialized: bool,

}
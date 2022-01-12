use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode{
    #[msg("testing errors")]
    InvalidAdmin,

    ProgramAlreadyInitialized,


}
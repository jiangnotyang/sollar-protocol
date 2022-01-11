use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sollar_protocol {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        
        msg!("hello world");
        msg!("testing123");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

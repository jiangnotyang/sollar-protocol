use anchor_lang::prelude::*;
use errors::ErrorCode;
use context::*;

pub mod context;
pub mod errors;
pub mod state;

declare_id!("HJXZKYVgk69LLGLEp8tFiUWi6AZ6z4VCNZgTudHMxk2t");

#[program]
pub mod sollar_protocol {
    use super::*;
    pub fn initialize_program_state(
        ctx: Context<InitializeProgramState>,
    ) -> ProgramResult {

        if ctx.accounts.state.is_initialized {
            return Err(ErrorCode::ProgramAlreadyInitialized.into());
        }

        msg!("Hello world");
        Ok(())
    }

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        _vault_nonce: u8,
    ) -> ProgramResult {
        // To do
        Ok(())
    }
}

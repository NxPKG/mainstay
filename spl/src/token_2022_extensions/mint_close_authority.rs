use mainstay_lang::solana_program::account_info::AccountInfo;
use mainstay_lang::solana_program::pubkey::Pubkey;
use mainstay_lang::Result;
use mainstay_lang::{context::CpiContext, Accounts};

pub fn mint_close_authority_initialize<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, MintCloseAuthorityInitialize<'info>>,
    authority: Option<&Pubkey>,
) -> Result<()> {
    let ix = spl_token_2022::instruction::initialize_mint_close_authority(
        ctx.accounts.token_program_id.key,
        ctx.accounts.mint.key,
        authority,
    )?;
    mainstay_lang::solana_program::program::invoke_signed(
        &ix,
        &[ctx.accounts.token_program_id, ctx.accounts.mint],
        ctx.signer_seeds,
    )
    .map_err(Into::into)
}

#[derive(Accounts)]
pub struct MintCloseAuthorityInitialize<'info> {
    pub token_program_id: AccountInfo<'info>,
    pub mint: AccountInfo<'info>,
}

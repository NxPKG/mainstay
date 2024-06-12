//! Only tests whether `mainstay-spl` builds with `metadata` feature enabled.

use mainstay_lang::prelude::*;

declare_id!("Metadata11111111111111111111111111111111111");

#[program]
pub mod metadata {}

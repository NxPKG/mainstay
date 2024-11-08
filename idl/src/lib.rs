//! Mainstay IDL.

#[cfg(feature = "build")]
pub mod build;

#[cfg(feature = "convert")]
pub mod convert;

pub use mainstay_lang_idl_spec as types;

#[cfg(feature = "build")]
pub use serde_json;

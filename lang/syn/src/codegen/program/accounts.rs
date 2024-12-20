use crate::Program;
use heck::SnakeCase;
use quote::quote;

pub fn generate(program: &Program) -> proc_macro2::TokenStream {
    let mut accounts = std::collections::HashMap::new();

    // Go through instruction accounts.
    for ix in &program.ixs {
        let mainstay_ident = &ix.mainstay_ident;
        // TODO: move to fn and share with accounts.rs.
        let macro_name = format!(
            "__client_accounts_{}",
            mainstay_ident.to_string().to_snake_case()
        );
        accounts.insert(macro_name, ix.cfgs.as_slice());
    }

    // Build the tokens from all accounts
    let account_structs: Vec<proc_macro2::TokenStream> = accounts
        .iter()
        .map(|(macro_name, cfgs)| {
            let macro_name: proc_macro2::TokenStream = macro_name.parse().unwrap();
            quote! {
                #(#cfgs)*
                pub use crate::#macro_name::*;
            }
        })
        .collect();

    // TODO: calculate the account size and add it as a constant field to
    //       each struct here. This is convenient for Rust clients.

    quote! {
        /// An Mainstay generated module, providing a set of structs
        /// mirroring the structs deriving `Accounts`, where each field is
        /// a `Pubkey`. This is useful for specifying accounts for a client.
        pub mod accounts {
            #(#account_structs)*
        }
    }
}

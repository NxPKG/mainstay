use crate::codegen::program::common::{
    gen_discriminator, generate_ix_variant, SIGHASH_GLOBAL_NAMESPACE,
};
use crate::Program;
use heck::SnakeCase;
use quote::{quote, ToTokens};

pub fn generate(program: &Program) -> proc_macro2::TokenStream {
    // Generate cpi methods for global methods.
    let global_cpi_methods: Vec<proc_macro2::TokenStream> = program
        .ixs
        .iter()
        .map(|ix| {
            let accounts_ident: proc_macro2::TokenStream = format!("crate::cpi::accounts::{}", &ix.mainstay_ident.to_string()).parse().unwrap();
            let cpi_method = {
                let name = &ix.raw_method.sig.ident;
                let ix_variant = generate_ix_variant(name.to_string(), &ix.args);
                let method_name = &ix.ident;
                let args: Vec<&syn::PatType> = ix.args.iter().map(|arg| &arg.raw_arg).collect();
                let discriminator = gen_discriminator(SIGHASH_GLOBAL_NAMESPACE, name);
                let ret_type = &ix.returns.ty.to_token_stream();
                let ix_cfgs = &ix.cfgs;
                let (method_ret, maybe_return) = match ret_type.to_string().as_str() {
                    "()" => (quote! {mainstay_lang::Result<()> }, quote! { Ok(()) }),
                    _ => (
                        quote! { mainstay_lang::Result<crate::cpi::Return::<#ret_type>> },
                        quote! { Ok(crate::cpi::Return::<#ret_type> { phantom: crate::cpi::PhantomData }) }
                    )
                };

                quote! {
                    #(#ix_cfgs)*
                    pub fn #method_name<'a, 'b, 'c, 'info>(
                        ctx: mainstay_lang::context::CpiContext<'a, 'b, 'c, 'info, #accounts_ident<'info>>,
                        #(#args),*
                    ) -> #method_ret {
                        let ix = {
                            let ix = instruction::#ix_variant;
                            let mut data = Vec::with_capacity(256);
                            data.extend_from_slice(#discriminator);
                            MainstaySerialize::serialize(&ix, &mut data)
                                .map_err(|_| mainstay_lang::error::ErrorCode::InstructionDidNotSerialize)?;
                            let accounts = ctx.to_account_metas(None);
                            mainstay_lang::solana_program::instruction::Instruction {
                                program_id: ctx.program.key(),
                                accounts,
                                data,
                            }
                        };
                        let mut acc_infos = ctx.to_account_infos();
                        mainstay_lang::solana_program::program::invoke_signed(
                            &ix,
                            &acc_infos,
                            ctx.signer_seeds,
                        ).map_or_else(
                            |e| Err(Into::into(e)),
                            // Maybe handle Solana return data.
                            |_| { #maybe_return }
                        )
                    }
                }
            };

            cpi_method
        })
        .collect();

    let accounts = generate_accounts(program);

    quote! {
        #[cfg(feature = "cpi")]
        pub mod cpi {
            use super::*;
            use std::marker::PhantomData;


            pub struct Return<T> {
                phantom: std::marker::PhantomData<T>
            }

            impl<T: MainstayDeserialize> Return<T> {
                pub fn get(&self) -> T {
                    let (_key, data) = mainstay_lang::solana_program::program::get_return_data().unwrap();
                    T::try_from_slice(&data).unwrap()
                }
            }

            #(#global_cpi_methods)*

            #accounts
        }
    }
}

pub fn generate_accounts(program: &Program) -> proc_macro2::TokenStream {
    let mut accounts = std::collections::HashMap::new();

    // Go through instruction accounts.
    for ix in &program.ixs {
        let mainstay_ident = &ix.mainstay_ident;
        // TODO: move to fn and share with accounts.rs.
        let macro_name = format!(
            "__cpi_client_accounts_{}",
            mainstay_ident.to_string().to_snake_case()
        );
        let cfgs = &ix.cfgs;
        accounts.insert(macro_name, cfgs.as_slice());
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

    quote! {
        /// An Mainstay generated module, providing a set of structs
        /// mirroring the structs deriving `Accounts`, where each field is
        /// an `AccountInfo`. This is useful for CPI.
        pub mod accounts {
            #(#account_structs)*
        }
    }
}

use crate::codegen::program::common::*;
use crate::program_codegen::idl::idl_accounts_and_functions;
use crate::Program;
use heck::CamelCase;
use quote::{quote, ToTokens};

// Generate non-inlined wrappers for each instruction handler, since Solana's
// BPF max stack size can't handle reasonable sized dispatch trees without doing
// so.
pub fn generate(program: &Program) -> proc_macro2::TokenStream {
    let program_name = &program.name;
    // A constant token stream that stores the accounts and functions, required to live
    // inside the target program in order to get the program ID.
    let idl_accounts_and_functions = idl_accounts_and_functions();
    let non_inlined_idl: proc_macro2::TokenStream = {
        quote! {
            // Entry for all IDL related instructions. Use the "no-idl" feature
            // to eliminate this code, for example, if one wants to make the
            // IDL no longer mutable or if one doesn't want to store the IDL
            // on chain.
            #[inline(never)]
            #[cfg(not(feature = "no-idl"))]
            pub fn __idl_dispatch<'info>(program_id: &Pubkey, accounts: &'info [AccountInfo<'info>], idl_ix_data: &[u8]) -> mainstay_lang::Result<()> {
                let mut accounts = accounts;
                let mut data: &[u8] = idl_ix_data;

                let ix = mainstay_lang::idl::IdlInstruction::deserialize(&mut data)
                    .map_err(|_| mainstay_lang::error::ErrorCode::InstructionDidNotDeserialize)?;

                match ix {
                    mainstay_lang::idl::IdlInstruction::Create { data_len } => {
                        let mut bumps = <IdlCreateAccounts as mainstay_lang::Bumps>::Bumps::default();
                        let mut reallocs = std::collections::BTreeSet::new();
                        let mut accounts =
                            IdlCreateAccounts::try_accounts(program_id, &mut accounts, &[], &mut bumps, &mut reallocs)?;
                        __idl_create_account(program_id, &mut accounts, data_len)?;
                        accounts.exit(program_id)?;
                    },
                    mainstay_lang::idl::IdlInstruction::Resize { data_len } => {
                        let mut bumps = <IdlResizeAccount as mainstay_lang::Bumps>::Bumps::default();
                        let mut reallocs = std::collections::BTreeSet::new();
                        let mut accounts =
                            IdlResizeAccount::try_accounts(program_id, &mut accounts, &[], &mut bumps, &mut reallocs)?;
                        __idl_resize_account(program_id, &mut accounts, data_len)?;
                        accounts.exit(program_id)?;
                    },
                    mainstay_lang::idl::IdlInstruction::Close => {
                        let mut bumps = <IdlCloseAccount as mainstay_lang::Bumps>::Bumps::default();
                        let mut reallocs = std::collections::BTreeSet::new();
                        let mut accounts =
                            IdlCloseAccount::try_accounts(program_id, &mut accounts, &[], &mut bumps, &mut reallocs)?;
                        __idl_close_account(program_id, &mut accounts)?;
                        accounts.exit(program_id)?;
                    },
                    mainstay_lang::idl::IdlInstruction::CreateBuffer => {
                        let mut bumps = <IdlCreateBuffer as mainstay_lang::Bumps>::Bumps::default();
                        let mut reallocs = std::collections::BTreeSet::new();
                        let mut accounts =
                            IdlCreateBuffer::try_accounts(program_id, &mut accounts, &[], &mut bumps, &mut reallocs)?;
                        __idl_create_buffer(program_id, &mut accounts)?;
                        accounts.exit(program_id)?;
                    },
                    mainstay_lang::idl::IdlInstruction::Write { data } => {
                        let mut bumps = <IdlAccounts as mainstay_lang::Bumps>::Bumps::default();
                        let mut reallocs = std::collections::BTreeSet::new();
                        let mut accounts =
                            IdlAccounts::try_accounts(program_id, &mut accounts, &[], &mut bumps, &mut reallocs)?;
                        __idl_write(program_id, &mut accounts, data)?;
                        accounts.exit(program_id)?;
                    },
                    mainstay_lang::idl::IdlInstruction::SetAuthority { new_authority } => {
                        let mut bumps = <IdlAccounts as mainstay_lang::Bumps>::Bumps::default();
                        let mut reallocs = std::collections::BTreeSet::new();
                        let mut accounts =
                            IdlAccounts::try_accounts(program_id, &mut accounts, &[], &mut bumps, &mut reallocs)?;
                        __idl_set_authority(program_id, &mut accounts, new_authority)?;
                        accounts.exit(program_id)?;
                    },
                    mainstay_lang::idl::IdlInstruction::SetBuffer => {
                        let mut bumps = <IdlSetBuffer as mainstay_lang::Bumps>::Bumps::default();
                        let mut reallocs = std::collections::BTreeSet::new();
                        let mut accounts =
                            IdlSetBuffer::try_accounts(program_id, &mut accounts, &[], &mut bumps, &mut reallocs)?;
                        __idl_set_buffer(program_id, &mut accounts)?;
                        accounts.exit(program_id)?;
                    },
                }
                Ok(())
            }

        }
    };

    let event_cpi_mod = generate_event_cpi_mod();

    let non_inlined_handlers: Vec<proc_macro2::TokenStream> = program
        .ixs
        .iter()
        .map(|ix| {
            let ix_arg_names: Vec<&syn::Ident> = ix.args.iter().map(|arg| &arg.name).collect();
            let ix_name = generate_ix_variant_name(ix.raw_method.sig.ident.to_string());
            let ix_method_name = &ix.raw_method.sig.ident;
            let mainstay = &ix.mainstay_ident;
            let variant_arm = generate_ix_variant(ix.raw_method.sig.ident.to_string(), &ix.args);
            let ix_name_log = format!("Instruction: {ix_name}");
            let ret_type = &ix.returns.ty.to_token_stream();
            let cfgs = &ix.cfgs;
            let maybe_set_return_data = match ret_type.to_string().as_str() {
                "()" => quote! {},
                _ => quote! {
                    let mut return_data = Vec::with_capacity(256);
                    result.serialize(&mut return_data).unwrap();
                    mainstay_lang::solana_program::program::set_return_data(&return_data);
                },
            };
            quote! {
                #(#cfgs)*
                #[inline(never)]
                pub fn #ix_method_name<'info>(
                    __program_id: &Pubkey,
                    __accounts: &'info[AccountInfo<'info>],
                    __ix_data: &[u8],
                ) -> mainstay_lang::Result<()> {
                    #[cfg(not(feature = "no-log-ix-name"))]
                    mainstay_lang::prelude::msg!(#ix_name_log);

                    // Deserialize data.
                    let ix = instruction::#ix_name::deserialize(&mut &__ix_data[..])
                        .map_err(|_| mainstay_lang::error::ErrorCode::InstructionDidNotDeserialize)?;
                    let instruction::#variant_arm = ix;

                    // Bump collector.
                    let mut __bumps = <#mainstay as mainstay_lang::Bumps>::Bumps::default();

                    let mut __reallocs = std::collections::BTreeSet::new();

                    // Deserialize accounts.
                    let mut __remaining_accounts: &[AccountInfo] = __accounts;
                    let mut __accounts = #mainstay::try_accounts(
                        __program_id,
                        &mut __remaining_accounts,
                        __ix_data,
                        &mut __bumps,
                        &mut __reallocs,
                    )?;

                    // Invoke user defined handler.
                    let result = #program_name::#ix_method_name(
                        mainstay_lang::context::Context::new(
                            __program_id,
                            &mut __accounts,
                            __remaining_accounts,
                            __bumps,
                        ),
                        #(#ix_arg_names),*
                    )?;

                    // Maybe set Solana return data.
                    #maybe_set_return_data

                    // Exit routine.
                    __accounts.exit(__program_id)
                }
            }
        })
        .collect();

    quote! {
        /// Create a private module to not clutter the program's namespace.
        /// Defines an entrypoint for each individual instruction handler
        /// wrapper.
        mod __private {
            use super::*;
            /// __idl mod defines handlers for injected Mainstay IDL instructions.
            pub mod __idl {
                use super::*;

                #non_inlined_idl
                #idl_accounts_and_functions
            }

            /// __global mod defines wrapped handlers for global instructions.
            pub mod __global {
                use super::*;

                #(#non_inlined_handlers)*
            }

            #event_cpi_mod
        }
    }
}

fn generate_ix_variant_name(name: String) -> proc_macro2::TokenStream {
    let n = name.to_camel_case();
    n.parse().unwrap()
}

/// Generate the event module based on whether the `event-cpi` feature is enabled.
fn generate_event_cpi_mod() -> proc_macro2::TokenStream {
    #[cfg(feature = "event-cpi")]
    {
        let authority = crate::parser::accounts::event_cpi::EventAuthority::get();
        let authority_name = authority.name;
        let authority_seeds = authority.seeds;

        quote! {
            /// __events mod defines handler for self-cpi based event logging
            pub mod __events {
                use super::*;

                #[inline(never)]
                pub fn __event_dispatch(
                    program_id: &Pubkey,
                    accounts: &[AccountInfo],
                    event_data: &[u8],
                ) -> mainstay_lang::Result<()> {
                    let given_event_authority = next_account_info(&mut accounts.iter())?;
                    if !given_event_authority.is_signer {
                        return Err(mainstay_lang::error::Error::from(
                            mainstay_lang::error::ErrorCode::ConstraintSigner,
                        )
                        .with_account_name(#authority_name));
                    }

                    let (expected_event_authority, _) =
                        Pubkey::find_program_address(&[#authority_seeds], &program_id);
                    if given_event_authority.key() != expected_event_authority {
                        return Err(mainstay_lang::error::Error::from(
                            mainstay_lang::error::ErrorCode::ConstraintSeeds,
                        )
                        .with_account_name(#authority_name)
                        .with_pubkeys((given_event_authority.key(), expected_event_authority)));
                    }

                    Ok(())
                }
            }
        }
    }
    #[cfg(not(feature = "event-cpi"))]
    quote! {}
}

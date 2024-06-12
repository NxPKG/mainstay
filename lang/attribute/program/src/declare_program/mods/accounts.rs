use mainstay_lang_idl::types::{Idl, IdlSerialization};
use quote::{format_ident, quote};

use super::common::{convert_idl_type_def_to_ts, gen_discriminator, get_canonical_program_id};

pub fn gen_accounts_mod(idl: &Idl) -> proc_macro2::TokenStream {
    let accounts = idl.accounts.iter().map(|acc| {
        let name = format_ident!("{}", acc.name);
        let discriminator = gen_discriminator(&acc.discriminator);

        let ty_def = idl
            .types
            .iter()
            .find(|ty| ty.name == acc.name)
            .expect("Type must exist");

        let impls = {
            let try_deserialize = quote! {
                fn try_deserialize(buf: &mut &[u8]) -> mainstay_lang::Result<Self> {
                    if buf.len() < #discriminator.len() {
                        return Err(mainstay_lang::error::ErrorCode::AccountDiscriminatorNotFound.into());
                    }

                    let given_disc = &buf[..8];
                    if &#discriminator != given_disc {
                        return Err(
                            mainstay_lang::error!(mainstay_lang::error::ErrorCode::AccountDiscriminatorMismatch)
                            .with_account_name(stringify!(#name))
                        );
                    }

                    Self::try_deserialize_unchecked(buf)
                }
            };
            match ty_def.serialization {
                IdlSerialization::Borsh => quote! {
                    impl mainstay_lang::AccountSerialize for #name {
                        fn try_serialize<W: std::io::Write>(&self, writer: &mut W) -> mainstay_lang::Result<()> {
                            if writer.write_all(&#discriminator).is_err() {
                                return Err(mainstay_lang::error::ErrorCode::AccountDidNotSerialize.into());
                            }
                            if MainstaySerialize::serialize(self, writer).is_err() {
                                return Err(mainstay_lang::error::ErrorCode::AccountDidNotSerialize.into());
                            }

                            Ok(())
                        }
                    }

                    impl mainstay_lang::AccountDeserialize for #name {
                        #try_deserialize

                        fn try_deserialize_unchecked(buf: &mut &[u8]) -> mainstay_lang::Result<Self> {
                            let mut data: &[u8] = &buf[8..];
                            MainstayDeserialize::deserialize(&mut data)
                                .map_err(|_| mainstay_lang::error::ErrorCode::AccountDidNotDeserialize.into())
                        }
                    }
                },
                _ => {
                    let unsafe_bytemuck_impl =
                        matches!(ty_def.serialization, IdlSerialization::BytemuckUnsafe)
                            .then(|| {
                                quote! {
                                    unsafe impl mainstay_lang::__private::Pod for #name {}
                                    unsafe impl mainstay_lang::__private::Zeroable for #name {}
                                }
                            })
                            .unwrap_or_default();

                    quote! {
                        impl mainstay_lang::ZeroCopy for #name {}

                        impl mainstay_lang::AccountDeserialize for #name {
                            #try_deserialize

                            fn try_deserialize_unchecked(buf: &mut &[u8]) -> mainstay_lang::Result<Self> {
                                let data: &[u8] = &buf[8..];
                                let account = mainstay_lang::__private::bytemuck::from_bytes(data);
                                Ok(*account)
                            }
                        }

                        #unsafe_bytemuck_impl
                    }
                }
            }
        };

        let type_def_ts = convert_idl_type_def_to_ts(ty_def, &idl.types);
        let program_id = get_canonical_program_id();

        quote! {
            #type_def_ts

            #impls

            impl mainstay_lang::Discriminator for #name {
                const DISCRIMINATOR: [u8; 8] = #discriminator;
            }

            impl mainstay_lang::Owner for #name {
                fn owner() -> Pubkey {
                    #program_id
                }
            }
        }
    });

    quote! {
        /// Program account type definitions.
        pub mod accounts {
            use super::*;

            #(#accounts)*
        }
    }
}

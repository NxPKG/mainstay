use anyhow::Result;
use clap::Parser;
use mainstay_cli::Opts;

fn main() -> Result<()> {
    mainstay_cli::entry(Opts::parse())
}

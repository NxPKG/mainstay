use mainstay_cli::Opts;
use anyhow::Result;
use clap::Parser;

fn main() -> Result<()> {
    mainstay_cli::entry(Opts::parse())
}

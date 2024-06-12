#!/usr/bin/env bash

# `$1` is the directory to generate the IDLs in, defaults to `./idls`
if [ $# = 1 ]; then
    dir=$1
else
    dir=$PWD/idls
fi

cd programs/idl
mainstay idl build -o $dir/new.json

cd ../generics
mainstay idl build -o $dir/generics.json

cd ../relations-derivation
mainstay idl build -o $dir/relations.json

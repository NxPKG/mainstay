#!/bin/bash

echo "Building programs"

#
# Build the UncheckedAccount variant.
#
pushd programs/unchecked-account/
output=$(mainstay build 2>&1 > /dev/null)
if ! [[ $output =~ "Struct field \"unchecked\" is unsafe" ]]; then
   echo "Error: expected /// CHECK error"
   exit 1
fi
popd

#
# Build the AccountInfo variant.
#
pushd programs/account-info/
output=$(mainstay build 2>&1 > /dev/null)
if ! [[ $output =~ "Struct field \"unchecked\" is unsafe" ]]; then
   echo "Error: expected /// CHECK error"
   exit 1
fi
popd

#
# Build the control variant.
#
pushd programs/ignore-non-accounts/
if ! mainstay build ; then
   echo "Error: mainstay build failed when it shouldn't have"
   exit 1
fi
popd

echo "Success. As expected, all builds failed that were supposed to fail."

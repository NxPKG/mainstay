WORKDIR=$(PWD)
#
# Mainstay version.
#
MAINSTAY_CLI=v0.30.1
#
# Solana toolchain.
#
SOLANA_CLI=v2.0.8
#
# Build version should match the Mainstay cli version.
#
IMG_ORG ?= backpackapp
IMG_VER ?= $(MAINSTAY_CLI)

.PHONY: build build-push build-shell publish

default:

build: build/Dockerfile
	@docker build \
	--build-arg MAINSTAY_CLI=$(MAINSTAY_CLI) \
	--build-arg SOLANA_CLI=$(SOLANA_CLI) \
	$@ -t $(IMG_ORG)/$@:$(IMG_VER)

build-push:
	@docker push $(IMG_ORG)/build:$(IMG_VER)

build-shell:
	@docker run -ti --rm --net=host \
		-v $(WORKDIR)/..:/workdir \
		$(IMG_ORG)/build:$(IMG_VER) bash

publish: build build-push
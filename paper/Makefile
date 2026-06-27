# Makefile for building the JOSS paper PDF.
#
# Usage (from the paper/ directory):
#   make pdf      # build paper.pdf (Docker if available, else local inara)
#   make docker   # force the Docker build path
#   make local    # force the local inara build path
#   make clean    # remove the built PDF
#
# See CLAUDE.md for details on the two build paths.

ARTICLE := paper.md
PDF := paper.pdf

# Repository root (parent of this paper/ directory).
ROOT := $(abspath ..)
INARA := $(ROOT)/_ignore/inara

.PHONY: pdf docker local clean

# Prefer Docker (the recommended, reproducible path); fall back to local inara.
pdf:
	@if docker info >/dev/null 2>&1; then \
		$(MAKE) docker; \
	elif [ -d "$(INARA)" ]; then \
		echo "Docker not available; using local inara at $(INARA)"; \
		$(MAKE) local; \
	else \
		echo "ERROR: Docker is not running and $(INARA) does not exist."; \
		echo "Start Docker, or clone inara into _ignore/inara (see CLAUDE.md)."; \
		exit 1; \
	fi

docker:
	docker run --rm \
	  -v "$(ROOT)/paper:/data" \
	  -u $(shell id -u):$(shell id -g) \
	  openjournals/inara -o pdf /data/$(ARTICLE)

local:
	$(MAKE) -C "$(INARA)" pdf ARTICLE="$(ROOT)/paper/$(ARTICLE)"
	cp "$(INARA)/publishing-artifacts/$(PDF)" "$(ROOT)/paper/$(PDF)"

clean:
	rm -f "$(ROOT)/paper/$(PDF)"

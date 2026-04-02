# Paper Build Instructions

This is a JOSS (Journal of Open Source Software) paper.

## Building the PDF

The PDF is built using [inara](https://github.com/openjournals/inara).

### Docker (recommended)

From the repository root:

```bash
docker run --rm \
  -v "$(pwd)/paper:/data" \
  -u $(id -u):$(id -g) \
  openjournals/inara -o pdf /data/paper.md
```

The output will be written directly to `paper/paper.pdf`.

### Local (requires pandoc >= 3.6 and lualatex)

If inara is cloned in `_ignore/inara/`:

```bash
cd _ignore/inara
make pdf ARTICLE=$(pwd)/../../paper/paper.md
cp publishing-artifacts/paper.pdf ../../paper/paper.pdf
```

## Dependencies

For Docker build: only Docker is required.

For local build:
- pandoc >= 3.6
- LaTeX with lualatex and packages listed in inara's Dockerfile
- [Hack font](https://github.com/source-foundry/Hack)

## Notes

- The `_ignore/` directory is gitignored via `**/_*/` pattern

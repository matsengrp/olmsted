# Paper Build Instructions

This is a JOSS (Journal of Open Source Software) paper.

## Building the PDF

The PDF is built using [inara](https://github.com/openjournals/inara), which is cloned in `../_ignore/inara/`.

To build the PDF:

```bash
cd /Users/matsen/re/olmsted/_ignore/inara
make pdf ARTICLE=/Users/matsen/re/olmsted/paper/paper.md
```

The output will be in `publishing-artifacts/paper.pdf`. Copy it to the paper directory:

```bash
cp /Users/matsen/re/olmsted/_ignore/inara/publishing-artifacts/paper.pdf /Users/matsen/re/olmsted/paper/paper.pdf
```

## Dependencies

- pandoc (recent version)
- LaTeX with packages listed in inara's Dockerfile
- [Hack font](https://github.com/source-foundry/Hack)

## Notes

- The `_ignore/` directory is gitignored via `**/_*/` pattern
- Docker build doesn't work on Apple Silicon (architecture mismatch)

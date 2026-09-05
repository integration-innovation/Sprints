#!/usr/bin/env bash
# Regenerates the two derived outputs from their sources:
#   1. bundles BAS/samples/example-model.ifc into BAS/index.html (so "Load example model" works offline)
#   2. writes dist/artifact.html, the single-page copy published to claude.ai
set -euo pipefail
cd "$(dirname "$0")"

python3 - <<'PY'
import pathlib, re
page   = pathlib.Path("BAS/index.html")
sample = pathlib.Path("BAS/samples/example-model.ifc").read_text()
html   = page.read_text()
new, n = re.subn(
    r"(/\*BEGIN-SAMPLE\*/).*?(/\*END-SAMPLE\*/)",
    lambda m: m.group(1) + "\n" + sample.strip() + "\n" + m.group(2),
    html, flags=re.S)
if n != 1:
    raise SystemExit(f"expected one sample marker pair in BAS/index.html, found {n}")
page.write_text(new)
print(f"bundled sample model ({len(sample)} bytes) into BAS/index.html")

# The Artifact host supplies its own <!doctype>/<head>/<body>, so ship only the
# page content: everything from <title> onward, minus the wrapper tags.
body = new[new.index("<title>"):]
body = "\n".join(l for l in body.splitlines() if l.strip() not in ("</head>", "<body>", "</body>", "</html>"))
out = pathlib.Path("dist"); out.mkdir(exist_ok=True)
(out / "artifact.html").write_text(body)
print(f"wrote dist/artifact.html ({len(body)} bytes)")
PY

# Basic Accessibility Assessment Tool (Singapore)

A screening aid for the BCA **Basic Accessibility Legislation** applicability triggers,
built as an installable offline web app (PWA) that can read an IFC model for supporting evidence.

## How to use

Double-click `index.html`. It opens in any browser. Nothing to install. It works offline;
without a connection the IBM Plex webfonts fall back to system faces and everything else is unchanged.

It opens with an invented example project already assessed, clearly flagged as an example.
Press **Clear form** to start your own.

Answer the four screening questions, press **Assess applicability**, then press
Ctrl+P (Cmd+P on Mac) to print or save the result as a PDF for the project file.

## Publishing it at integration-innovation.github.io/Sprints/BAS/

The app lives in `BAS/`, so GitHub Pages serves it at that path with no further configuration.
Someone with repository admin rights has to switch Pages on once:

> **Settings → Pages → Build and deployment**
> Source: **Deploy from a branch** · Branch: **`claude/sg-accessibility-assessment-lrj5m4`** · Folder: **`/ (root)`** → **Save**

The site appears about a minute later:

- **https://integration-innovation.github.io/Sprints/** — landing page listing what is published
- **https://integration-innovation.github.io/Sprints/BAS/** — the tool itself
To serve it from the repository's default branch instead, merge this branch there first and point
Pages at that branch — the folder stays `/ (root)`.

Every path in the app is relative, so it works under any subdirectory without changes.
`.nojekyll` stops Pages running the tree through Jekyll.

## Installing it as an app

Open the published URL and use **Install app**. It then runs from the home screen or Start menu
and works with no connection, which is the point of it on site. Opened straight from disk
(`file://`) it still runs but cannot install, because service workers require HTTPS or localhost.

## Reading an IFC model

Press **Choose IFC file**, or drag one onto the panel. The file is parsed in your browser by a
built-in IFC-SPF reader. **It is never uploaded, sent, or stored** — there is no server. Uncompressed
`.ifc` files in IFC2X3 or IFC4 are read; `.ifczip` and `.ifcxml` are not.

**Load example model** runs an invented sample bundled into the page, so the feature can be
demonstrated without a real project file.

### What the model reader can and cannot tell you

It reads *declared attributes and quantity sets*. It does **not** evaluate geometry, so it cannot
measure anything. Concretely:

| Reported from the model | Not determinable |
|---|---|
| Schema, units, entity counts | Corridor clear widths (Clause 4) |
| Storeys, elevations, declared GFA | Ramp gradients and landing spacing (Clause 4) |
| Door `OverallWidth` values | Lift car internal dimensions (Clause 5) |
| Space names and floor areas | Toilet clear space, other than the area test below |
| Lift, ramp and stair counts | Continuity of the barrier-free route |
| Lactation rooms by name (Clause 8) | TGSIs, tactile signage, hearing loops (Clause 7) |

Door `OverallWidth` is the **nominal leaf width**, not the clear opening width once frame, stop and
hardware are deducted. It is reported as evidence, never scored.

**The one genuine compliance inference.** A 1750 × 1750 mm clear space needs 3.06 m². Where a space
is named as an accessible toilet and declares a floor area, the tool tests that area against 3.06 m².
A smaller area **disproves** compliance — no layout can fit the clear space. A larger area proves
nothing on its own, and the tool says so: fixtures, door swing, grab bars and transfer space still
have to be checked on the drawings.

Everything else is reported as evidence or as an explicit gap. The tool never ticks a clause it
cannot actually test.

## Scope of this version

**Step 1 — applicability screening only.** It answers one question: *does Basic
Accessibility Legislation apply to this project?* It tests four gates, each evaluated
independently so a project that fails on more than one count sees every reason:

1. Works are Additions & Alterations requiring plan approval
2. Building is not already barrier-free
3. Use is non-residential and non-industrial
4. GFA of the A&A works exceeds 500 m²

A new erection is reported as *Different route* rather than "not applicable": it faces the
full Code on Accessibility, which is a broader obligation than the triad, not a lesser one.

The mandatory triad (accessible entrance + accessible toilet + connecting
barrier-free route) is stated when the trigger is met, but is **not yet assessed**.
That is step 2.

## Files

| File | Purpose |
|---|---|
| `index.html` | Landing page at the site root, listing what is published. |
| `BAS/index.html` | The whole app — screening logic, IFC reader, styles. The source of truth. |
| `BAS/manifest.webmanifest`, `BAS/sw.js`, `BAS/icon*.svg` | PWA shell: installability and offline caching. |
| `BAS/samples/example-model.ifc` | Invented sample model, bundled into the page by `build.sh`. |
| `build.sh` | Bundles the sample into `index.html` and writes `dist/artifact.html`. |
| `dist/artifact.html` | Generated single-page copy for the hosted link. Do not edit by hand. |

Run `./build.sh` after changing `BAS/index.html` or the sample. The root landing page is plain
HTML with no build step.

## Hosted version

Published as a shareable page: https://claude.ai/code/artifact/e8719592-483c-4ee6-97ba-80f9b997e653
It is private until shared from the page's own share menu. The hosted copy is generated from
`index.html` by `build.sh`. The screening and the IFC reader both work there; **installing and
offline use do not**, because the hosted page runs in a sandboxed frame that cannot register a
service worker. For the app behaviour, serve this repository yourself.

## Limitations

This is a preliminary screening aid, not a compliance certificate. It does not replace
the prevailing BCA Code on Accessibility in the Built Environment, the plan-approval
process, or the judgement of the Qualified Person submitting the works. The GFA
measurement basis in particular must be confirmed against the prevailing BCA definition.

No project data is stored, transmitted, or shipped with the file.

## Sources

- [BCA Code on Accessibility in the Built Environment](https://www1.bca.gov.sg/safety-and-standards/accessibility/code-on-accessibility-in-the-built-environment/)
- [Basic Accessibility Legislation (A&A)](https://www1.bca.gov.sg/safety-and-standards/accessibility/basic-accessibility-legislation/)
- [Building Control Act 1989](https://sso.agc.gov.sg/Act/BCA1989)
- [BCA Accessibility Fund](https://www1.bca.gov.sg/home-and-building-owners/accessibility-and-universal-design/)

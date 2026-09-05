# Basic Accessibility Assessment Tool (Singapore)

A screening aid for the BCA **Basic Accessibility Legislation** applicability triggers,
built as a single self-contained HTML file.

## How to use

Double-click `index.html`. It opens in any browser. Nothing to install. It works offline;
without a connection the IBM Plex webfonts fall back to system faces and everything else is unchanged.

It opens with an invented example project already assessed, clearly flagged as an example.
Press **Clear form** to start your own.

Answer the four screening questions, press **Assess applicability**, then press
Ctrl+P (Cmd+P on Mac) to print or save the result as a PDF for the project file.

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

## Hosted version

Published as a shareable page: https://claude.ai/code/artifact/e8719592-483c-4ee6-97ba-80f9b997e653
It is private until shared from the page's own share menu. The hosted page is generated
mechanically from `index.html` by stripping the document wrapper tags, so this file stays
the single source of truth.

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

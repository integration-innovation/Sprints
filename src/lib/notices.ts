/**
 * What the app tells you about itself, before you put anything into it.
 *
 * These were paragraphs scattered through the start page, which meant two
 * things: the ones that mattered competed for attention with the ones that were
 * merely reassuring, and nobody could check what the app actually claims
 * without reading a React component.
 *
 * So they are data, and they are split by a single question — does a person
 * need this *before* they type anything, or is it reference they will want once
 * and then never again? Both kinds live behind the menu, the first at the top
 * under *Before you start*, so the start page is the app rather than a wall of
 * warnings. The one risk that is genuinely urgent — a browser about to evict
 * the programmes — is not in this list at all: it is raised on the start page
 * itself, and only when it is actually true of the browser reading it.
 *
 * The publishing consent sentences are deliberately not here. Those belong to
 * `use-case.ts`, where they sit beside the destination that determines them, and
 * are shown at the moment of publishing rather than collected in advance.
 */

export type Notice = { title: string; body: string };

/**
 * Shown first in the menu, under *Before you start*.
 *
 * The test for this list is narrow: it is what someone would be entitled to be
 * annoyed about if they only found out later. Storage that can vanish with the
 * browser qualifies. Anything else is reference.
 */
export const REQUIRED_NOTICES: readonly Notice[] = [
  {
    title: "Your data stays in this browser",
    body:
      "Nothing is uploaded. A programme lives in the browser that created it, so clearing site " +
      "data, a private window, or a different device means it is not there. Back it up, or " +
      "connect a Google Sheet, before it matters.",
  },
  {
    title: "You are recording other people",
    body:
      "A sprint log holds names, roles, and what each person did with their hour. Tell the group " +
      "the log exists and who can see it. Nothing here is published unless someone chooses to " +
      "publish it, one case at a time, with the consent wording in front of them.",
  },
] as const;

/**
 * Reference. True, worth stating once, and read after the two above rather
 * than instead of them.
 */
export const REFERENCE_NOTICES: readonly Notice[] = [
  {
    title: "A connected sheet is as private as its link",
    body:
      "The Apps Script web app has to be reachable by “anyone with the link” for browsers to " +
      "call it, so the URL is the access boundary. The optional access key stops a bare URL being " +
      "useful and is not authentication. Keep the link private, and keep anything confidential out " +
      "of the sheet.",
  },
  {
    title: "A backup file holds everyone's rows",
    body:
      "Names included. It is a recovery file, not something to circulate — committing one to a " +
      "public repository makes all of it public. The sheet connection and any archive token are " +
      "deliberately left out of it.",
  },
  {
    title: "Publishing a use case cannot be fully undone",
    body:
      "A case published to a public page can be copied, cached and indexed. A case kept in a " +
      "private archive can be withdrawn, which is the whole reason the two are asked for " +
      "separately, in different words.",
  },
  {
    title: "AI drafts the log; a person signs it off",
    body:
      "Filling a sprint row from an AI chat proposes changes and shows every one before it moves. " +
      "Anything that would replace what you wrote arrives unticked. An AI's account of your hour " +
      "is a draft of the record, not the record.",
  },
  {
    title: "No warranty",
    body:
      "This is a working tool for running an hour, provided as-is. Nothing in it is professional, " +
      "legal or engineering advice, and product names belong to their owners and appear here only " +
      "to say what somebody used.",
  },
] as const;

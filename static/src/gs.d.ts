/** Apps Script sources are inlined as text by the static build, so the app can
 *  hand a facilitator the script instead of sending them to find a file. */
declare module "*.gs" {
  const content: string;
  export default content;
}

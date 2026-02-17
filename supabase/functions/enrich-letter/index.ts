const VENICE_API_KEY = Deno.env.get("VENICE_API_KEY");
if (!VENICE_API_KEY) {
  // handle missing key (e.g. just return the draftText unchanged)
}

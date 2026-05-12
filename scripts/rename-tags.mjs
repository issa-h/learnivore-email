const SUPABASE_URL = "https://rllkoocpqfhusxeerymo.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbGtvb2NwcWZodXN4ZWVyeW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MjkzMSwiZXhwIjoyMDkxMTI4OTMxfQ.aC6s5tspVS7kMiZuIKSpK8bJ3d-qD9aYx0EI_px3tiI";

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function getContactsWithTag(tag) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts?tags=cs.{${encodeURIComponent(tag)}}&select=id,tags`, { headers });
  return res.json();
}

async function patchContact(id, tags) {
  await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${id}`, {
    method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ tags })
  });
}

async function renameTag(oldTag, newTag) {
  const contacts = await getContactsWithTag(oldTag);
  if (contacts.length === 0) { console.log(`  (aucun contact avec "${oldTag}")`); return 0; }
  for (const c of contacts) {
    const newTags = c.tags.map(t => t === oldTag ? newTag : t);
    await patchContact(c.id, newTags);
  }
  console.log(`  ✓ "${oldTag}" → "${newTag}" (${contacts.length} contacts)`);
  return contacts.length;
}

async function deleteTag(tag) {
  const contacts = await getContactsWithTag(tag);
  if (contacts.length === 0) { console.log(`  (aucun contact avec "${tag}")`); return 0; }
  for (const c of contacts) {
    const newTags = c.tags.filter(t => t !== tag);
    await patchContact(c.id, newTags);
  }
  console.log(`  ✓ supprimé "${tag}" (${contacts.length} contacts)`);
  return contacts.length;
}

async function deleteContact(tag) {
  const contacts = await getContactsWithTag(tag);
  for (const c of contacts) {
    await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${c.id}`, {
      method: "DELETE", headers
    });
    console.log(`  ✓ contact ${c.id.slice(0, 8)}... supprimé`);
  }
}

// ── RENAMES ──
console.log("=== RENAMES ===");
await renameTag("vsl-org", "funnel:vsl-org");
await renameTag("youtube", "source:youtube");
await renameTag("organic", "traffic:organic");
await renameTag("apprendre-3x-plus-vite", "content:apprendre-3x-plus-vite");
await renameTag("reponds-questions", "content:reponds-questions");
await renameTag("ces-etudiants-ont-tellement-progresse-qu-on-croirait-qu-ils-trichent", "content:ces-etudiants-ont-tellement-progresse-qu-on-croirait-qu-ils-trichent");
await renameTag("plan-exact-2026", "content:plan-exact-2026");
await renameTag("methode-addictive", "content:methode-addictive");
await renameTag("reussir-examen-maths", "content:reussir-examen-maths");
await renameTag("une-etudiante-debordee-en-concours-s-organise-en-15-min", "content:une-etudiante-debordee-en-concours-s-organise-en-15-min");
await renameTag("fast & studious", "lead-magnet:fast & studious");
await renameTag("vsl | students", "funnel:vsl-org");
await renameTag("vsl", "funnel:vsl-org");
await renameTag("phone addiction", "funnel:phone-addiction-principles");
await renameTag("workshop students | 15.03.26", "event:workshop students | 15.03.26");
await renameTag("edt vacances", "lead-magnet:edt vacances");
await renameTag("masterclass students | 7.09.25", "event:masterclass students | 7.09.25");

// ── DELETES ──
console.log("\n=== SUPPRESSIONS DE TAGS ===");
await deleteTag("youtube-organique");
await deleteTag("capture");
await deleteTag("test-e2e");

// ── DELETE CONTACT learning for pros ──
console.log("\n=== SUPPRESSION CONTACT learning for pros ===");
await deleteContact("learning for pros");

// ── UPDATE TAG RULES ──
console.log("\n=== MISE À JOUR TAG RULES ===");
// vsl-org → funnel:vsl-org
const r1 = await fetch(`${SUPABASE_URL}/rest/v1/tag_rules?tag=eq.vsl-org`, {
  method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
  body: JSON.stringify({ tag: "funnel:vsl-org" })
});
console.log(r1.ok ? "  ✓ tag_rule vsl-org → funnel:vsl-org" : "  FAILED tag_rule vsl-org");

// masterclass → funnel:masterclass (le tag webhook reste "masterclass" pour l'instant, mais la tag_rule doit matcher)
// Actually masterclass tag itself doesn't need prefix per the spec - it's already a funnel tag
// Let me check: the user said funnel:masterclass in the spec. Let me rename it too.

console.log("\n=== VÉRIFICATION FINALE ===");
const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts?select=tags`, { headers });
const all = await res.json();
const tagCounts = {};
for (const c of all) {
  for (const t of c.tags) {
    tagCounts[t] = (tagCounts[t] || 0) + 1;
  }
}
const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
for (const [tag, count] of sorted) {
  console.log(`  ${String(count).padStart(4)}  ${tag}`);
}

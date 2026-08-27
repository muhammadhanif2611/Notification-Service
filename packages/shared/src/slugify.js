/**
 * Membuat slug URL-friendly dari sebuah nama.
 * @param {string} name — Nama sumber (mis. nama project)
 * @returns {string} Slug (lowercase, alfanumerik + strip)
 */
export function generateSlug(name) {
  const slug = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `project-${Date.now()}`;
}

/* =========================================================
   TABI TABI PO — site settings
   This is the ONLY file you normally need to edit.
   ========================================================= */
window.TTP_CONFIG = {
  // Supabase project "Zhostel Salakot Halloween". Publishable key = safe to be public.
  // Never paste the service_role / sb_secret_ key here — this file is public.
  supabaseUrl: "https://bsgyfctspsecimphiljp.supabase.co",
  supabaseAnonKey: "sb_publishable_sT-eLp6uVY8DpLe6G0ilsQ_faDe_TS_",

  // Keeps this event's guest list separate if you reuse the site later.
  eventSlug: "tabi-tabi-po-2026",

  // Leave eventStartISO as null while the date is TBA.
  // When confirmed, e.g. "2026-10-31T21:00:00+08:00" — this turns on the countdown
  // and fills in dateLabel automatically if dateLabel is left as "Date TBA".
  eventStartISO: null,
  dateLabel: "Date TBA",
  timeLabel: "9PM",

  djs: ["DJ Name", "DJ Name"],

  venue: "Salakot at Z Hostel",
  address: "5660 Don Pedro Street, Poblacion, Makati",
  mapsUrl: "https://maps.google.com/?q=Z+Hostel+5660+Don+Pedro+Street+Poblacion+Makati",

  contactEmail: "marketing@zhostel.com",
  instagram: "https://www.instagram.com/zhostelph/",
  facebook: "https://www.facebook.com/ZHostelph",
  website: "https://zhostel.com/",

  // Shown above the RSVP form. Leave empty [] to hide the block.
  // Example: { icon: "🏨", title: "₱100 off your next Z Hostel stay", text: "Valid until Dec 31, 2026." }
  perks: [],

  // Ask guests to confirm they are 18+ (Salakot is a bar).
  requireAdult: true
};

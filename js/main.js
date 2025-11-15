/* =========================================================== GarboTrack main.js (FINAL CLEAN VERSION) =========================================================== */

(function () {

const SUPABASE_URL = "https://tnukdvfdxafpoiwvyzsc.supabase.co"; const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRudWtkdmZkeGFmcG9pd3Z5enNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNzAzMjksImV4cCI6MjA3ODY0NjMyOX0.WTYPb-xUPhGtMCsWZTQ6OW30EStDw3AZo30aDps8SME";

/* ------------------------------ LOAD SUPABASE UMD ------------------------------ */ function loadScript(url, cb) { var s = document.createElement("script"); s.src = url; s.onload = cb; document.head.appendChild(s); }

function ensureSupabase(cb) { if (window.supabase && window.supabase.createClient) cb(); else loadScript( "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js", cb ); }

ensureSupabase(() => {

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ===========================================================
   GLOBAL GARBO OBJECT
=========================================================== */
window.GARBO = {

  supabase,

  init: async function () { return true; },

  /* ------------------ AUTH ------------------ */
  signup: async function ({ name, email, password, role, barangay }) {
    const res = await supabase.auth.signUp({ email, password });
    if (res.error) throw res.error;

    await supabase.from("profiles").insert([{
      id: res.data.user.id,
      full_name: name,
      role,
      barangay
    }]);

    return res;
  },

  login: async function ({ email, password }) {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) throw res.error;

    const userId = res.data.user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    return { auth: res, profile };
  },

  logout: async function () {
    await supabase.auth.signOut();
    localStorage.removeItem("garbo_profile");
    location.href = "index.html";
  },

  getCurrentProfile: async function () {
    const s = await supabase.auth.getSession();
    if (!s.data.session?.user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", s.data.session.user.id)
      .single();

    return data;
  },

  /* ------------------ SCHEDULES ------------------ */
  createSchedule: async function ({ date, time, barangay }) {
    return await supabase.from("schedules")
      .insert([{ date, time, barangay, status: "scheduled" }]);
  },

  cancelSchedule: async function (scheduleId, remarks) {
    await supabase.from("schedules")
      .update({ status: "cancelled" })
      .eq("id", scheduleId);

    await supabase.from("reports").insert([{
      type: "schedule_cancel",
      message: remarks,
      created_at: new Date().toISOString()
    }]);
  },

  acceptSchedule: async function (scheduleId, residentId, barangay) {
    return await supabase.from("accepted")
      .insert([{
        schedule_id: scheduleId,
        resident_id: residentId,
        barangay,
        accepted_at: new Date().toISOString()
      }]);
  },

  getSchedulesByBarangay: async function (barangay) {
    return await supabase.from("schedules")
      .select("*")
      .eq("barangay", barangay)
      .order("date", { ascending: true });
  },

  /* ------------------ POSITIONS ------------------ */
  upsertCollectorPos: async function (collectorId, lat, lng) {
    return await supabase.from("collectors_positions").upsert({
      collector_id: collectorId,
      lat,
      lng,
      last_active: new Date().toISOString()
    }, { onConflict: ["collector_id"] });
  },

  upsertResidentPos: async function (residentId, lat, lng) {
    return await supabase.from("resident_positions").upsert({
      resident_id: residentId,
      lat,
      lng,
      updated_at: new Date().toISOString()
    }, { onConflict: ["resident_id"] });
  },

  getResidentPos: async function (residentId) {
    return await supabase.from("resident_positions")
      .select("*")
      .eq("resident_id", residentId)
      .single();
  },

  getCollectorsInBarangay: async function (barangay) {
    return await supabase.from("profiles")
      .select("*")
      .eq("role", "collector")
      .eq("barangay", barangay);
  },

  /* ------------------ CHAT ------------------ */
  sendMessage: async function (sender, receiver, message) {
    return await supabase.from("messages")
      .insert([{ sender_id: sender, receiver_id: receiver, message }]);
  },

  /* ------------------ ETA ------------------ */
  requestETA: async function (scheduleId, residentId) {
    return await supabase.from("eta_requests")
      .insert([{ schedule_id: scheduleId, requested_by: residentId }]);
  },

  sendETANotification: async function (scheduleId, message) {
    return await supabase.from("eta_notifications")
      .insert([{ schedule_id: scheduleId, message }]);
  },

  /* ------------------ REPORTS ------------------ */
  submitReport: async function (type, message) {
    return await supabase.from("reports")
      .insert([{ type, message }]);
  },

  /* ------------------ COMPLETED COLLECTIONS ------------------ */
  markCompleted: async function ({ collector_id, resident_id, resident_name, barangay, schedule_id }) {
    const now = new Date();
    return await supabase.from("completed_collections").insert([{
      collector_id,
      resident_id,
      resident_name,
      barangay,
      schedule_id,
      date_completed: now.toISOString().slice(0, 10),
      time_completed: now.toTimeString().slice(0, 8),
      created_at: now.toISOString()
    }]);
  },

  getCompletedCollections: async function (barangay = null) {
    let q = supabase.from("completed_collections")
      .select("*")
      .order("created_at", { ascending: false });

    if (barangay) q = q.eq("barangay", barangay);

    return await q;
  },

  /* ------------------ REALTIME ------------------ */
  realtime: function (name) {
    return supabase.channel(name);
  }
};

console.log("GARBO READY.");
window._GARBO_SUPABASE = supabase;

});

})();
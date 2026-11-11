/**
 * Lazy Suppers backend. Runs in your own Google account and stores the shared plan.
 * The website sends the PIN once per device; after that the device uses a token.
 *
 * 1. Change PIN below to the PIN you want.
 * 2. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * 3. Copy the web app URL (it ends in /exec).
 */
const PIN = "CHANGE-ME";

const MAX_WRONG_TRIES = 8;      // wrong PINs allowed before sign-ins pause
const LOCK_SECONDS = 900;       // how long they pause (15 minutes)
const PATH_OK = /^(?:weeks|orders)\/\d{4}-\d{2}-\d{2}$|^state\/prefs$/;

function doGet() {
  return out({ ok: true, app: "lazy-suppers" });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out({ error: "bad_request" }); }
  const props = PropertiesService.getScriptProperties();

  if (req.op === "login") {
    const cache = CacheService.getScriptCache();
    const fails = Number(cache.get("fails") || 0);
    if (fails >= MAX_WRONG_TRIES) return out({ error: "locked" });
    if (PIN === "CHANGE-ME") return out({ error: "pin_not_set" });
    if (String(req.pin) !== PIN) {
      cache.put("fails", String(fails + 1), LOCK_SECONDS);
      return out({ error: "wrong_pin" });
    }
    const token = Utilities.getUuid() + Utilities.getUuid();
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const tokens = JSON.parse(props.getProperty("tokens") || "[]");
      tokens.push(token);
      while (tokens.length > 30) tokens.shift();
      props.setProperty("tokens", JSON.stringify(tokens));
    } finally { lock.releaseLock(); }
    return out({ token: token });
  }

  const tokens = JSON.parse(props.getProperty("tokens") || "[]");
  if (!req.token || tokens.indexOf(req.token) < 0) return out({ error: "auth" });

  if (req.op === "sync") {
    const all = props.getProperties();
    const docs = {};
    Object.keys(all).forEach(function (k) {
      if (k.indexOf("doc:") === 0) { try { docs[k.slice(4)] = JSON.parse(all[k]); } catch (err) {} }
    });
    return out({ docs: docs });
  }

  if (req.op === "set") {
    if (!PATH_OK.test(String(req.path)) || !req.data || typeof req.data !== "object") return out({ error: "invalid_argument" });
    const body = JSON.stringify(req.data);
    if (body.length > 8500) return out({ error: "invalid_argument" });
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      props.setProperty("doc:" + req.path, body);
      prune(props);
    } finally { lock.releaseLock(); }
    return out({ ok: true });
  }

  return out({ error: "bad_request" });
}

/** Keep storage small: drop grocery orders older than about three months. */
function prune(props) {
  const cutoff = new Date(Date.now() - 100 * 864e5).toISOString().slice(0, 10);
  props.getKeys().forEach(function (k) {
    if (k.indexOf("doc:orders/") === 0 && k.slice(11) < cutoff) props.deleteProperty(k);
  });
}

/** Run this by hand to make every device ask for the PIN again. */
function signOutAllDevices() {
  PropertiesService.getScriptProperties().deleteProperty("tokens");
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

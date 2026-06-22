// A lightweight per-browser identifier so users see their own interview
// history without requiring full auth. (Auth can replace this later.)
export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("ipa_client_id");
  if (!id) {
    id =
      "c_" +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);
    localStorage.setItem("ipa_client_id", id);
  }
  return id;
}

const PRIVILEGED_ADMIN_ROLES = new Set(["Admin", "Manager"]);

export const isPrivilegedAdminRole = (role) =>
  PRIVILEGED_ADMIN_ROLES.has(String(role || "").trim());

export default isPrivilegedAdminRole;

export function getUserInitials(name) {
  if (typeof name !== "string" || !name.trim()) return "U";

  const nameParts = name.trim().split(/\s+/);
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : nameParts[0][0];

  return initials.toUpperCase();
}

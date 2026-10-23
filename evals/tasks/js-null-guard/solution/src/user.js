export function displayName(user) {
  return user && typeof user.name === 'string' ? user.name.trim() : 'Anonymous';
}

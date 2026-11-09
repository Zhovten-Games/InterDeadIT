/** Content access and remote identity are separate capabilities. */
export function authorizationEnabled(config = {}) {
  return config.auth?.enabled !== false;
}

export function contentAccess(config, visibility) {
  return !authorizationEnabled(config) || visibility?.status === 'authenticated';
}

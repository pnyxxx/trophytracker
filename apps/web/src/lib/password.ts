/** Longueur minimale imposée par Supabase Auth (GOTRUE_PASSWORD_MIN_LENGTH). */
export const PASSWORD_MIN = 10;

/** Vrai si le mot de passe ne peut pas être envoyé (un mot de passe facultatif peut rester vide). */
export const passwordTooShort = (password: string, optional = false) =>
  !(optional && password.length === 0) && password.length < PASSWORD_MIN;

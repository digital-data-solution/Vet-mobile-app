// This file provides a password reset (forgot password) helper using Supabase
export async function resetPassword(email: string) {
  // Supabase supports password reset via email only
  // This will send a password reset link to the user's email
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
}

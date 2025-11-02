import { supabase, UserProfile } from './supabase';

/**
* Get the current logged-in user profile
*/
export async function getCurrentUser(): Promise<UserProfile | null> {
 const { data: { user }, error } = await supabase.auth.getUser();

 if (error) throw error;
 if (!user) return null;

 const { data: profile, error: profileError } = await supabase
 	.from('user_profiles')
 	.select('*')
 	.eq('id', user.id)
 	.maybeSingle();

 if (profileError) throw profileError;
 return profile;
}

/**
* Sign in user with email & password and enforce role-based access
*/
export async function signIn(email: string, password: string) {
 // Authenticate user
 const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
 	email,
 	password,
 });

 if (authError) throw authError;
 if (!authData.user) throw new Error('User login failed');

 // Fetch user profile to check role
 const { data: profile, error: profileError } = await supabase
 	.from('user_profiles')
 	.select('*')
 	.eq('id', authData.user.id)
 	.maybeSingle();

 if (profileError) throw profileError;
 if (!profile) throw new Error('User profile not found');

 // Restrict farmers from logging in
 if (profile.role === 'farmer') {
 	await supabase.auth.signOut(); // optional: sign out immediately
 	throw new Error('Access denied: Farmers cannot log in to this portal.');
 }

 return { auth: authData, profile };
}

/**
* Sign up new user with role assignment
*/
export async function signUp(email: string, password: string, userData: {
 full_name: string;
 phone?: string;
 role: 'farmer' | 'insurer' | 'admin';
}) {
 const { data: authData, error: authError } = await supabase.auth.signUp({
 	email,
 	password,
 });

 if (authError) throw authError;
 if (!authData.user) throw new Error('User creation failed');

 const { data: profile, error: profileError } = await supabase
 	.from('user_profiles')
 	.insert({
 	  id: authData.user.id,
 	  email,
 	  full_name: userData.full_name,
 	  phone: userData.phone,
 	  role: userData.role,
 	})
 	.select()
 	.single();

 if (profileError) throw profileError;

 return { auth: authData, profile };
}

/**
* Sign out current user
*/
export async function signOut() {
 const { error } = await supabase.auth.signOut();
 if (error) throw error;
}

/**
* Check if the user is admin
*/
export function isAdmin(profile: UserProfile | null): boolean {
 return profile?.role === 'admin';
}

/**
* Check if the user is insurer or admin
*/
export function isInsurer(profile: UserProfile | null): boolean {
 return profile?.role === 'insurer' || profile?.role === 'admin';
}


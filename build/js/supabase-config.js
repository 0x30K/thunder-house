/**
 * Thunder House ENT - Supabase Client Configuration
 */
const SUPABASE_URL = 'https://bxxthkocoutjszrjkxlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4eHRoa29jb3V0anN6cmpreGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzQwMzgsImV4cCI6MjA4NTA1MDAzOH0.k9XRxmUw-QQIiApE-JCeSYrkogvRzfmJmRmVIdXnEmA';

// Initialize Supabase Client using standard CDN library
if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('Supabase JS library not loaded yet.');
}

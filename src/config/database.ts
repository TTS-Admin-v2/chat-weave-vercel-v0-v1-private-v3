import { createClient } from "@supabase/supabase-js"
import type { Database } from "../types/database"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase configuration")
}

export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Test database connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from("profiles").select("count").limit(1)
    if (error) throw error
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}

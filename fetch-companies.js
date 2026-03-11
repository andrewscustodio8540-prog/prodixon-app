import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCompanies() {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) console.error("Error fetching", error);
    console.log("Companhias Reais no Banco de Dados:", data);
}

checkCompanies();

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key || url.includes('sua-url') || key.includes('sua-chave')) {
    console.log('❌ Erro: As chaves do Supabase não foram configuradas no arquivo .env');
    return;
  }

  console.log('Tentando conectar ao Supabase...');
  console.log('URL:', url);
  
  const supabase = createClient(url, key);

  try {
    const { data, error } = await supabase.from('sites').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Falha na conexão:', error.message);
    } else {
      console.log('✅ Conexão bem-sucedida! Supabase está pronto.');
    }
  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
  }
}

testConnection();

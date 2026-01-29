// const fetch = require('node-fetch'); // Usando fetch nativo do Node 18+

const BASE_URL = 'http://localhost:3001/api';
const CREDENTIALS = {
  username: 'testuser',
  password: '12345'
};

async function runTest() {
  console.log('Iniciando teste de edição de site...');

  // 1. Login
  console.log('1. Autenticando...');
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDENTIALS)
  });

  if (!loginRes.ok) {
    console.error('Falha no login:', await loginRes.text());
    return;
  }

  const { token } = await loginRes.json();
  console.log('Login realizado com sucesso. Token obtido.');

  // 2. Criar Site
  console.log('2. Criando site de teste...');
  const siteData = {
    name: 'Site Original',
    domain: 'original.com',
    slugs: ['slug1', 'slug2']
  };

  const createRes = await fetch(`${BASE_URL}/sites`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(siteData)
  });

  if (!createRes.ok) {
    console.error('Falha ao criar site:', await createRes.text());
    return;
  }

  const site = await createRes.json();
  console.log('Site criado:', site);

  // 3. Editar Site
  console.log('3. Editando site...');
  const updateData = {
    name: 'Site Editado',
    domain: 'editado.com',
    slugs: ['novo-slug1', 'novo-slug2', 'novo-slug3']
  };

  const editRes = await fetch(`${BASE_URL}/sites/${site.id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });

  if (!editRes.ok) {
    console.error('Falha ao editar site:', await editRes.text());
    return;
  }

  const updatedSite = await editRes.json();
  console.log('Site atualizado (resposta da API):', updatedSite);

  // 4. Verificar Persistência (GET)
  console.log('4. Verificando persistência...');
  const getRes = await fetch(`${BASE_URL}/sites`, {
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });

  const allSites = await getRes.json();
  const foundSite = allSites.find(s => s.id === site.id);

  if (foundSite) {
    console.log('Site recuperado:', foundSite);
    if (foundSite.name === updateData.name && 
        foundSite.domain === updateData.domain && 
        JSON.stringify(foundSite.slugs) === JSON.stringify(updateData.slugs)) {
      console.log('SUCESSO: O site foi atualizado corretamente!');
    } else {
      console.error('FALHA: Os dados do site não correspondem ao esperado.');
    }
  } else {
    console.error('FALHA: Site não encontrado na listagem.');
  }

  // 5. Limpeza (Deletar Site)
  console.log('5. Limpando (Deletando site)...');
  const deleteRes = await fetch(`${BASE_URL}/sites/${site.id}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });

  if (deleteRes.ok) {
    console.log('Site deletado com sucesso.');
  } else {
    console.error('Falha ao deletar site:', await deleteRes.text());
  }
}

runTest().catch(console.error);

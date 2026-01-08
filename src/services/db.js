// src/services/db.js
const STORAGE_KEY = 'ar_experience_data';
let fileHandle = null; // Armazena a referência ao arquivo físico

export const db = {
  // Tenta carregar dados iniciais do arquivo JSON na pasta public
  loadInitial: async () => {
    try {
      // Tenta buscar o arquivo na pasta public
      const response = await fetch('/ar_database.json');
      if (response.ok) {
        const json = await response.json();
        // Atualiza o cache local com os dados do arquivo
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
        return json;
      }
    } catch (e) {
      console.log('Nenhum arquivo ar_database.json encontrado em public/');
    }
    return db.getAll();
  },

  // Ler todos os itens
  getAll: () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Salvar ou Atualizar um item
  save: (item) => {
    const items = db.getAll();
    const index = items.findIndex(i => i.id === item.id);
    
    if (index >= 0) {
      // Atualizar existente
      items[index] = item;
    } else {
      // Criar novo
      items.push(item);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    
    // Se houver um arquivo conectado, salva nele automaticamente
    if (fileHandle) {
      db.saveToDisk().catch(err => console.error('Erro no auto-save:', err));
    }
    
    return items;
  },

  // Deletar um item
  delete: (id) => {
    const items = db.getAll().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    
    // Se houver um arquivo conectado, salva nele automaticamente
    if (fileHandle) {
      db.saveToDisk().catch(err => console.error('Erro no auto-save:', err));
    }
    
    return items;
  },

  // Conectar a um arquivo local (File System Access API)
  connectFile: async () => {
    try {
      // Abre o seletor de arquivos
      [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON Database', accept: { 'application/json': ['.json'] } }],
      });
      
      // Lê o conteúdo e atualiza o app
      const file = await fileHandle.getFile();
      const text = await file.text();
      const json = JSON.parse(text);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
      return json;
    } catch (err) {
      console.error('Conexão de arquivo cancelada ou erro:', err);
      return null;
    }
  },

  // Salvar no disco (no arquivo conectado ou download)
  saveToDisk: async () => {
    const data = localStorage.getItem(STORAGE_KEY) || '[]';
    
    if (fileHandle) {
      // Se já temos permissão, escreve direto no arquivo
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      return true; // Salvo com sucesso no arquivo
    } else {
      // Se não, faz o download clássico
      db.downloadJson();
      return false; // Foi feito download
    }
  },

  // Exportar para arquivo JSON físico
  downloadJson: () => {
    const data = localStorage.getItem(STORAGE_KEY) || '[]';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ar_database.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Importar de um arquivo JSON físico
  uploadJson: (file, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (Array.isArray(json)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
          callback(json);
        } else {
          alert('Arquivo JSON inválido. Deve ser uma lista.');
        }
      } catch (err) {
        alert('Erro ao ler o arquivo JSON.');
      }
    };
    reader.readAsText(file);
  }
};

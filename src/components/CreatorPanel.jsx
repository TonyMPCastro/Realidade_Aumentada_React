import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../services/db'; // Importando o serviço criado (ajuste o caminho se necessário)

const CreatorPanel = () => {
  const [formData, setFormData] = useState({
    id: null, // Adicionado ID para controle de edição
    name: '',
    description: '',
    modelType: 'box', // Placeholder simples
    modelUrl: '', // URL para modelo customizado
    position: '0 0.5 0',
    rotation: '0 0 0',
    scale: '1 1 1'
  });
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [savedItems, setSavedItems] = useState([]);
  const [isFileConnected, setIsFileConnected] = useState(false);

  // Carrega os dados salvos ao iniciar
  useEffect(() => {
    const initData = async () => {
      // Tenta carregar do arquivo public/ar_database.json primeiro
      const data = await db.loadInitial();
      setSavedItems(data);
    };
    initData();
  }, []);

  // Limpeza de estilos globais que o A-Frame pode injetar
  useEffect(() => {
    const cleanupAR = () => {
      document.documentElement.classList.remove('a-html');
      document.body.classList.remove('a-body');
      
      const resetStyles = (el) => {
        // Remove propriedades nocivas específicas que o AR.js injeta
        const badProps = ['margin-top', 'margin-left', 'margin-right', 'margin-bottom', 'top', 'left', 'min-width', 'max-width'];
        badProps.forEach(p => {
          if (el.style.getPropertyValue(p)) el.style.removeProperty(p);
        });

        // Força propriedades de layout padrão
        if (el.style.position !== 'static') el.style.position = 'static';
        if (el.style.overflow !== 'auto') el.style.overflow = 'auto';
        if (el.style.width !== '100%') el.style.width = '100%';
        if (el.style.height !== 'auto') el.style.height = 'auto';
        if (el.style.margin !== '0px') el.style.margin = '0px';
      };

      resetStyles(document.body);
      resetStyles(document.documentElement);

      // Garante que não sobrem vídeos de câmera ocultos
      document.querySelectorAll('video').forEach(v => {
        if(v.srcObject) v.srcObject.getTracks().forEach(t => t.stop());
        v.remove();
      });
    };

    // Executa limpeza inicial e monitora inserções de vídeo (bloqueio ativo)
    cleanupAR();
    
    // Monitora alterações de estilo e novos elementos
    const observer = new MutationObserver((mutations) => {
      let shouldClean = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
           mutation.addedNodes.forEach(node => {
             if (node.tagName === 'VIDEO') shouldClean = true;
           });
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
           // Se margin-top negativo aparecer ou position mudar, limpa
           const target = mutation.target;
           if (target.style.marginTop && target.style.marginTop.includes('-')) shouldClean = true;
           if (target.style.position === 'fixed') shouldClean = true;
        }
      });
      if (shouldClean) cleanupAR();
    });

    observer.observe(document.body, { childList: true, attributes: true, attributeFilter: ['style'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    return () => {
      observer.disconnect();
      cleanupAR();
    };
  }, []);

  // Helpers para manipular vetores (string "x y z")
  const getVectorValue = (field, index) => {
    const val = formData[field] ? formData[field].split(' ')[index] : (field === 'scale' ? 1 : 0);
    return parseFloat(val);
  };

  const updateVector = (field, index, value) => {
    const current = (formData[field] || (field === 'scale' ? '1 1 1' : '0 0 0')).split(' ');
    current[index] = value;
    setFormData({ ...formData, [field]: current.join(' ') });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!formData.name) return alert('Preencha o nome!');

    // Cria a URL baseada no local atual, apontando para o visualizador
    const baseUrl = window.location.origin + '/viewer';
    
    // Prepara o objeto para salvar
    const newItem = {
      ...formData,
      id: formData.id || Date.now(), // Gera ID se não existir
      createdAt: new Date().toISOString()
    };

    // Gera a URL final
    const params = new URLSearchParams({
      name: newItem.name,
      description: newItem.description,
      modelType: newItem.modelType,
      modelUrl: newItem.modelUrl || '',
      position: newItem.position,
      rotation: newItem.rotation,
      scale: newItem.scale
    }).toString();
    
    newItem.fullUrl = `${baseUrl}?${params}`;

    // Salva no "banco" e atualiza a lista
    const updatedList = db.save(newItem);
    setSavedItems(updatedList);
    setGeneratedUrl(newItem.fullUrl);
    
    // Limpa o formulário para criar um novo
    resetForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir?')) {
      const updatedList = db.delete(id);
      setSavedItems(updatedList);
      if (formData.id === id) resetForm();
    }
  };

  const handleEdit = (item) => {
    setFormData({
      id: item.id,
      name: item.name,
      description: item.description,
      modelType: item.modelType,
      modelUrl: item.modelUrl || '',
      position: item.position || '0 0.5 0',
      rotation: item.rotation || '0 0 0',
      scale: item.scale || '1 1 1'
    });
    setGeneratedUrl(item.fullUrl);
  };

  const resetForm = (keepUrl = false) => {
    setFormData({ 
      id: null, 
      name: '', 
      description: '', 
      modelType: 'box', 
      modelUrl: '',
      position: '0 0.5 0',
      rotation: '0 0 0',
      scale: '1 1 1'
    });
    if (keepUrl !== true) setGeneratedUrl('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      db.uploadJson(file, (newList) => {
        setSavedItems(newList);
        alert('Dados importados com sucesso!');
      });
    }
  };

  const handleConnectFile = async () => {
    const data = await db.connectFile();
    if (data) {
      setSavedItems(data);
      setIsFileConnected(true);
      alert('Arquivo conectado! As alterações serão salvas automaticamente nele.');
    }
  };

  return (
    <div className="container mt-5">
      
      {/* Cabeçalho com controles de arquivo JSON */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Gerenciador de Experiências AR</h1>
        <div>
          <button className={`btn me-2 ${isFileConnected ? 'btn-success' : 'btn-outline-secondary'}`} onClick={handleConnectFile}>
            {isFileConnected ? '✅ Arquivo Vinculado (Auto-Save)' : '📁 Vincular Arquivo JSON'}
          </button>
          
          {!isFileConnected && (
            <button className="btn btn-outline-primary" onClick={() => db.downloadJson()}>
              💾 Baixar JSON
            </button>
          )}
        </div>
      </div>

      <div className="row">
        {/* Formulário de Criação/Edição */}
        <div className="col-md-6">
          <div className="card p-3 mb-4">
            <h3>{formData.id ? 'Editar Experiência' : 'Nova Experiência'}</h3>
          <div className="mb-3">
            <label className="form-label">Nome do Personagem</label>
            <input 
              type="text" 
              className="form-control" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="Ex: Santos Dumont"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Narrativa Histórica</label>
            <textarea 
              className="form-control" 
              name="description" 
              rows="4" 
              value={formData.description} 
              onChange={handleChange}
            ></textarea>
          </div>
          <div className="mb-3">
            <label className="form-label">Modelo 3D (Placeholder)</label>
            <select className="form-select" name="modelType" value={formData.modelType} onChange={handleChange}>
              <option value="box">Cubo Genérico</option>
              <option value="sphere">Esfera Genérica</option>
              <option value="cylinder">Cilindro</option>
              <option value="cone">Cone</option>
              <option value="torus">Rosquinha (Torus)</option>
              <option value="custom">Meu Modelo 3D (.glb)</option>
              {/* Futuramente aqui entrariam modelos GLB reais */}
            </select>
          </div>

          {formData.modelType === 'custom' && (
            <div className="mb-3">
              <label className="form-label">URL do Arquivo .glb</label>
              <input 
                type="text" 
                className="form-control" 
                name="modelUrl" 
                value={formData.modelUrl} 
                onChange={handleChange} 
                placeholder="Ex: /meu_modelo.glb ou https://exemplo.com/modelo.glb"
              />
              <div className="form-text">O arquivo deve estar na pasta public ou ser uma URL externa acessível (CORS).</div>
            </div>
          )}

          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={handleSave}>
              {formData.id ? 'Atualizar' : 'Salvar & Gerar'}
            </button>
            {formData.id && <button className="btn btn-secondary" onClick={resetForm}>Cancelar Edição</button>}
          </div>
          </div>
        </div>

        {/* Coluna Direita: Preview e QR Code */}
        <div className="col-md-6">
          
          {/* Área de Preview 3D (Sem Câmera) */}
          <div className="card p-3 mb-4 bg-light">
            <h5 className="card-title">Ajuste de Visualização</h5>
            <p className="small text-muted">Defina como o objeto aparecerá inicialmente.</p>
            
            <div style={{ height: '300px', width: '100%', position: 'relative', border: '1px solid #ccc', marginBottom: '15px', borderRadius: '4px', overflow: 'hidden' }}>
              {/* a-scene sem arjs para não abrir câmera */}
              <a-scene embedded vr-mode-ui="enabled: false" renderer="alpha: false" style={{ width: '100%', height: '100%' }}>
                <a-sky color="#e0e0e0"></a-sky>
                <a-camera position="0 1.5 4"></a-camera>
                <a-light type="ambient" intensity="0.6"></a-light>
                <a-light type="directional" position="1 2 1" intensity="1"></a-light>
                
                {/* Objeto Controlado */}
                <a-entity 
                  position={formData.position} 
                  rotation={formData.rotation} 
                  scale={formData.scale}
                >
                  {formData.modelType === 'box' && <a-box material="color: blue; opacity: 0.8"></a-box>}
                  {formData.modelType === 'sphere' && <a-sphere radius="0.5" material="color: red; opacity: 0.8"></a-sphere>}
                  {formData.modelType === 'cylinder' && <a-cylinder radius="0.5" height="1.5" color="#FFC65D"></a-cylinder>}
                  {formData.modelType === 'cone' && <a-cone radius-bottom="0.5" radius-top="0" height="1.5" color="green"></a-cone>}
                  {formData.modelType === 'torus' && <a-torus radius="0.5" radius-tubular="0.1" color="purple"></a-torus>}
                  {formData.modelType === 'custom' && formData.modelUrl && (
                    <a-entity gltf-model={formData.modelUrl}></a-entity>
                  )}
                </a-entity>

                {/* Chão/Grid para referência */}
                <a-grid material="src: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==); repeat: 50 50" rotation="-90 0 0" position="0 0 0" width="20" height="20"></a-grid>
              </a-scene>
            </div>

            {/* Controles Deslizantes */}
            <div className="row g-2">
              <div className="col-12">
                <label className="form-label small fw-bold">Tamanho (Escala): {getVectorValue('scale', 0)}</label>
                <input type="range" className="form-range" min="0.1" max="5" step="0.1" 
                  value={getVectorValue('scale', 0)} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, scale: `${val} ${val} ${val}` });
                  }} 
                />
              </div>
              
              <div className="col-md-4">
                <label className="form-label small fw-bold">Giro (Y): {getVectorValue('rotation', 1)}°</label>
                <input type="range" className="form-range" min="0" max="360" step="5"
                  value={getVectorValue('rotation', 1)}
                  onChange={(e) => updateVector('rotation', 1, e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Inclinação (X): {getVectorValue('rotation', 0)}°</label>
                <input type="range" className="form-range" min="-180" max="180" step="5"
                  value={getVectorValue('rotation', 0)}
                  onChange={(e) => updateVector('rotation', 0, e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Inclinação (Z): {getVectorValue('rotation', 2)}°</label>
                <input type="range" className="form-range" min="-180" max="180" step="5"
                  value={getVectorValue('rotation', 2)}
                  onChange={(e) => updateVector('rotation', 2, e.target.value)}
                />
              </div>

              <div className="col-12">
                <label className="form-label small fw-bold">Altura (Posição Y): {getVectorValue('position', 1)}</label>
                <input type="range" className="form-range" min="-2" max="5" step="0.1"
                  value={getVectorValue('position', 1)}
                  onChange={(e) => updateVector('position', 1, e.target.value)}
                />
              </div>
            </div>
          </div>

          {generatedUrl && (
            <div className="card p-4 mt-4 mt-md-0">
              <h4>QR Code para o Aluno</h4>
              <div className="m-auto my-3">
                <QRCodeSVG value={generatedUrl} size={200} />
              </div>
              <p className="text-muted small">Escaneie para ver a experiência</p>
              <a href={generatedUrl} target="_blank" rel="noreferrer" className="btn btn-outline-secondary btn-sm">Abrir Link Direto</a>
            </div>
          )}
        </div>
      </div>

      {/* Listagem CRUD */}
      <div className="row mt-5">
        <div className="col-12">
          <h3>Experiências Salvas</h3>
          {savedItems.length === 0 ? (
            <p className="text-muted">Nenhuma experiência salva ainda.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Modelo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {savedItems.map(item => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.modelType}</td>
                      <td>
                        <button className="btn btn-sm btn-info me-2" onClick={() => handleEdit(item)}>✏️ Editar</button>
                        <a href={item.fullUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-success me-2">👁️ Abrir</a>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>🗑️ Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorPanel;

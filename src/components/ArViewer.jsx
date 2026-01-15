import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const ArViewer = () => {
  const [searchParams] = useSearchParams();
  
  // Inicializa o estado JÁ com os dados da URL para garantir que a posição inicial seja respeitada desde o primeiro frame
  const [character, setCharacter] = useState(() => {
    const name = searchParams.get('name');
    const description = searchParams.get('description');
    const modelType = searchParams.get('modelType');
    const modelUrlParam = searchParams.get('modelUrl');
    const position = searchParams.get('position');
    const rotation = searchParams.get('rotation');
    const scale = searchParams.get('scale');

    if (name) {
      let finalUrl = modelUrlParam;
      if (modelType === 'custom' && !finalUrl) {
        finalUrl = '/Duck.glb';
      }
      return {
        name,
        description,
        modelType,
        modelUrl: finalUrl || '/Duck.glb',
        position: position || '0 0.5 0', // Reduzido para evitar proximidade excessiva com a câmera
        rotation: rotation || '0 0 0',
        scale: scale || '1 1 1'
      };
    }
    
    // Fallback padrão
    return {
      name: 'Iniciando...',
      description: 'Aguarde a câmera...',
      modelType: 'box',
      modelUrl: '/Duck.glb',
      position: '0 0.5 0',
      rotation: '0 0 0',
      scale: '1 1 1'
    };
  });
  
  const [markerFound, setMarkerFound] = useState(false);
  const [interactionMode, setInteractionMode] = useState('rotate'); // 'rotate' ou 'move'
  const markerRef = useRef(null);
  const customModelRef = useRef(null);
  const modelContainerRef = useRef(null);
  const [dialogues, setDialogues] = useState([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [facingMode, setFacingMode] = useState('environment');

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Limpeza do AR.js ao sair da tela (Desmontar componente)
  useEffect(() => {
    return () => {
      // Remove elementos de vídeo injetados pelo AR.js no body
      const videos = document.querySelectorAll('video');
      videos.forEach(v => {
        if (v.srcObject) {
          v.srcObject.getTracks().forEach(track => track.stop());
        }
        v.remove();
      });
      // Restaura o scroll da página que o AR.js bloqueia
      document.body.style.overflow = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.margin = '';
      document.body.style.position = '';
    };
  }, []);

  // Fix para o problema de "Zoom" e "Grande Angular" em smartphones
  useEffect(() => {
    const fixARVideo = () => {
      const video = document.querySelector('#arjs-video');
      const container = document.querySelector('#camera-frame');
      
      if (video && container) {
        const rect = container.getBoundingClientRect();
        // Ajusta o vídeo exatamente ao tamanho e posição do quadro superior
        video.style.setProperty('width', `${rect.width}px`, 'important');
        video.style.setProperty('height', `${rect.height}px`, 'important');
        video.style.setProperty('position', 'fixed', 'important');
        video.style.setProperty('top', `${rect.top}px`, 'important');
        video.style.setProperty('left', `${rect.left}px`, 'important');
        video.style.setProperty('object-fit', 'cover', 'important');
        video.style.setProperty('margin-left', '0px', 'important');
        video.style.setProperty('margin-top', '0px', 'important');
        video.style.zIndex = '0'; // Garante que fique atrás dos elementos de UI, mas visível
      }
    };

    // Monitora a inserção do vídeo pelo AR.js no DOM
    const observer = new MutationObserver(fixARVideo);
    observer.observe(document.body, { childList: true });
    
    const interval = setInterval(fixARVideo, 1000); // Reforço periódico

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Registra o componente A-Frame dentro do useEffect para garantir que AFRAME esteja carregado
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AFRAME) {
      if (!window.AFRAME.components['mouse-manipulation']) {
        window.AFRAME.registerComponent('mouse-manipulation', {
          schema: { 
            speed: { default: 5 },
            mode: { default: 'rotate' } 
          },
          init: function () {
            this.ifMouseDown = false;
            this.x_cord = 0;
            this.y_cord = 0;
            this.bindMethods();
            
            // Eventos de Mouse
            document.addEventListener('mousedown', this.onMouseDown);
            document.addEventListener('mouseup', this.onMouseUp);
            document.addEventListener('mousemove', this.onMouseMove);
            
            // Eventos de Touch (Mobile)
            document.addEventListener('touchstart', this.onTouchStart);
            document.addEventListener('touchend', this.onTouchEnd);
            document.addEventListener('touchmove', this.onTouchMove, { passive: false });
          },
          bindMethods: function() {
            this.onMouseDown = this.onMouseDown.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);
            this.onMouseMove = this.onMouseMove.bind(this);
            this.onTouchStart = this.onTouchStart.bind(this);
            this.onTouchEnd = this.onTouchEnd.bind(this);
            this.onTouchMove = this.onTouchMove.bind(this);
          },
          remove: function () {
            document.removeEventListener('mousedown', this.onMouseDown);
            document.removeEventListener('mouseup', this.onMouseUp);
            document.removeEventListener('mousemove', this.onMouseMove);
            document.removeEventListener('touchstart', this.onTouchStart);
            document.removeEventListener('touchend', this.onTouchEnd);
            document.removeEventListener('touchmove', this.onTouchMove);
          },
          onMouseDown: function (evt) {
            if (evt.target.closest('.ar-ui-overlay')) return;
            this.ifMouseDown = true;
            this.x_cord = evt.clientX;
            this.y_cord = evt.clientY;
          },
          onMouseUp: function () {
            this.ifMouseDown = false;
          },
          onMouseMove: function (evt) {
            if (this.ifMouseDown && evt.clientX !== undefined) {
              var temp_x = evt.clientX - this.x_cord;
              var temp_y = evt.clientY - this.y_cord;
              
              // Ajuste de sensibilidade para movimentos mais suaves
              const sensitivity = this.data.speed / 1000;
              
              if (this.data.mode === 'move') {
                // Translação: X (horizontal) e Y (vertical/altura)
                this.el.object3D.position.x += temp_x * sensitivity;
                this.el.object3D.position.y -= temp_y * sensitivity;
              } else {
                // Rotação
                this.el.object3D.rotation.y += temp_x * sensitivity;
                let newX = this.el.object3D.rotation.x + (temp_y * sensitivity);
                const limit = Math.PI / 4;
                this.el.object3D.rotation.x = Math.max(-limit, Math.min(limit, newX));
              }

              this.x_cord = evt.clientX;
              this.y_cord = evt.clientY;
            }
          },
          onTouchStart: function (evt) {
            if (evt.target.closest('.ar-ui-overlay')) return;
            this.ifMouseDown = true;
            this.x_cord = evt.touches[0].clientX;
            this.y_cord = evt.touches[0].clientY;
          },
          onTouchEnd: function () {
            this.ifMouseDown = false;
          },
          onTouchMove: function (evt) {
            if (this.ifMouseDown && evt.touches && evt.touches[0]) {
              evt.preventDefault(); // Importante para não rolar a tela
              var temp_x = evt.touches[0].clientX - this.x_cord;
              var temp_y = evt.touches[0].clientY - this.y_cord;
              
              const sensitivity = this.data.speed / 1000;

              if (this.data.mode === 'move') {
                this.el.object3D.position.x += temp_x * sensitivity;
                this.el.object3D.position.y -= temp_y * sensitivity;
              } else {
                this.el.object3D.rotation.y += temp_x * sensitivity;
                let newX = this.el.object3D.rotation.x + (temp_y * sensitivity);
                const limit = Math.PI / 4;
                this.el.object3D.rotation.x = Math.max(-limit, Math.min(limit, newX));
              }
              
              this.x_cord = evt.touches[0].clientX;
              this.y_cord = evt.touches[0].clientY;
            }
          }
        });
      }
    }
  }, []);

  // 1. Atualiza os dados com base na URL
  useEffect(() => {
    // Mantemos este useEffect para reagir a mudanças na URL se houver navegação sem recarregar
    const name = searchParams.get('name');
    // Se o nome mudou e é diferente do atual, atualizamos (lógica de fallback já está no useState inicial)
    if (name && name !== character.name) {
       // A lógica completa de atualização pode ficar aqui se necessário, 
       // mas a inicialização lazy já resolve o problema do "boot" inicial.
    }
  }, [searchParams]);

  // 1.5 Processa a descrição em diálogos (separados por quebra de linha)
  useEffect(() => {
    if (character.description) {
      // Divide o texto por quebras de linha e remove linhas vazias
      const lines = character.description.split('\n').filter(line => line.trim() !== '');
      setDialogues(lines.length > 0 ? lines : [character.description]);
      setCurrentLine(0);
    }
  }, [character.description]);

  // 2. Configura os eventos do Marcador (Found/Lost)
  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      const handleFound = () => {
        console.log('Marcador encontrado!');
        setMarkerFound(true);
      };
      const handleLost = () => {
        console.log('Marcador perdido!');
        setMarkerFound(false);
      };

      marker.addEventListener('markerFound', handleFound);
      marker.addEventListener('markerLost', handleLost);

      return () => {
        marker.removeEventListener('markerFound', handleFound);
        marker.removeEventListener('markerLost', handleLost);
      };
    }
  }, [character]); // Recria os listeners se o personagem mudar (re-render)

  // 3. Listener para erro de carregamento do modelo (Fallback)
  useEffect(() => {
    const modelEl = customModelRef.current;
    if (modelEl && character.modelType === 'custom') {
      const handleError = () => {
        console.warn('Erro ao carregar modelo customizado. Usando Duck.glb.');
        setCharacter(prev => ({ ...prev, modelUrl: '/Duck.glb' }));
      };
      modelEl.addEventListener('model-error', handleError);
      return () => modelEl.removeEventListener('model-error', handleError);
    }
  }, [character.modelType, character.modelUrl]);

  // Função para rotação manual via botões
  const handleManualRotation = (axis, direction) => {
    if (modelContainerRef.current) {
      modelContainerRef.current.object3D.rotation[axis] += direction * (Math.PI / 8);
    }
  };

  // Calcula a posição do texto dinamicamente para acompanhar o objeto
  // Evita que o texto fique escondido atrás do modelo ou sobreposto
  const getTextPosition = () => {
    const pos = character.position ? character.position.split(' ').map(Number) : [0, 0, 0];
    const scale = character.scale ? character.scale.split(' ').map(Number) : [1, 1, 1];
    
    const objX = pos[0] || 0;
    const objY = pos[1] || 0;
    const objZ = pos[2] || 0;
    const scaleX = scale[0] || 1;

    // Posiciona à direita: Posição X do objeto + Metade da sua Largura (Escala) + Margem fixa (1.2)
    return `${objX + (scaleX / 2) + 1.2} ${objY} ${objZ}`;
  };

  return (
    <div className="d-flex flex-column align-items-center" style={{ height: '100dvh', width: '100vw', backgroundColor: 'transparent', overflow: 'hidden' }}>
      
      {/* Quadro da Câmera (Topo) */}
      <div id="camera-frame" style={{ width: '100%', flex: '1', position: 'relative', overflow: 'hidden', backgroundColor: 'transparent', touchAction: 'none' }}>
        <a-scene 
          key={facingMode}
          embedded 
          arjs={`sourceType: webcam; debugUIEnabled: false; detectionMode: mono; facingMode: ${facingMode}; sourceWidth: 1280; sourceHeight: 720; displayWidth: 1280; displayHeight: 720;`} 
          renderer="antialias: true; alpha: true; precision: medium;" 
          vr-mode-ui="enabled: false"
          id="scene"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        >
          <a-light type="ambient" color="#ffffff" intensity="1"></a-light>
          <a-light type="directional" color="#ffffff" intensity="1.5" position="1 1 1"></a-light>
          
          <a-marker 
            preset="hiro" 
            ref={markerRef}
            smooth="true"
            smoothCount="5"
          >
            <a-entity position={character.position} rotation={character.rotation} scale={character.scale}>
              <a-entity id="model-container" ref={modelContainerRef} mouse-manipulation={`mode: ${interactionMode}`}>
                {character.modelType === 'box' && (
                  <a-entity>
                    <a-box material="color: blue; opacity: 0.8"></a-box>
                    <a-box wireframe="true" material="color: #ffffff"></a-box>
                    {/* Vértices (Pontos de destaque) */}
                    <a-sphere radius="0.05" position="0.5 0.5 0.5" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="0.5 0.5 -0.5" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="0.5 -0.5 0.5" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="0.5 -0.5 -0.5" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="-0.5 0.5 0.5" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="-0.5 0.5 -0.5" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="-0.5 -0.5 0.5" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="-0.5 -0.5 -0.5" color="yellow"></a-sphere>
                  </a-entity>
                )}
                {character.modelType === 'sphere' && (
                  <a-entity>
                    <a-sphere radius="0.5" material="color: red; opacity: 0.8"></a-sphere>
                    <a-sphere radius="0.5" wireframe="true" material="color: #ffffff"></a-sphere>
                  </a-entity>
                )}
                {character.modelType === 'cylinder' && (
                  <a-entity>
                    <a-cylinder radius="0.5" height="1" material="color: orange; opacity: 0.8"></a-cylinder>
                    <a-cylinder radius="0.5" height="1" wireframe="true" material="color: #ffffff"></a-cylinder>
                    <a-sphere radius="0.05" position="0 0.5 0" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="0 -0.5 0" color="yellow"></a-sphere>
                  </a-entity>
                )}
                {character.modelType === 'cone' && (
                  <a-entity>
                    <a-cone radius-bottom="0.5" radius-top="0" height="1" material="color: green; opacity: 0.8"></a-cone>
                    <a-cone radius-bottom="0.5" radius-top="0" height="1" wireframe="true" material="color: #ffffff"></a-cone>
                    <a-sphere radius="0.05" position="0 0.5 0" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="0 -0.5 0" color="yellow"></a-sphere>
                  </a-entity>
                )}
                {character.modelType === 'pyramid' && (
                  <a-entity>
                    <a-cone segments-radial="4" radius-bottom="0.7" height="1" material="color: #FFD700; opacity: 0.8"></a-cone>
                    <a-cone segments-radial="4" radius-bottom="0.7" height="1" wireframe="true" material="color: #ffffff"></a-cone>
                    {/* Vértices da Pirâmide */}
                    <a-sphere radius="0.05" position="0 0.5 0" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="0.5 -0.5 0.5" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="0.5 -0.5 -0.5" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="-0.5 -0.5 0.5" color="yellow"></a-sphere>
                    <a-sphere radius="0.05" position="-0.5 -0.5 -0.5" color="yellow"></a-sphere>
                  </a-entity>
                )}
                {character.modelType === 'torus' && (
                  <a-entity>
                    <a-torus radius="0.4" radius-tubular="0.1" material="color: purple; opacity: 0.8"></a-torus>
                    <a-torus radius="0.4" radius-tubular="0.1" wireframe="true" material="color: #ffffff"></a-torus>
                  </a-entity>
                )}
                {character.modelType === 'custom' && <a-entity ref={customModelRef} gltf-model={character.modelUrl}></a-entity>}
              </a-entity>
            </a-entity>

            {/* Texto flutuante ao lado do objeto */}
            <a-entity position={getTextPosition()} rotation="-90 0 0">
              <a-text 
                value={character.name} 
                width="6" 
                align="center" 
                color="#ffffff"
              ></a-text>
            </a-entity>
          </a-marker>
          <a-entity camera="near: 0.01; far: 1000;"></a-entity>
        </a-scene>

        {/* Badge de Status flutuando no quadro da câmera */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
          <span className={`badge ${markerFound ? 'bg-success' : 'bg-warning text-dark'}`}>
            {markerFound ? '✅ Hiro Detectado' : '🔍 Procure o Hiro'}
          </span>
        </div>
      </div>

      {/* Painel de Ações (Baixo) */}
      <div
        className="bg-white p-3 shadow-lg w-100" 
        style={{ 
          maxWidth: '600px',
          flex: '0 0 auto', 
          maxHeight: '35vh', 
          borderRadius: '20px 20px 0 0', 
          zIndex: 20 
        }}
      >
        <h2 className="h5 fw-bold mb-3">{character.name}</h2>
        
        <div className="d-grid gap-2">
          <button 
            className="btn btn-primary d-flex align-items-center justify-content-center gap-2" 
            onClick={() => setInteractionMode(prev => prev === 'rotate' ? 'move' : 'rotate')}
          >
            {interactionMode === 'move' ? '✥ Modo Mover Ativo' : '↻ Modo Girar Ativo'}
          </button>
          
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary flex-grow-1" onClick={() => handleManualRotation('y', -1)}>↺</button>
            <button className="btn btn-outline-secondary flex-grow-1" onClick={() => handleManualRotation('y', 1)}>↻</button>
            <button className="btn btn-dark" onClick={toggleCamera}>
              {facingMode === 'environment' ? 'Inverter Câmera 🤳' : 'Câmera Traseira 📷'}
            </button>
          </div>
        </div>

        {/* Seletor de Modelos em Tempo de Execução */}
        <div className="mt-3">
          <label className="small fw-bold text-muted mb-1 d-block">Trocar Objeto:</label>
          <div className="d-flex gap-1 overflow-auto pb-1">
            <button className={`btn btn-sm ${character.modelType === 'box' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCharacter(prev => ({...prev, modelType: 'box'}))}>Cubo</button>
            <button className={`btn btn-sm ${character.modelType === 'sphere' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCharacter(prev => ({...prev, modelType: 'sphere'}))}>Esfera</button>
            <button className={`btn btn-sm ${character.modelType === 'cylinder' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCharacter(prev => ({...prev, modelType: 'cylinder'}))}>Cilindro</button>
            <button className={`btn btn-sm ${character.modelType === 'cone' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCharacter(prev => ({...prev, modelType: 'cone'}))}>Cone</button>
            <button className={`btn btn-sm ${character.modelType === 'pyramid' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCharacter(prev => ({...prev, modelType: 'pyramid'}))}>Pirâmide</button>
            <button className={`btn btn-sm ${character.modelType === 'torus' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCharacter(prev => ({...prev, modelType: 'torus'}))}>Torus</button>
            {searchParams.get('modelUrl') && (
              <button className={`btn btn-sm ${character.modelType === 'custom' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setCharacter(prev => ({...prev, modelType: 'custom'}))}>
                Original 3D
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArViewer;

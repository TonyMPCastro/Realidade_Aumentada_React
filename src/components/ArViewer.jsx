import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const ArViewer = () => {
  const [searchParams] = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  
  // Detecta se é mobile na montagem
  useEffect(() => {
    const checkMobile = () => {
      const isM = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                  || (window.innerWidth <= 768);
      setIsMobile(isM);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Inicializa o estado JÁ com os dados da URL para garantir que a posição inicial seja respeitada desde o primeiro frame
  const [character, setCharacter] = useState(() => {
    const name = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')) : null;
    const description = searchParams.get('description') ? decodeURIComponent(searchParams.get('description')) : null;
    const modelType = searchParams.get('modelType') ? decodeURIComponent(searchParams.get('modelType')) : null;
    const modelUrlParam = searchParams.get('modelUrl') ? decodeURIComponent(searchParams.get('modelUrl')) : null;
    const position = searchParams.get('position') ? decodeURIComponent(searchParams.get('position')) : null;
    const rotation = searchParams.get('rotation') ? decodeURIComponent(searchParams.get('rotation')) : null;
    const scale = searchParams.get('scale') ? decodeURIComponent(searchParams.get('scale')) : null;

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
  const textEntityRef = useRef(null);
  const [dialogues, setDialogues] = useState([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [facingMode, setFacingMode] = useState('environment');

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Atualiza o atributo canvas-text quando character.name muda
  useEffect(() => {
    if (textEntityRef.current && character.name) {
      const attrValue = `text: ${character.name}; color: #ffffff; fontSize: 64`;
      textEntityRef.current.setAttribute('canvas-text', attrValue);
    }
  }, [character.name]);

  // Limpeza do AR.js ao sair da tela (Desmontar componente)
  useEffect(() => {
    // Previne que o AR.js/A-Frame altere o layout global de forma destrutiva no mobile
    const preventHijack = () => {
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('position', 'fixed', 'important');
      document.body.style.setProperty('top', '0', 'important');
      document.body.style.setProperty('left', '0', 'important');
      document.body.style.setProperty('margin', '0', 'important');
      document.body.style.setProperty('width', '100%', 'important');
      document.body.style.setProperty('height', '100%', 'important');
    };
    preventHijack();

    return () => {
      // Remove elementos de vídeo injetados pelo AR.js no body
      const videos = document.querySelectorAll('video');
      videos.forEach(v => {
        if (v.srcObject) {
          v.srcObject.getTracks().forEach(track => track.stop());
        }
        v.remove();
      });
      
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('margin');
      document.body.style.removeProperty('width');
      document.body.style.removeProperty('height');
    };
  }, []);

  // Fix para o problema de "Zoom" e "Grande Angular" em smartphones
  useEffect(() => {
    const fixARVideo = () => {
      const video = document.querySelector('#arjs-video');
      const canvas = document.querySelector('.a-canvas');
      const container = document.querySelector('#camera-frame');
      
      if (container) {
        const rect = container.getBoundingClientRect();
        
        if (video) {
          video.style.setProperty('width', `${rect.width}px`, 'important');
          video.style.setProperty('height', `${rect.height}px`, 'important');
          video.style.setProperty('position', 'fixed', 'important');
          video.style.setProperty('top', `${rect.top}px`, 'important');
          video.style.setProperty('left', `${rect.left}px`, 'important');
          video.style.setProperty('object-fit', 'cover', 'important');
          video.style.setProperty('margin-left', '0px', 'important');
          video.style.setProperty('margin-top', '0px', 'important');
          video.style.zIndex = '0';
        }

        if (canvas) {
          canvas.style.setProperty('width', `${rect.width}px`, 'important');
          canvas.style.setProperty('height', `${rect.height}px`, 'important');
        }
      }
    };

    // Monitora a inserção do vídeo pelo AR.js no DOM
    const observer = new MutationObserver(fixARVideo);
    observer.observe(document.body, { childList: true });
    
    const interval = setInterval(fixARVideo, 500); // Reforço periódico mais frequente

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Registra o componente A-Frame dentro do useEffect para garantir que AFRAME esteja carregado
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AFRAME) {
      // Componente customizado para renderizar texto com canvas (suporta UTF-8 e acentos)
      if (!window.AFRAME.components['canvas-text']) {
        window.AFRAME.registerComponent('canvas-text', {
          schema: {
            text: { type: 'string', default: '' },
            fontSize: { type: 'number', default: 64 },
            color: { type: 'string', default: '#ffffff' }
          },
          init: function () {
            this.createTextMesh();
          },
          update: function () {
            // Remove mesh anterior se existir
            if (this.mesh) {
              this.el.object3D.remove(this.mesh);
            }
            this.createTextMesh();
          },
          createTextMesh: function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const fontSize = this.data.fontSize;
            
            canvas.width = 1024;
            canvas.height = 256;
            
            // Fundo transparente
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Configurar fonte com suporte a UTF-8
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = this.data.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Renderizar texto
            ctx.fillText(this.data.text, canvas.width / 2, canvas.height / 2);
            
            // Criar textura - acessa THREE via AFRAME
            const THREE = window.AFRAME.THREE;
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            
            // Criar material
            const material = new THREE.MeshBasicMaterial({ 
              map: texture, 
              transparent: true,
              side: THREE.DoubleSide
            });
            
            // Criar mesh
            const geometry = new THREE.PlaneGeometry(4, 1);
            this.mesh = new THREE.Mesh(geometry, material);
            this.el.setObject3D('mesh', this.mesh);
          }
        });
      }

      // Componente para o texto seguir a câmera
      if (!window.AFRAME.components['follow-camera']) {
        window.AFRAME.registerComponent('follow-camera', {
          tick: function () {
            const camera = this.el.sceneEl.camera;
            if (camera) {
              // Pega a posição da câmera
              const cameraPos = camera.position;
              const textPos = this.el.object3D.position;
              
              // Faz o texto olhar para a câmera (billboard effect)
              this.el.object3D.lookAt(cameraPos);
            }
          }
        });
      }

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
  // Posiciona abaixo do objeto
  const getTextPosition = () => {
    const pos = character.position ? character.position.split(' ').map(Number) : [0, 0, 0];
    const scale = character.scale ? character.scale.split(' ').map(Number) : [1, 1, 1];
    
    const objX = pos[0] || 0;
    const objY = pos[1] || 0;
    const objZ = pos[2] || 0;
    const scaleY = scale[1] || 1;

    // Posiciona abaixo: Posição Y do objeto - Metade da sua Altura (Escala) - Margem fixa (0.8)
    return `${objX} ${objY - (scaleY / 2) - 0.8} ${objZ}`;
  };

  return (
    <div className="d-flex flex-column align-items-center" style={{ height: '100dvh', width: '100vw', backgroundColor: 'transparent', overflow: 'hidden' }}>
      <style>
        {`
          .a-canvas {
            width: 100% !important;
            height: 100% !important;
            top: 0 !important;
            left: 0 !important;
          }
          #arjs-video {
            transition: none !important;
          }
          .a-enter-vr { display: none; }
          
          /* Mobile optimizations - Fullscreen camera */
          @media (max-width: 768px) {
            #camera-frame {
              flex: 0 0 100% !important;
              height: 100dvh !important;
            }
            .ar-panel {
              display: none !important;
            }
            .ar-model-selector {
              display: none !important;
            }
          }
          
          /* Desktop layout - Keep original behavior */
          @media (min-width: 769px) {
            #camera-frame {
              flex: 1;
            }
            .ar-panel {
              padding: 0.5rem !important;
              max-height: 140px !important;
              flex: 0 0 140px !important;
            }
            .ar-panel h2 {
              font-size: 0.9rem !important;
              margin-bottom: 0.5rem !important;
            }
            .ar-panel .d-grid {
              gap: 0.25rem !important;
            }
            .ar-panel .btn {
              font-size: 0.75rem !important;
              padding: 0.25rem 0.5rem !important;
            }
          }
        `}
      </style>
      
      {/* Quadro da Câmera (Topo) */}
      <div id="camera-frame" style={{ width: '100%', flex: '1', position: 'relative', overflow: 'hidden', backgroundColor: 'transparent', touchAction: 'none' }}>
        <a-scene 
          key={facingMode}
          embedded 
          arjs={`sourceType: webcam; debugUIEnabled: false; detectionMode: mono; facingMode: ${facingMode};`} 
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

            {/* Texto flutuante acima do objeto - Segue a câmera com suporte a UTF-8 */}
            <a-entity 
              ref={textEntityRef}
              position={getTextPosition()} 
              follow-camera="true" 
            ></a-entity>
          </a-marker>
          <a-entity camera="near: 0.01; far: 1000;"></a-entity>
        </a-scene>

        {/* Badge de Status flutuando no quadro da câmera */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
          <div style={{
            padding: '8px 12px',
            borderRadius: '20px',
            backgroundColor: markerFound ? '#10b981' : '#fbbf24',
            color: markerFound ? '#ffffff' : '#000000',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            animation: markerFound ? 'pulse 2s infinite' : 'none'
          }}>
            <span>{markerFound ? '✓' : '○'}</span>
            <span>{markerFound ? 'Marcador Detectado' : 'Procurando marcador...'}</span>
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.05); }
            }
          `}</style>
        </div>
      </div>

      {/* Painel de Ações (Fixo ao Centro Embaixo) - Apenas em Desktop */}
      {!isMobile && (
      <div
        className="bg-white p-3 shadow-lg ar-panel" 
        style={{ 
          position: 'fixed',
          bottom: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '35vh', 
          borderRadius: '20px 20px 0 0', 
          zIndex: 20,
          boxSizing: 'border-box',
          overflowY: 'auto'
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
        <div className="mt-3 ar-model-selector">
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
      )}
    </div>
  );
};

export default ArViewer;

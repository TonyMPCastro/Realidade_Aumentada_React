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
        position: position || '0 0.5 0',
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
  const markerRef = useRef(null);
  const customModelRef = useRef(null);
  const modelContainerRef = useRef(null);
  const [dialogues, setDialogues] = useState([]);
  const [currentLine, setCurrentLine] = useState(0);

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

  // Registra o componente A-Frame dentro do useEffect para garantir que AFRAME esteja carregado
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AFRAME) {
      if (!window.AFRAME.components['mouse-manipulation']) {
        window.AFRAME.registerComponent('mouse-manipulation', {
          schema: { speed: { default: 5 } }, // Aumentei a velocidade
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
            this.ifMouseDown = true;
            this.x_cord = evt.clientX;
            this.y_cord = evt.clientY;
          },
          onMouseUp: function () {
            this.ifMouseDown = false;
          },
          onMouseMove: function (evt) {
            if (this.ifMouseDown) {
              // evt.preventDefault(); // Removido para permitir interação com UI se necessário
              var temp_x = evt.clientX - this.x_cord;
              var temp_y = evt.clientY - this.y_cord;
              this.el.object3D.rotation.y += temp_x * this.data.speed / 1000;
              this.el.object3D.rotation.x += temp_y * this.data.speed / 1000;
              this.x_cord = evt.clientX;
              this.y_cord = evt.clientY;
            }
          },
          onTouchStart: function (evt) {
            this.ifMouseDown = true;
            this.x_cord = evt.touches[0].clientX;
            this.y_cord = evt.touches[0].clientY;
          },
          onTouchEnd: function () {
            this.ifMouseDown = false;
          },
          onTouchMove: function (evt) {
            if (this.ifMouseDown) {
              evt.preventDefault(); // Importante para não rolar a tela
              var temp_x = evt.touches[0].clientX - this.x_cord;
              var temp_y = evt.touches[0].clientY - this.y_cord;
              this.el.object3D.rotation.y += temp_x * this.data.speed / 1000;
              this.el.object3D.rotation.x += temp_y * this.data.speed / 1000;
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
    const objZ = pos[2] || 0;
    const scaleX = scale[0] || 1;

    // Posiciona à direita: Posição X do objeto + Metade da sua Largura (Escala) + Margem fixa (1.2)
    return `${objX + (scaleX / 2) + 1.2} 0 ${objZ}`;
  };

  return (
    <div style={{ margin: 0, overflow: 'hidden', height: '100vh', width: '100vw' }}>
      
      {/* Interface Overlay (UI sobreposta ao AR) */}
      <div style={{
        position: 'absolute', 
        bottom: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        width: '90%', 
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h3 className="h5">{character.name}</h3>
        
        {/* Área de Diálogo Sequencial */}
        <div className="dialogue-box mb-3" style={{ minHeight: '50px' }}>          
          {/* Controles de Navegação da História */}
          {dialogues.length > 1 && (
            <div className="d-flex justify-content-center gap-2 align-items-center mt-2">
              <button 
                className="btn btn-sm btn-outline-secondary" 
                disabled={currentLine === 0}
                onClick={() => setCurrentLine(prev => prev - 1)}
              >
                ⬅️ Anterior
              </button>
              <span className="badge bg-secondary">{currentLine + 1} / {dialogues.length}</span>
              <button 
                className="btn btn-sm btn-primary" 
                disabled={currentLine === dialogues.length - 1}
                onClick={() => setCurrentLine(prev => prev + 1)}
              >
                Próximo ➡️
              </button>
            </div>
          )}
        </div>

        {/* Botões de Rotação Manual */}
        <div className="d-flex flex-column gap-2 mb-3">
          <div className="d-flex justify-content-center gap-2">
            <button className="btn btn-sm btn-light border" onClick={() => handleManualRotation('x', -1)}>⬆️ Cima</button>
            <button className="btn btn-sm btn-light border" onClick={() => handleManualRotation('x', 1)}>⬇️ Baixo</button>
          </div>
          <div className="d-flex justify-content-center gap-2">
            <button className="btn btn-sm btn-light border" onClick={() => handleManualRotation('y', -1)}>↺ Esq.</button>
            <button className="btn btn-sm btn-light border" onClick={() => handleManualRotation('y', 1)}>Dir. ↻</button>
          </div>
        </div>
        
        {/* Feedback visual dinâmico sobre o rastreamento do marcador */}
        <div style={{ 
          display: 'inline-block',
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          fontWeight: '600',
          backgroundColor: markerFound ? '#d1e7dd' : '#fff3cd',
          color: markerFound ? '#0f5132' : '#664d03',
          border: markerFound ? '1px solid #badbcc' : '1px solid #ffecb5'
        }}>
          {markerFound ? '✅ Marcador Hiro Detectado!' : '🔍 Procurando Marcador Hiro...'}
        </div>
      </div>

      {/* Cena A-Frame AR */}
      {/* 
          IMPORTANTE: 
          - arjs="sourceType: webcam;": Ativa a webcam.
          - vr-mode-ui="enabled: false": Remove o botão VR que atrapalha em AR.
          - renderer="logarithmicDepthBuffer: true;": Melhora a renderização de modelos 3D sobrepostos.
      */}
      <a-scene 
        embedded 
        arjs="sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;" 
        renderer="logarithmicDepthBuffer: true; alpha: true;" 
        vr-mode-ui="enabled: false"
        id="scene"
      >
        
        {/* Luzes: Essenciais para modelos GLB externos aparecerem corretamente */}
        <a-light type="ambient" color="#ffffff" intensity="1"></a-light>
        <a-light type="directional" color="#ffffff" intensity="1.5" position="1 1 1"></a-light>
        
        {/* Marcador Hiro */}
        <a-marker preset="hiro" ref={markerRef}>
          {/* 
             Aplicamos a posição, rotação e escala definidas no CreatorPanel aqui.
             O mouse-manipulation permitirá girar a partir dessa rotação inicial.
          */}
          <a-entity 
            id="model-container" 
            ref={modelContainerRef} 
            mouse-manipulation
            position={character.position}
            rotation={character.rotation}
            scale={character.scale}
          >
            
          {/* Renderização condicional do modelo baseada na escolha do professor */}
          {character.modelType === 'box' && (
            <a-box material="color: blue; opacity: 0.8"></a-box>
          )}
          {character.modelType === 'sphere' && (
            <a-sphere radius="0.5" material="color: red; opacity: 0.8"></a-sphere>
          )}
          {character.modelType === 'cylinder' && (
            <a-cylinder radius="0.5" height="1.5" color="#FFC65D"></a-cylinder>
          )}
          {character.modelType === 'cone' && (
            <a-cone radius-bottom="0.5" radius-top="0" height="1.5" color="green"></a-cone>
          )}
          {character.modelType === 'torus' && (
            <a-torus radius="0.5" radius-tubular="0.1" color="purple"></a-torus>
          )}
          
          {/* Modelo Customizado (.glb) */}
          {character.modelType === 'custom' && (
            <a-entity 
              ref={customModelRef}
              gltf-model={character.modelUrl} 
            ></a-entity>
          )}
          </a-entity>

          {/* Card de Descrição Estilizado (Tipo RPG/Pokemon) */}
          <a-entity position={getTextPosition()} rotation="-90 0 0">
             {/* Fundo Traseiro (borda) */}
           
            {/* Título */}
            <a-text  material="shader: flat" 
              value={character.name} width="8.7"
              align="center" color="#ecf0f1" 
              position="0 0.5 0.1" scale="0.75 0.75 0.75"
            ></a-text>
            
            {/* Texto Descritivo (Menor e Alinhado à Esquerda) */}
            <a-text  material="shader: flat" 
              value={dialogues[currentLine] || ''} 
              align="left" anchor="left" color="#ecf0f1" 
              position="-0.85 0.25 0.1" scale="0.6 0.6 0.6"
              width="4.7" wrap-count="40" baseline="top"
            ></a-text>
            

        </a-entity>

        </a-marker>

        <a-entity camera></a-entity>
      </a-scene>
    </div>
  );
};

export default ArViewer;

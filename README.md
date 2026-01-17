# Sistema de Gerenciamento e Visualização de Realidade Aumentada (AR)

- Este projeto consiste em uma plataforma web desenvolvida para facilitar a criação, o gerenciamento e a visualização de conteúdos em Realidade Aumentada baseada em marcadores.
- A aplicação foi desenvolvida com foco em aplicações educacionais, permitindo que instrutores criem atividades educacionais interativas associadas a modelos 3D sem a necessidade de conhecimentos avançados em programação.

## 1. Visão Geral

A solução é dividida em dois módulos principais:
*   **Painel do Criador**:
    - Interface administrativa (CRUD) simples e intuitiva
    - Define parâmetros como nome do material ou objeto educaional, descrição, narrativa histórica
    - Tipo de modelo 3D (primitivos ou arquivos `.glb` customizados)
    - Ajustes finos de escala, rotação e posição
      
*   **Visualizador AR**:
    - Ambiente de execução que utiliza a API de câmera do navegador para rastrear o marcador "Hiro"
    - Renderizar o conteúdo configurado em tempo real

## 2. Arquitetura e Tecnologias

A stack tecnológica foi selecionada visando portabilidade e baixo overhead de execução:

*   **Frontend**: React.js (Biblioteca base para interface e estado).
*   **Renderização 3D**: A-Frame (Framework WebVR baseado em Entity-Component System).
*   **Rastreamento de AR**: AR.js (Implementação de visão computacional para rastreamento de marcadores).
*   **Estilização**: Bootstrap 5 (Layout responsivo).
*   **Persistência**: LocalStorage e integração com File System Access API para manipulação de arquivos JSON locais.

## 3. Funcionalidades Implementadas

*   **Editor de Cenas**: Preview em tempo real do objeto 3D antes da publicação.
*   **Suporte a Modelos Customizados**: Carregamento dinâmico de arquivos GLTF/GLB.
*   **Interatividade**: Manipulação do objeto via mouse ou touch (rotação e inclinação).
*   **Distribuição**: Geração automática de QR Codes contendo os parâmetros da experiência via URL Query Strings.
*   **Sincronização de Dados**: Capacidade de vincular um arquivo `ar_database.json` local para persistência persistente fora do cache do navegador.

## 4. Procedimentos de Execução

### Pré-requisitos
*   Node.js (versão 18 ou superior)
*   NPM ou Yarn

### Instalação
1. Clone o repositório para sua máquina local.
2. No diretório raiz, instale as dependências necessárias:
```bash
npm install
```

### Desenvolvimento
Para iniciar o servidor de desenvolvimento com Hot Module Replacement (HMR):
```bash
npm run dev
```
O sistema estará acessível em `http://localhost:5173`.

### Produção
Para gerar o build otimizado para deploy:
```bash
npm run build
```

## 5. Utilização

1.  Acesse o **Painel do Criador**.
2.  Configure uma nova experiência (ex: Personagem Histórico).
3.  Clique em "Salvar & Gerar".
4.  Utilize o QR Code gerado para abrir a URL no dispositivo móvel.
5.  Aponte a câmera para um marcador **Hiro** impresso ou digital para visualizar a experiência.

## 6. Tutorial
1. Acessar home localhost
   - Executar aquivo .json 
3. Pagina inicial:
   - Cadastar imagens no sistema
   - Imgens 3d em arquivo .glb
   - Inseri descrição da imagem
   - Escolher modelo (URL ou arquivo)
   - Previsualização do objeto e ajustes báicos (tamnho, posição e inclinação) 
   - Salvar e atualizar
    
4. Visualização
   - Abrir link de visualização
   - Posicionar câmera e rasrear o marcador "Hiro"
   - Objetivo será projetado sobre área do marcador
   - Movimentar objeto com a própria câmera ou mouse
     
5. Sair do sitema

---
*Trabalho desenvolvido como parte do projeto de exploração de tecnologias imersivas com React.*

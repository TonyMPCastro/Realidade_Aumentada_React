# Estágio de Build
FROM node:20-alpine AS build

WORKDIR /app

# Instala as dependências primeiro (otimiza cache das camadas)
COPY package*.json ./
RUN npm install

# Copia o código e gera o build de produção
COPY . .
RUN npm run build

# Estágio de Produção (Nginx)
FROM nginx:stable-alpine

# Copia os arquivos estáticos do build
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração do Nginx otimizada para React/Vite e Easypanel
RUN printf "server {\n\
    listen 80;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    \n\
    # Suporte a SPA (React Router)\n\
    location / {\n\
        try_files \$uri \$uri/ /index.html;\n\
    }\n\
    \n\
    # Cache e MIME types para assets estáticos\n\
    # Se um arquivo .js ou .glb não existir, retorna 404 em vez de index.html\n\
    location ~* \.(?:js|css|png|jpg|jpeg|gif|ico|svg|glb|json|woff2?|ttf|otf)$ {\n\
        expires 6M;\n\
        access_log off;\n\
        add_header Cache-Control \"public\";\n\
        try_files \$uri =404;\n\
    }\n\
}\n" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
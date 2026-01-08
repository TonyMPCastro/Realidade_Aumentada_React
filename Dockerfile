# Estágio de Build
FROM node:20-alpine as build

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o código fonte e gera o build
COPY . .
RUN npm run build

# Estágio de Produção (Nginx)
FROM nginx:alpine

# Copia os arquivos estáticos gerados pelo Vite (pasta dist)
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração personalizada do Nginx para SPA (React Router)
# Isso redireciona qualquer rota desconhecida para o index.html
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

# Expõe a porta 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
FROM node:18-slim

# Instalar ferramentas para o SQLite
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Criar a pasta de dados se ela não existir (o volume será montado aqui)
RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "server.js"]

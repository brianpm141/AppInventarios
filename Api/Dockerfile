FROM node:24-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y curl default-mysql-client && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY Express/package*.json ./
RUN npm install --omit=dev

COPY Express ./Express
COPY scripts/wait-for-mysql-init.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/wait-for-mysql-init.sh

EXPOSE 3000

CMD ["sh", "-c", "/usr/local/bin/wait-for-mysql-init.sh node Express/scripts/initAdmin.js && node Express/index.js"]

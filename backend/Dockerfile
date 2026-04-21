FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads/documents

EXPOSE 3001

CMD ["npm", "run", "migrate:docker"]

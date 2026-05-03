FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV DATA_DYNA_RUNTIME_ENV=local \
    DATA_DYNA_HTTP_HOST=0.0.0.0 \
    DATA_DYNA_HTTP_PORT=3000

EXPOSE 3000

CMD ["npm", "run", "app:start"]

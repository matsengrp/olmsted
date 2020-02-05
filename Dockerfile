FROM node:10

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3999
CMD ["npm", "start", "localData"]

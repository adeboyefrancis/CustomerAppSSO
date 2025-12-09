ARG node_version=18-alpine
FROM node:${node_version}
LABEL maintainer="Francis Adeboye"
WORKDIR /customerportalsso
COPY package*.json ./
RUN npm install \
    npm install express express-session ejs @azure/msal-node dotenv
COPY . . 
EXPOSE 3000
CMD ["npm", "start"]
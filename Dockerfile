FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

EXPOSE 6970
EXPOSE 6969

ENV SSE_PORT=6971
ENV HTTP_PORT=8080
ENV SSE_HOST=10.6.0.102

CMD [ "npm", "start" ]
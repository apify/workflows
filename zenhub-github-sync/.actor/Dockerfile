FROM apify/actor-node:24

# TODO: install git in base image

RUN apk add git

COPY . .

ENV YARN_NODE_LINKER=node-modules

RUN npx -y corepack use yarn@latest

CMD ["node", "--run", "actor"]

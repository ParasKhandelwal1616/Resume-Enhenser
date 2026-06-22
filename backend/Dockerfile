FROM node:20-slim

# Install TeX Live (minimal + extras needed for most resume templates)
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p uploads output

EXPOSE 3000

CMD ["node", "src/index.js"]

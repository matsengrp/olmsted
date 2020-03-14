FROM continuumio/miniconda2:4.5.12

RUN conda install --quiet --yes python=2.7 --file requirements.txt --channel conda-forge && conda clean --all -f -y

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - && apt-get install -y nodejs

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3999
CMD ["npm", "start", "localData"]

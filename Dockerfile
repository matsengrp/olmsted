FROM continuumio/miniconda3:4.7.12
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - && apt-get install -y nodejs
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

COPY . .

RUN conda install --quiet --yes --file requirements.txt --channel conda-forge && conda clean --all -f -y
RUN pip install ntpl

EXPOSE 3999
CMD ["npm", "start", "localData"]

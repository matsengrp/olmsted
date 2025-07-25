FROM condaforge/miniforge3:23.3.1-1

# Set timezone to avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  curl \
  pkg-config \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  python3-dev \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js 18 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install npm dependencies (temporarily using npm install for breaking change tests)
RUN npm install --legacy-peer-deps --ignore-scripts

# Copy the rest of the application
COPY . .

# Install Python packages first (needed by postinstall script)
RUN pip install --no-cache-dir -r requirements.txt

# Run postinstall script after all dependencies are ready
RUN npm run postinstall

EXPOSE 3999
CMD ["npm", "start", "localData"]

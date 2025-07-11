FROM continuumio/miniconda3:23.5.2-0

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

# Install Node.js 12 (compatible with the project's package-lock.json)
RUN curl -fsSL https://deb.nodesource.com/setup_12.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install npm dependencies with legacy peer deps flag to handle old packages
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Install Python packages
RUN pip install --no-cache-dir -r requirements_py3.txt

EXPOSE 3999
CMD ["npm", "start", "localData"]
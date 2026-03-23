FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 5001

CMD ["flask", "run", "--host=0.0.0.0", "--port=5001"]

# FROM python:3.13-slim

# WORKDIR /app

# COPY requirements.txt .

# RUN pip install --no-cache-dir -r requirements.txt

# COPY . .

# EXPOSE 5001

# RUN useradd app

# USER app

# CMD ["flask", "run", "--host=0.0.0.0", "--port=5001", "--no-debugger"]

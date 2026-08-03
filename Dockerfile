# Use a specific, slim version of Python for reproducibility
FROM python:3.10-slim

# opencv-python-headless still dynamically links against these at runtime;
# without them `import cv2` fails with "libGL.so.1: cannot open shared object file".
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file first to take advantage of Docker's caching
COPY huggingface-space/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the application source code and the model into the container
COPY huggingface-space/ .
COPY best_densenet121.keras .

# Run as a non-root user rather than the container default root.
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

ENV PYTHONUNBUFFERED=1

# Expose the port the app runs on
EXPOSE 7860

# Define the command to run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]

# Service-C: Python 3.11 + aiokafka runtime image
FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY services/service-c/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/service-c/src ./src
CMD ["python", "-m", "src.main"]

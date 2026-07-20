FROM python:3.11-slim

WORKDIR /app

COPY shared/requirements.txt ./shared-requirements.txt
COPY ml-inference-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r shared-requirements.txt -r requirements.txt

COPY shared ./shared
COPY ml-inference-service/*.py .

EXPOSE 8003

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]

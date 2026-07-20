FROM python:3.11-slim

WORKDIR /app

COPY shared/requirements.txt ./shared-requirements.txt
COPY tag-catalog-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r shared-requirements.txt -r requirements.txt

COPY shared ./shared
COPY tag-catalog-service/*.py .

EXPOSE 8007

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8007"]

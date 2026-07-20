FROM python:3.11-slim

WORKDIR /app

COPY shared/requirements.txt ./shared-requirements.txt
COPY alert-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r shared-requirements.txt -r requirements.txt

COPY shared ./shared
COPY alert-service/*.py .

EXPOSE 8004

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]

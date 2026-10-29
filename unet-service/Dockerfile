# Reuses the already-built DenseNet image: its pip packages (tensorflow-cpu,
# fastapi, opencv, ...) are identical to this service's requirements.txt, so
# nothing has to be downloaded again.
# Build the DenseNet image first:  docker build -t primary-model .
FROM primary-model:latest

WORKDIR /unet

COPY --chown=appuser:appuser app.py .
COPY --chown=appuser:appuser best_lung_nodule_unet.keras .

ENV PYTHONUNBUFFERED=1
EXPOSE 8001

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]

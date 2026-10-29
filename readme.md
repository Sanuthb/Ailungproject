#AI LUNG 

docker build -t primary-model .
docker run -d -p 7860:7860 --name primary-model primary-model
docker build -t second-model unet-service
docker run -d -p 8001:8001 --name second-model second-model

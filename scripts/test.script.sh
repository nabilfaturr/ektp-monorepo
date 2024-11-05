# test the image upload function on local
curl -X POST -F "file=@./ktp-sample-image/1.jpg" https://localhost:8080/uploadImage

# test the image upload function on cloud (adjust the function url)
FUNCTION_URL=https://asia-southeast2-eco-avenue-437311-k9.cloudfunctions.net/uploadImageDev
curl -X POST -F "file=@./sample-images/1.jpeg" $FUNCTION_URL

# get image from bucket (adjust the bucket name and filename)
BUCKET_NAME="ektp-bucket-demo" 
FILE_ID="1730827334319-0cz0mepxdzjg" 
FILE_PATH="gs://${BUCKET_NAME}/json/${FILE_ID}-extracted-text.json" 
gsutil cat $FILE_PATH
gsutil cat $FILE_PATH | jq
    
# show list project
gcloud projects list

# show current project
gcloud config get-value project

# set project
PROJECT_ID=ektp-extraction
gcloud config set project $PROJECT_ID


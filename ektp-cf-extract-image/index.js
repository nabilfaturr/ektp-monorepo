import { cloudEvent } from "@google-cloud/functions-framework";
import { Storage } from "@google-cloud/storage";
import vision from "@google-cloud/vision";

const visionClient = new vision.ImageAnnotatorClient();
const storageClient = new Storage();

const BUCKET_NAME = "ektp-bucket-demo";

function cleanData(text) {
  const lines = text.split("\n");
  const res = [];

  for (const line of lines) {
    const cleanedLine = line
      .replace(
        /gol\. darah|nik|kewarganegaraan|nama|status perkawinan|berlaku hingga|alamat|agama|tempat\/tgl lahir|jenis kelamin|gol darah|rt\/rw|kel|desa|kecamatan/gi,
        ""
      )
      .replace(":", "")
      .trim();

    if (cleanedLine !== "" && cleanedLine !== "/" && cleanedLine !== " ") {
      res.push(cleanedLine);
    }
  }
  return {
    province: res[0],
    city: res[1],
    id: res[2],
    name: res[3],
    birthdate: res[4],
    gender: res[5],
    address: {
      street: res[7],
      rt_rw: res[8],
      kelurahan: res[9],
      kecamatan: res[10],
    },
    occupation: res[12],
  };
}

export const detectText = async (bucketName, filename) => {
  console.log(`Looking for text in image ${filename}`);
  const [textDetections] = await visionClient.textDetection(
    `gs://${bucketName}/${filename}`
  );
  const [annotation] = textDetections.textAnnotations ?? [];
  return annotation;
};

cloudEvent("extractImage", async (event) => {
  try {
    const { bucket, name } = event.data;

    if (!bucket) {
      throw new Error("Bucket not provided");
    }

    if (!name) {
      throw new Error("Filename not provided");
    }

    const detectedText = await detectText(bucket, name);
    const cleanedText = cleanData(detectedText?.description ?? "");

    const cleanedName = name.split(".")[0].split("images/")[1];
    const destination = `json/${cleanedName}-extracted-text.json`;

    const file = JSON.stringify(cleanedText);

    await storageClient.bucket(BUCKET_NAME).file(destination).save(file, {
      contentType: "application/json",
    });

    console.log(`File uploaded to gs://${BUCKET_NAME}/${destination}`);
    console.log(`File ${name} processed`);
  } catch (error) {
    console.error(error);
  }
});

import cf from "@google-cloud/functions-framework";
import os from "os";
import fs from "fs";
import path from "path";
import busboy from "busboy";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const BUCKET_NAME = "ektp-bucket-demo";

export const generateImageId = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
};

cf.http("uploadImage", (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const bb = busboy({ headers: req.headers });
    const tmpDir = os.tmpdir();
    const fields = {};
    const uploads = {};

    bb.on("field", (fieldname, val) => {
      fields[fieldname] = val;
    });

    bb.on("file", (fieldname, file, info) => {
      const { filename } = info;

      console.log(`Processing file: ${filename}`);
      const filepath = path.join(tmpDir, filename);
      uploads[fieldname] = filepath;
      file.pipe(fs.createWriteStream(filepath));
    });

    bb.on("error", (error) => {
      console.error("Busboy error:", error);
      res.status(500).send("Processing error");
    });

    bb.on("finish", () => {
      const imageId = generateImageId();
      const file = uploads["file"];

      if (!file) {
        console.error("No image file provided");
        res.status(400).send("No image file provided");
        return;
      }

      const fileExtensionArr = file.split(".");
      const fileExtension = fileExtensionArr[fileExtensionArr.length - 1];
      const destination = `images/${imageId}.${fileExtension}`;

      const options = {
        destination,
        metadata: {
          contentType: "image/jpeg",
        },
      };

      storage
        .bucket(BUCKET_NAME)
        .upload(file, options)
        .then(() => {
          console.log(`${file} uploaded to gs://${BUCKET_NAME}/${destination}`);
          fs.unlinkSync(file);
          const data = {
            operation_id: imageId,
            path: `gs://${BUCKET_NAME}/${destination}`,
          };
          res.status(200).json(data);
        })
        .catch((err) => {
          console.error("Upload error:", err);
          res.status(500).json({
            error: "Upload failed",
            message: err.message,
          });
        });
    });

    bb.end(req.rawBody);
    req.pipe(bb);
  } catch (error) {
    console.error("General error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

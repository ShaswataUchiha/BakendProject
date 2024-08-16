import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloud = async (localFilePaath) => {
    try {
      if(!localFilePaath) return null;
      
      const response = await cloudinary.uploader.upload(localFilePaath, {
        resource_type : 'auto'
      })
      console.log("File is uploaded successfully", response.url)
      return response
    } catch (error) {
        fs.unlinkSync(localFilePaath) 
        // remove the locally saed temporray file as the upload oertaion ot failed
        console.log("Error while uploading to cloudinary", error); 
        return null;    
    }
}


export { uploadOnCloud }  // Exporting the function for use in other files.


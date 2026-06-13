import { NotFoundError } from "../../classes/errorClasses.js";
import * as mediaDb from "../media/media.db.js";
import * as trainingDb from "./trainingProgram.db.js";

export const uploadProgramMedia = async ({ trainingProgramId, file }) => {
  console.log("uploadProgramMedia called with:", { trainingProgramId, file });
  
  const program = await trainingDb.findTrainingProgramById(trainingProgramId);
  console.log("program found:", program);

  if (!program) throw new NotFoundError("Training program not found");

  const mediaCount = program.media?.length ?? 0;
  console.log("media count:", mediaCount);

  const result = await mediaDb.createMedia({
    trainingProgramId,
    url: file.url,
    publicId: file.publicId,
    mimeType: file.mimeType,
    bytes: file.bytes,
    isPrimary: mediaCount === 0,
  });
  
  console.log("media created:", result);
  return result;
};

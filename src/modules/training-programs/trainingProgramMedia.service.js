import { NotFoundError } from "../../classes/errorClasses.js";
import * as mediaDb from "../media/media.db.js";
import * as trainingDb from "./trainingProgram.db.js";

export const uploadProgramMedia = async ({ trainingProgramId, file }) => {
  const program = await trainingDb.findTrainingProgramById(trainingProgramId);

  if (!program) throw new NotFoundError("Training program not found");

  return mediaDb.createMedia({
    trainingProgramId,
    url: file.url,
    publicId: file.publicId,
    mimeType: file.mimeType,
    bytes: file.bytes,
    isPrimary: program.media.length === 0,
  });
};

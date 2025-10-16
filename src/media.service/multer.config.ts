import * as multer from 'multer';

const storage = multer.memoryStorage(); // Utilise la mémoire au lieu du disque

export const multerOptions = {
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedVideoTypes = /mp4|mov|avi/;
    const allowedImageTypes = /jpeg|jpg|png/;
    const isVideo = allowedVideoTypes.test(file.mimetype);
    const isImage = allowedImageTypes.test(file.mimetype);

    if ((file.fieldname === 'video' && isVideo) ||
        (file.fieldname === 'thumbnail' && isImage) ||
        (file.fieldname === 'avatar' && isImage)) {
      return cb(null, true);
    }
    cb(new Error('Formats acceptés : mp4/mov/avi pour vidéo, jpeg/jpg/png pour avatar ou miniature !'), false);
  },
  limits: {
    fileSize: 52428800, 
  },
}
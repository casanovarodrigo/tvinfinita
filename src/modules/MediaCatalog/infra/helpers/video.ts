// NEEDS to download ffmpeg from https://www.ffmpeg.org/download.html and add it to windows PATH
// https://www.youtube.com/watch?v=5xgegeBL0kw
import * as fs from 'fs'

const ffmpegPath = 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe'
const ffProbePath = 'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe'
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffProbePath)

const getAllVideoMetadata = async (filePath) => new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, function(err, metadata) {
        if (err){
            reject(err)
        } else {
            resolve(metadata)
        }
    })
})

export const getVideoMetadata = async (filePath) => {
    try {
        await fs.promises.access(filePath)
        const metadata: any = await getAllVideoMetadata(filePath)
        const videoMeta = metadata.streams.filter(stream => stream.codec_type === 'video')
        const formatMeta = metadata.format

        return {
            height: videoMeta[0].height,
            width: videoMeta[0].width,
            ratio: videoMeta[0].display_aspect_ratio,
            duration: formatMeta.duration,
            bitrate: formatMeta.bit_rate
        }
    } catch (error) {
        throw new Error('video file is missing or path is wrong')
    }

}
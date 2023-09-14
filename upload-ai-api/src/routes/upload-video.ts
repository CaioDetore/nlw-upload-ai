import { FastifyInstance } from "fastify"
import {fastifyMultipart} from "@fastify/multipart"
import { prisma } from "../lib/prisma"

import path from "node:path"
import { randomUUID } from "node:crypto"
import { promisify } from "node:util"
import { pipeline } from "node:stream"
import fs from "node:fs"

// stream = forma de receber e ler dados

const pump = promisify(pipeline)

export async function uploadVideoRoute (app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25mb
    }
  })

  app.post('/videos', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ error: 'Missing file input.' })
    }

    const extension = path.extname(data.filename)

    if (extension !== '.mp3') {
      return reply.status(400).send({ error: 'Invalid input type, please upload a MP3.' })
    }

    // retorna o nome do arquivo sem a extensão
    const fileBaseName = path.basename(data.filename, extension)
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
    
    // diranme = diretório até a pasta desse aqui
    const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)

    await pump(data.file, fs.createWriteStream(uploadDestination))

    const video = await prisma.video.create({
      data: {
        transcription: "",
        name: data.filename,
        path: uploadDestination,
      }
    })

    return video
  })
}


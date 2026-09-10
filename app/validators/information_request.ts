import vine from '@vinejs/vine'

export const createInformationRequestValidator = vine.create({
  fields: vine.array(vine.any()).maxLength(50),
  message: vine.string().trim().maxLength(5000).nullable().optional(),
  expiresAt: vine.string().trim().optional(),
})

export const submitInformationRequestValidator = vine.create({
  answers: vine.any(),
})

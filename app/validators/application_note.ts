import vine from '@vinejs/vine'

export const createApplicationNoteValidator = vine.create({
  content: vine.string().trim().minLength(1).maxLength(5000),
})

export const updateApplicationNoteValidator = vine.create({
  content: vine.string().trim().minLength(1).maxLength(5000),
})

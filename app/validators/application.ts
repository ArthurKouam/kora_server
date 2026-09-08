import vine from '@vinejs/vine'

export const updateApplicationStatusValidator = vine.create({
  status: vine.enum([
    'new',
    'screening',
    'shortlisted',
    'interview',
    'offer',
    'hired',
    'rejected',
    'withdrawn',
  ]),
  reason: vine.string().trim().nullable().optional(),
})

import vine from '@vinejs/vine'

/**
 * Validator for creating a new job
 */
export const createJobValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),

  slug: vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),

  description: vine.string().trim().minLength(1),

  requirements: vine.string().nullable(),
  responsibilities: vine.string().nullable(),
  benefits: vine.string().nullable(),

  location: vine.string().nullable(),
  city: vine.string().nullable(),
  country: vine.string().nullable(),

  employmentType: vine.enum([
    'full_time',
    'part_time',
    'contract',
    'internship',
    'freelance',
    'temporary',
  ]),

  workplaceType: vine.enum(['onsite', 'remote', 'hybrid']),

  experienceLevel: vine.string().trim().minLength(1),

  salaryMin: vine.number().min(0).nullable(),
  salaryMax: vine.number().min(0).nullable(),

  salaryCurrency: vine.string().trim().maxLength(3).nullable(),

  headcount: vine.number().min(1),

  status: vine.enum(['draft', 'published', 'paused', 'closed', 'archived']),

  closingDate: vine.date().nullable(),
})

/**
 * Validator for updating a job
 */
export const updateJobValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255).optional(),

  slug: vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),

  description: vine.string().trim().minLength(1).nullable().optional(),

  requirements: vine.string().nullable().optional(),
  responsibilities: vine.string().nullable().optional(),
  benefits: vine.string().nullable().optional(),

  location: vine.string().nullable().optional(),
  city: vine.string().nullable().optional(),
  country: vine.string().nullable().optional(),

  employmentType: vine
    .enum(['full_time', 'part_time', 'contract', 'internship', 'freelance', 'temporary'])
    .nullable()
    .optional(),

  workplaceType: vine.enum(['onsite', 'remote', 'hybrid']).nullable().optional(),

  experienceLevel: vine.string().trim().minLength(1).nullable().optional(),

  salaryMin: vine.number().min(0).nullable().optional(),

  salaryMax: vine.number().min(0).nullable().optional(),

  salaryCurrency: vine.string().trim().maxLength(3).nullable().optional(),

  headcount: vine.number().min(1).optional(),

  status: vine.enum(['draft', 'published', 'paused', 'closed', 'archived']).nullable().optional(),

  closingDate: vine.date().nullable().optional(),
})

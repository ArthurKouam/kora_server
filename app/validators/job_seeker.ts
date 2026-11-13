import vine from '@vinejs/vine'

const email = () => vine.string().trim().toLowerCase().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)
const httpUrl = () =>
  vine.string().trim().regex(/^https?:\/\/[^\s]+$/i).maxLength(500).nullable().optional()

/** Inscription au portail candidat. L'email est normalisé en minuscules. */
export const jobSeekerSignupValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(100),
  lastName: vine.string().trim().minLength(1).maxLength(100),
  email: email().unique({ table: 'job_seekers', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

export const jobSeekerLoginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

export const jobSeekerVerifyEmailValidator = vine.create({
  token: vine.string().trim().minLength(10).maxLength(512),
})

export const jobSeekerResendVerificationValidator = vine.create({
  email: email(),
})

/** Réponse identique que l'email existe ou non. */
export const jobSeekerForgotPasswordValidator = vine.create({
  email: email(),
})

export const jobSeekerResetPasswordValidator = vine.create({
  token: vine.string().trim().minLength(10).maxLength(512),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

export const jobSeekerUpdateProfileValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(100),
  lastName: vine.string().trim().minLength(1).maxLength(100),
  phone: vine.string().trim().maxLength(50).nullable().optional(),
  headline: vine.string().trim().maxLength(200).nullable().optional(),
  location: vine.string().trim().maxLength(255).nullable().optional(),
  city: vine.string().trim().maxLength(100).nullable().optional(),
  country: vine.string().trim().maxLength(100).nullable().optional(),
  dateOfBirth: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  bio: vine.string().trim().maxLength(5000).nullable().optional(),
  avatarUrl: httpUrl(),
  linkedinUrl: httpUrl(),
  githubUrl: httpUrl(),
  portfolioUrl: httpUrl(),
  websiteUrl: httpUrl(),
})

export const jobSeekerUpdatePasswordValidator = vine.create({
  currentPassword: vine.string(),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

export const jobSeekerExperienceValidator = vine.create({
  company: vine.string().trim().minLength(1).maxLength(255),
  position: vine.string().trim().minLength(1).maxLength(255),
  location: vine.string().trim().maxLength(255).nullable().optional(),
  description: vine.string().trim().maxLength(5000).nullable().optional(),
  startDate: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  endDate: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  isCurrent: vine.boolean().optional(),
})

export const jobSeekerEducationValidator = vine.create({
  institution: vine.string().trim().minLength(1).maxLength(255),
  degree: vine.string().trim().minLength(1).maxLength(255),
  fieldOfStudy: vine.string().trim().maxLength(255).nullable().optional(),
  location: vine.string().trim().maxLength(255).nullable().optional(),
  description: vine.string().trim().maxLength(5000).nullable().optional(),
  startDate: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  endDate: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
})

export const jobSeekerSkillsValidator = vine.create({
  skills: vine.array(
    vine.object({
      skillId: vine.string().uuid(),
      level: vine.string().trim().maxLength(50).nullable().optional(),
      yearsOfExperience: vine.number().min(0).max(60).nullable().optional(),
    })
  ),
})

export const jobSeekerJobIndexValidator = vine.create({
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(50).optional(),
  search: vine.string().trim().minLength(1).maxLength(100).optional(),
  employmentType: vine.any().optional(),
  workplaceType: vine.any().optional(),
  city: vine.string().trim().minLength(1).maxLength(100).optional(),
  country: vine.string().trim().minLength(1).maxLength(100).optional(),
})

/**
 * Candidature depuis le portail. Le CV peut être choisi parmi les documents du
 * compte ; les réponses dynamiques sont validées contre la version publiée du
 * formulaire, comme sur la page carrière.
 */
export const jobSeekerApplyValidator = vine.create({
  coverLetter: vine.string().trim().maxLength(5000).nullable().optional(),
  documentId: vine.string().uuid().nullable().optional(),
  answers: vine.any().optional(),
})

export const jobSeekerDocumentStoreValidator = vine.create({
  type: vine.enum(['cv', 'cover_letter', 'certificate', 'portfolio', 'other']).optional(),
  isDefault: vine.boolean().optional(),
})

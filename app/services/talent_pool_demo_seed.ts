import Application from '#models/application'
import Candidate from '#models/candidate'
import CandidateDocument from '#models/candidate_document'
import CandidateEducation from '#models/candidate_education'
import CandidateExperience from '#models/candidate_experience'
import CandidateSkill from '#models/candidate_skill'
import Job from '#models/job'
import Organization from '#models/organization'
import Plan from '#models/plan'
import Skill from '#models/skill'
import Tag from '#models/tag'
import TalentPoolEntry from '#models/talent_pool_entry'
import TalentPoolNote from '#models/talent_pool_note'
import TalentPoolTag from '#models/talent_pool_tag'
import User from '#models/user'
import { DateTime } from 'luxon'

const SLUG = 'demo-vivier'

interface DemoPerson {
  firstName: string
  lastName: string
  email: string
  city: string
  country: string
  bio: string
  skills: string[]
  tags: string[]
  source: 'application' | 'manual'
  cv: boolean
  notes: string[]
  position?: string
  company?: string
}

const PEOPLE: DemoPerson[] = [
  {
    firstName: 'Awa',
    lastName: 'Nkem',
    email: 'awa.nkem@example.test',
    city: 'Douala',
    country: 'Cameroun',
    bio: "Développeuse backend Go, 6 ans d'expérience sur des systèmes de paiement.",
    skills: ['Golang', 'PostgreSQL', 'Kubernetes'],
    tags: ['Backend', 'Go'],
    source: 'application',
    cv: true,
    notes: ['Très bon niveau technique, à privilégier pour du senior.', 'Revenu sur le marché au T3.'],
    position: 'Ingénieure backend',
    company: 'Mobile Money Corp',
  },
  {
    firstName: 'Ibrahim',
    lastName: 'Sow',
    email: 'ibrahim.sow@example.test',
    city: 'Dakar',
    country: 'Sénégal',
    bio: "DevOps, Terraform et Kubernetes. A migré l'infrastructure d'une fintech.",
    skills: ['Kubernetes', 'Terraform', 'AWS'],
    tags: ['DevOps'],
    source: 'application',
    cv: true,
    notes: ['Bonne culture DevOps, disponible immédiatement.'],
    position: 'Ingénieur DevOps',
    company: 'Fintech Sénégal',
  },
  {
    firstName: 'Fatou',
    lastName: 'Diallo',
    email: 'fatou.diallo@example.test',
    city: 'Bamako',
    country: 'Mali',
    bio: 'Chargée de recrutement, 5 ans en PME industrielle.',
    skills: ['Recrutement', 'Sourcing'],
    tags: ['RH'],
    source: 'application',
    cv: true,
    notes: ['Candidature spontanée, très bon relationnel candidat.'],
    position: 'Chargée de recrutement',
    company: 'Industries Mali',
  },
  {
    firstName: 'Serge',
    lastName: 'Nguyen',
    email: 'serge.nguyen@example.test',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    bio: 'Data analyst, SQL et Power BI. Dashboards de pilotage commercial.',
    skills: ['SQL', 'Power BI', 'Python'],
    tags: ['Data'],
    source: 'manual',
    cv: false,
    notes: ['Ajouté manuellement après un salon.'],
  },
  {
    firstName: 'Mariam',
    lastName: 'Traoré',
    email: 'mariam.traore@example.test',
    city: 'Bamako',
    country: 'Mali',
    bio: 'Comptable certifiée OHADA, 8 ans. Expertise sectors agricole et industriel.',
    skills: ['Comptabilité', 'OHADA'],
    tags: ['Comptabilité', 'Finance'],
    source: 'manual',
    cv: true,
    notes: ['Excellent CV, à garder pour un poste de contrôleur de gestion.'],
  },
  {
    firstName: 'Koffi',
    lastName: 'Adjo',
    email: 'koffi.adjo@example.test',
    city: 'Lomé',
    country: 'Togo',
    bio: 'Développeur frontend Vue/Nuxt, 4 ans. Interfaces pour le secteur public.',
    skills: ['Vue', 'TypeScript', 'Nuxt'],
    tags: ['Frontend'],
    source: 'application',
    cv: true,
    notes: ['Bon alignement sur notre stack.'],
    position: 'Développeur frontend',
    company: 'Agence Numérique',
  },
  {
    firstName: 'Nadège',
    lastName: 'Fotso',
    email: 'nadege.fotso@example.test',
    city: 'Yaoundé',
    country: 'Cameroun',
    bio: 'Responsable logistique et approvisionnement, 10 ans en distribution.',
    skills: ['Logistique', 'ERP'],
    tags: ['Opérations'],
    source: 'manual',
    cv: false,
    notes: [],
  },
  {
    firstName: 'Yannick',
    lastName: 'Meka',
    email: 'yannick.meka@example.test',
    city: 'Douala',
    country: 'Cameroun',
    bio: 'Ingénieur QA, automatisation Playwright et Cypress.',
    skills: ['Playwright', 'Cypress', 'QA'],
    tags: ['QA'],
    source: 'application',
    cv: true,
    notes: ['A déjà travaillé avec nous sur une mission freelance.'],
    position: 'Ingénieur QA',
    company: 'ScaleUp SAS',
  },
]

export interface SeedResult {
  message: string
}

/**
 * Jeu de démonstration : une organisation Pro, deux offres, des profils au
 * vivier issus de candidatures et de saisies manuelles, un profil retiré.
 */
export async function seedTalentPoolDemo(options: { reset?: boolean } = {}): Promise<SeedResult> {
  const existing = await Organization.query().where('slug', SLUG).first()

  if (existing && !options.reset) {
    return { message: 'Organisation de démo déjà présente — rien à faire.' }
  }

  if (existing) {
    await purgeDemoOrganization(existing.id)
  }

  const plan = await Plan.query().where('slug', 'pro').firstOrFail()

  const organization = await Organization.create({
    name: 'KoraHire Démo',
    slug: SLUG,
    email: 'demo@korahire.test',
    city: 'Douala',
    country: 'Cameroun',
    industry: 'Services numériques',
    size: '10-50',
    planId: plan.id,
    planExpiresAt: DateTime.now().plus({ days: 30 }),
  })

  const owner = await User.create({
    organizationId: organization.id,
    email: 'demo@korahire.test',
    password: 'DemoKoraHire2026!',
    role: 'owner',
    firstName: 'Demo',
    lastName: 'Recruteur',
  })

  const job = await Job.create({
    organizationId: organization.id,
    createdBy: owner.id,
    title: 'Développeur Go senior',
    slug: 'developpeur-go-senior',
    description: "Vous rejoignez l'équipe plateforme et sunghez les services de paiement.",
    requirements: '5 ans en Go, expérience PostgreSQL.',
    location: 'Douala',
    city: 'Douala',
    country: 'Cameroun',
    employmentType: 'full_time',
    workplaceType: 'hybrid',
    experienceLevel: 'confirmé',
    headcount: 1,
    status: 'published',
    publishedAt: DateTime.now().minus({ days: 20 }),
  })

  const secondJob = await Job.create({
    organizationId: organization.id,
    createdBy: owner.id,
    title: 'Lead DevOps',
    slug: 'lead-devops',
    description: "Vous pilotez l'infrastructure et la fiabilité de la plateforme.",
    requirements: 'Terraform, Kubernetes, expérience multi-tenant.',
    location: 'Dakar',
    city: 'Dakar',
    country: 'Sénégal',
    employmentType: 'full_time',
    workplaceType: 'remote',
    experienceLevel: 'confirmé',
    headcount: 1,
    status: 'published',
    publishedAt: DateTime.now().minus({ days: 10 }),
  })

  const tags = new Map<string, Tag>()
  for (const name of new Set(PEOPLE.flatMap((person) => person.tags))) {
    tags.set(name, await Tag.create({ organizationId: organization.id, name }))
  }

  const skills = new Map<string, Skill>()

  for (const person of PEOPLE) {
    const candidate = await Candidate.create({
      email: person.email,
      firstName: person.firstName,
      lastName: person.lastName,
      city: person.city,
      country: person.country,
      bio: person.bio,
    })

    for (const name of person.skills) {
      if (!skills.has(name)) {
        const slug = name.toLowerCase().replace(/\s+/g, '-')
        const existing = await Skill.query().where('slug', slug).first()
        skills.set(name, existing ?? (await Skill.create({ name, slug })))
      }
      await CandidateSkill.create({
        candidateId: candidate.id,
        skillId: skills.get(name)!.id,
      })
    }

    let application: Application | null = null

    if (person.source === 'application') {
      application = await Application.create({
        jobId: job.id,
        candidateId: candidate.id,
        status: 'screening',
        source: 'career_page',
        appliedAt: DateTime.now().minus({ days: 10 + PEOPLE.indexOf(person) * 3 }),
      })

      if (person.cv) {
        await CandidateDocument.create({
          candidateId: candidate.id,
          applicationId: application.id,
          type: 'cv',
          name: `cv-${person.lastName.toLowerCase()}.pdf`,
          filePath: `cvs/demo-${person.lastName.toLowerCase()}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 180_000,
        })
      }

      if (person.position) {
        await CandidateExperience.create({
          candidateId: candidate.id,
          applicationId: application.id,
          position: person.position,
          company: person.company ?? null,
          isCurrent: false,
          startDate: DateTime.now().minus({ years: 3 }),
          endDate: DateTime.now().minus({ months: 6 }),
        })
      }

      await CandidateEducation.create({
        candidateId: candidate.id,
        applicationId: application.id,
        degree: 'Master',
        fieldOfStudy: 'Informatique',
        institution: 'Université',
        startDate: DateTime.now().minus({ years: 7 }),
        endDate: DateTime.now().minus({ years: 5 }),
      })
    }

    const entry = await TalentPoolEntry.create({
      organizationId: organization.id,
      candidateId: candidate.id,
      addedBy: owner.id,
      source: person.source,
      sourceApplicationId: application?.id ?? null,
      status: 'active',
      legalBasis: 'consent',
      consentAt: DateTime.now().minus({ days: 12 }),
      retentionExpiresAt: DateTime.now().plus({ months: 24 }),
    })

    for (const name of person.tags) {
      await TalentPoolTag.create({ talentPoolEntryId: entry.id, tagId: tags.get(name)!.id })
    }

    for (const content of person.notes) {
      await TalentPoolNote.create({
        talentPoolEntryId: entry.id,
        authorId: owner.id,
        content,
      })
    }
  }

  // Un profil retiré : le vivier le sort de la liste sans rien effacer.
  const archivedCandidate = await Candidate.create({
    email: 'yves.bakary@example.test',
    firstName: 'Yves',
    lastName: 'Bakary',
    city: 'Douala',
    country: 'Cameroun',
    bio: 'Profil conservé après une candidature close.',
  })
  const archivedApplication = await Application.create({
    jobId: job.id,
    candidateId: archivedCandidate.id,
    status: 'rejected',
    source: 'career_page',
    appliedAt: DateTime.now().minus({ days: 120 }),
    rejectedAt: DateTime.now().minus({ days: 20 }),
  })
  const archivedEntry = await TalentPoolEntry.create({
    organizationId: organization.id,
    candidateId: archivedCandidate.id,
    addedBy: owner.id,
    source: 'application',
    sourceApplicationId: archivedApplication.id,
    status: 'archived',
    legalBasis: 'consent',
    consentAt: DateTime.now().minus({ days: 90 }),
    retentionExpiresAt: DateTime.now().plus({ months: 24 }),
    archivedAt: DateTime.now().minus({ days: 20 }),
    removalReason: 'Profil trop senior pour le poste pourvu',
  })
  await TalentPoolTag.create({
    talentPoolEntryId: archivedEntry.id,
    tagId: tags.get('Backend')!.id,
  })

  // Une candidature créée depuis le vivier, pour montrer la réutilisation.
  const reused = await Candidate.query().where('email', 'ibrahim.sow@example.test').firstOrFail()
  await Application.create({
    jobId: secondJob.id,
    candidateId: reused.id,
    status: 'new',
    source: 'direct',
    appliedAt: DateTime.now().minus({ days: 2 }),
  })

  const total = await TalentPoolEntry.query().where('organization_id', organization.id).count('* as total')

  return {
    message: [
      `Organisation prête : ${organization.name}`,
      `Connexion : ${owner.email} / DemoKoraHire2026!`,
      `Profils au vivier : ${total ?? 0}`,
    ].join('\n'),
  }
}

/** Supprime toute la cascade de l'organisation de démo avant de la recréer. */
async function purgeDemoOrganization(organizationId: string) {
  const jobIds = (await Job.query().where('organization_id', organizationId).select('id')).map(
    (job) => job.id
  )
  await Application.query().whereIn('job_id', jobIds).delete()
  await Job.query().whereIn('id', jobIds).delete()

  const candidateIds = (
    await Candidate.query().whereHas('talentPoolEntries', (query) =>
      query.where('organization_id', organizationId)
    ).select('id')
  ).map((candidate) => candidate.id)

  await User.query().where('organization_id', organizationId).delete()
  await Organization.query().where('id', organizationId).delete()

  // Les tags de l'organisation partent en cascade, pas les candidats globaux.
  if (candidateIds.length) {
    await Candidate.query().whereIn('id', candidateIds).delete()
  }
}

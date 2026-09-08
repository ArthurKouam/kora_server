import Application from '#models/application'
import Interview from '#models/interview'
import Job from '#models/job'
import JobFormVersion from '#models/job_form_version'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Candidate from '#models/candidate'
import Organization from '#models/organization'
import User from '#models/user'
import ApplicationStatusHistory from '#models/application_status_history'

/**
 * Démo complète : jobs (tous statuts), formulaire publié couvrant les 9 types
 * de champs, candidats, candidatures avec réponses, entretiens.
 *
 * Comptes de test : arthur@acme.test / password123 (owner)
 */
export default class CreateDemoRecruitingDataSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    const organization = await Organization.query().where('slug', 'acme-corp').firstOrFail()
    const owner = await User.findByOrFail('email', 'arthur@acme.test')

    const existingJobs = await Job.query().where('organization_id', organization.id)
    if (existingJobs.length > 0) return

    // ── Jobs : tous les statuts ───────────────────────────────────────────
    const devJob = await Job.create({
      organizationId: organization.id,
      createdBy: owner.id,
      title: 'Développeur Full-Stack',
      slug: 'developpeur-full-stack',
      description:
        "Vous rejoindrez l'équipe produit pour concevoir et développer des fonctionnalités web de bout en bout (Vue.js / AdonisJS).",
      requirements: "3+ ans d'expérience en TypeScript, maîtrise Vue ou React.",
      responsibilities: '- Développement front & back\n- Revue de code\n- Collaboration design',
      benefits: '- Télétravail flexible\n- Matériel fourni\n- Formation continue',
      employmentType: 'full_time',
      workplaceType: 'hybrid',
      experienceLevel: 'senior',
      salaryMin: '45000',
      salaryMax: '60000',
      salaryCurrency: 'EUR',
      status: 'published',
      publishedAt: DateTime.now().minus({ days: 5 }),
      city: 'Paris',
      country: 'France',
    })

    await Job.create({
      organizationId: organization.id,
      createdBy: owner.id,
      title: 'Assistant(e) de direction',
      slug: 'assistant-direction',
      description: 'Support administratif de la direction générale.',
      status: 'draft',
      city: 'Paris',
    })

    await Job.create({
      organizationId: organization.id,
      createdBy: owner.id,
      title: 'Chargé(e) de recrutement',
      slug: 'charge-recrutement',
      description: 'Gestion du processus de recrutement de bout en bout.',
      employmentType: 'full_time',
      workplaceType: 'onsite',
      status: 'paused',
      publishedAt: DateTime.now().minus({ days: 20 }),
      city: 'Lyon',
    })

    await Job.create({
      organizationId: organization.id,
      createdBy: owner.id,
      title: 'Data Analyst (stage)',
      slug: 'data-analyst-stage',
      description: 'Analyse des données produit.',
      employmentType: 'internship',
      workplaceType: 'remote',
      status: 'closed',
      publishedAt: DateTime.now().minus({ days: 40 }),
      closingDate: DateTime.now().minus({ days: 5 }),
      city: 'Paris',
    })

    // ── Formulaire publié : les 9 types de champs V1 ─────────────────────
    const definition = {
      fields: [
        {
          id: 'f_textdemo00001',
          type: 'text',
          label: 'Ville actuelle',
          required: true,
          placeholder: 'Ex : Nantes',
          help: null as string | null,
          config: { maxLength: 200 },
        },
        {
          id: 'f_txtadem000002',
          type: 'textarea',
          label: 'Pourquoi ce poste ?',
          required: true,
          placeholder: null,
          help: 'Quelques lignes suffisent.',
          config: { maxLength: 5000 },
        },
        {
          id: 'f_maildem00003',
          type: 'email',
          label: 'Email secondaire',
          required: false,
          placeholder: null,
          help: null as string | null,
          config: {},
        },
        {
          id: 'f_numbdem00004',
          type: 'number',
          label: "Années d'expérience",
          required: true,
          placeholder: null,
          help: null as string | null,
          config: { min: 0, max: 50, integer: true },
        },
        {
          id: 'f_seldem000005',
          type: 'select',
          label: "Niveau d'étude",
          required: true,
          placeholder: null,
          help: null as string | null,
          config: {
            options: [
              { value: 'bac', label: 'Bac' },
              { value: 'bac2', label: 'Bac+2' },
              { value: 'bac5', label: 'Bac+5' },
            ],
          },
        },
        {
          id: 'f_msdem0000006',
          type: 'multiselect',
          label: 'Langues parlées',
          required: false,
          placeholder: null,
          help: null as string | null,
          config: {
            options: [
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'Anglais' },
              { value: 'es', label: 'Espagnol' },
            ],
            minSelections: undefined,
            maxSelections: undefined,
          },
        },
        {
          id: 'f_rdiodem00007',
          type: 'radio',
          label: 'Mobilité',
          required: true,
          placeholder: null,
          help: null as string | null,
          config: {
            options: [
              { value: 'sur_place', label: 'Sur place' },
              { value: 'hybride', label: 'Hybride' },
              { value: 'teletravail', label: 'Télétravail complet' },
            ],
          },
        },
        {
          id: 'f_datedem00008',
          type: 'date',
          label: 'Disponible à partir du',
          required: false,
          placeholder: null,
          help: null as string | null,
          config: {},
        },
        {
          id: 'f_filedem00009',
          type: 'file',
          label: 'Portfolio (facultatif)',
          required: false,
          placeholder: null,
          help: 'PDF uniquement.',
          config: { accept: ['application/pdf'] },
        },
      ],
    }

    const formVersion = await JobFormVersion.create({
      jobId: devJob.id,
      version: 1,
      definition: definition as any,
      publishedAt: DateTime.now().minus({ days: 5 }),
      createdBy: owner.id,
    })

    devJob.activeFormVersionId = formVersion.id
    await devJob.save()

    // ── Candidats + candidatures avec réponses réelles sur tous les types ─
    const candidatesData = [
      {
        email: 'marie.dupont@exemple.test',
        firstName: 'Marie',
        lastName: 'Dupont',
        phone: '0612345678',
        city: 'Nantes',
        answers: {
          f_textdemo00001: 'Nantes',
          f_txtadem000002:
            'Passionnée par le web depuis 6 ans, je souhaite rejoindre une équipe produit ambitieuse.',
          f_maildem00003: 'marie.perso@exemple.test',
          f_numbdem00004: 6,
          f_seldem000005: 'bac5',
          f_msdem0000006: ['fr', 'en'],
          f_rdiodem00007: 'hybride',
          f_datedem00008: '2027-01-15',
        },
        status: 'interview' as const,
      },
      {
        email: 'paul.martin@exemple.test',
        firstName: 'Paul',
        lastName: 'Martin',
        phone: null as string | null,
        city: 'Paris',
        answers: {
          f_textdemo00001: 'Paris',
          f_txtadem000002: 'Développeur back orienté qualité et tests.',
          f_maildem00003: null as string | null,
          f_numbdem00004: 3,
          f_seldem000005: 'bac2',
          f_msdem0000006: ['fr'],
          f_rdiodem00007: 'sur_place',
          f_datedem00008: null as string | null,
        },
        status: 'rejected' as const,
      },
      {
        email: 'lea.bernard@exemple.test',
        firstName: 'Léa',
        lastName: 'Bernard',
        phone: '0698765432',
        city: 'Bordeaux',
        answers: {
          f_textdemo00001: 'Bordeaux',
          f_txtadem000002: 'Full-stack junior très motivée, autodidacte et curieuse.',
          f_maildem00003: 'lea.b@exemple.test',
          f_numbdem00004: 1,
          f_seldem000005: 'bac2',
          f_msdem0000006: ['fr', 'en', 'es'],
          f_rdiodem00007: 'teletravail',
          f_datedem00008: '2026-11-01',
        },
        status: 'new' as const,
      },
      {
        email: 'hugo.petit@exemple.test',
        firstName: 'Hugo',
        lastName: 'Petit',
        phone: null as string | null,
        city: 'Lille',
        answers: {
          f_textdemo00001: 'Lille',
          f_txtadem000002: "Tech lead freelance, 8 ans d'expérience.",
          f_maildem00003: null as string | null,
          f_numbdem00004: 8,
          f_seldem000005: 'bac5',
          f_msdem0000006: ['fr', 'en'],
          f_rdiodem00007: 'teletravail',
          f_datedem00008: '2026-12-01',
        },
        status: 'hired' as const,
      },
    ]

    for (const [index, data] of candidatesData.entries()) {
      const candidate = await Candidate.create({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        city: data.city,
        country: 'France',
      })

      const appliedDaysAgo = index * 4 + 1

      const application = await Application.create({
        jobId: devJob.id,
        candidateId: candidate.id,
        status: data.status,
        source: ['career_page', 'linkedin', 'referral', 'direct'][index % 4],
        coverLetter:
          index % 2 === 0
            ? `Bonjour, je suis ${data.firstName} et je vous adresse ma candidature avec enthousiasme.`
            : null,
        appliedAt: DateTime.now().minus({ days: appliedDaysAgo }),
        rejectedAt: data.status === 'rejected' ? DateTime.now().minus({ days: 1 }) : null,
        hiredAt: data.status === 'hired' ? DateTime.now() : null,
        formVersionId: formVersion.id,
        answers: data.answers,
      })

      // Historique de statut cohérent (from_status est NOT NULL)
      if (data.status !== 'new') {
        await ApplicationStatusHistory.create({
          applicationId: application.id,
          fromStatus: 'new',
          toStatus: data.status,
          changedByType: 'user',
          changedByUserId: owner.id,
          createdAt: DateTime.now().minus({ days: Math.max(0, appliedDaysAgo - 1) }),
        })
      }

      // Entretien pour Marie, assigné à l'interviewer de démo
      if (data.status === 'interview') {
        const interviewer = await User.findByOrFail('email', 'marc@acme.test')
        await Interview.create({
          applicationId: application.id,
          createdBy: owner.id,
          assignedTo: interviewer.id,
          scheduledAt: DateTime.now().plus({ days: 2, hours: 10 }),
          duration: 60,
          type: 'video',
          meetingUrl: 'https://meet.exemple.test/demo-entretien',
          status: 'scheduled',
        })
      }
    }
  }
}

// imports placés après pour lisibilité — ESM hoiste les modules

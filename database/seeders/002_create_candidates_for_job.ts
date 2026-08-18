import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Job from '#models/job'
import Candidate from '#models/candidate'
import Application from '#models/application'
import Organization from '#models/organization'
import { DateTime } from 'luxon'

const JOB_ID = 'ba294c0c-af08-4f69-a26c-a2e4dd85abe5'

const candidatesData = [
  {
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie.dupont@email.com',
    phone: '+33123456789',
    city: 'Paris',
    country: 'France',
    bio: 'Assistante de direction expérimentée avec 5 ans d\'expérience dans la gestion administrative.',
    dateOfBirth: DateTime.fromISO('1990-05-15'),
  },
  {
    firstName: 'Jean',
    lastName: 'Martin',
    email: 'jean.martin@email.com',
    phone: '+33198765432',
    city: 'Lyon',
    country: 'France',
    bio: 'Organisé et rigoureux, j\'ai travaillé comme assistant pendant 3 ans dans une PME.',
    dateOfBirth: DateTime.fromISO('1988-11-20'),
  },
  {
    firstName: 'Sophie',
    lastName: 'Bernard',
    email: 'sophie.bernard@email.com',
    phone: '+33145678901',
    city: 'Marseille',
    country: 'France',
    bio: 'Diplômée en gestion administrative, je recherche un poste d\'assistante de direction.',
    dateOfBirth: DateTime.fromISO('1992-03-10'),
  },
  {
    firstName: 'Pierre',
    lastName: 'Durand',
    email: 'pierre.durand@email.com',
    phone: '+33123789456',
    city: 'Toulouse',
    country: 'France',
    bio: 'Polyvalent avec une excellente maîtrise des outils bureautiques.',
    dateOfBirth: DateTime.fromISO('1985-07-30'),
  },
  {
    firstName: 'Claire',
    lastName: 'Lefevre',
    email: 'claire.lefevre@email.com',
    phone: '+33165498732',
    city: 'Bordeaux',
    country: 'France',
    bio: 'Assistante de direction bilingue (anglais/français) avec expérience internationale.',
    dateOfBirth: DateTime.fromISO('1991-09-18'),
  },
]

export default class extends BaseSeeder {
  static environment = ['development', 'testing', 'production']

  async run() {
    // Vérifier que le job existe
    const job = await Job.query()
      .where('id', JOB_ID)
      .andWhere('title', 'Assistante de direction')
      .first()

    if (!job) {
      console.log(`Job with ID ${JOB_ID} and title "Assistante de direction" not found. Skipping candidate creation.`)
      return
    }

    // Vérifier que l'organisation Acme Corp existe
    const organization = await Organization.query()
      .where('name', 'Acme Corp')
      .orWhere('slug', 'acme-corp')
      .first()

    if (!organization) {
      console.log('Acme Corp organization not found. Skipping candidate creation.')
      return
    }

    // Créer les candidats et leurs candidatures
    for (const candidateData of candidatesData) {
      // Vérifier si le candidat existe déjà
      const existingCandidate = await Candidate.query()
        .where('email', candidateData.email)
        .first()

      let candidate: Candidate

      if (existingCandidate) {
        candidate = existingCandidate
        console.log(`Candidate ${candidateData.email} already exists. Using existing record.`)
      } else {
        candidate = await Candidate.create(candidateData)
        console.log(`Created candidate: ${candidateData.firstName} ${candidateData.lastName}`)
      }

      // Vérifier si la candidature existe déjà pour ce job et ce candidat
      const existingApplication = await Application.query()
        .where('job_id', JOB_ID)
        .andWhere('candidate_id', candidate.id)
        .first()

      if (!existingApplication) {
        await Application.create({
          jobId: JOB_ID,
          candidateId: candidate.id,
          status: 'new',
          source: 'career_page',
          appliedAt: DateTime.now(),
          coverLetter: `Je suis intéressé(e) par le poste d'Assistante de direction chez ${organization.name}.`,
        })
        console.log(`Created application for ${candidateData.firstName} ${candidateData.lastName} to job ${JOB_ID}`)
      } else {
        console.log(`Application already exists for ${candidateData.firstName} ${candidateData.lastName} to job ${JOB_ID}`)
      }
    }

    console.log('Candidates and applications for Assistante de direction job created successfully!')
  }
}

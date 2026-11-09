import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * ─────────────────────────────────────────────────────────────────────
 * Phase 2 — le dossier candidat devient propre à une organisation.
 *
 * Avant : `candidates` était une fiche globale, unique par email. Un candidat
 * qui postulait chez deux entreprises exposait la même fiche aux deux.
 *
 * Après : une ligne `candidates` par couple (organisation, email). Les
 * candidatures restent dans `applications`, une par offre. Les documents,
 * expériences et formations déjà rattachés à une candidature suivent leur
 * organisation ; ceux qui étaient partagés (application_id NULL) sont dupliqués
 * pour que chaque organisation conserve un dossier complet.
 *
 * Aucune donnée métier n'est perdue : les fiches sans candidature ni entrée de
 * vivier (artefacts de tests) sont les seules supprimées.
 * ─────────────────────────────────────────────────────────────────────
 */
export default class extends BaseSchema {
  async up() {
    // 1. Colonnes ajoutées en NULLABLE le temps du backfill.
    this.schema.alterTable('candidates', (table) => {
      table.uuid('organization_id').nullable()
      table.uuid('job_seeker_id').nullable()
      table.string('source', 24).notNullable().defaultTo('career_page')
      table.jsonb('profile_snapshot').nullable()

      // L'unicité globale de l'email empêche deux organisations d'avoir leur
      // propre dossier pour la même personne.
      table.dropUnique(['email'])
    })

    // 2. Backfill par organisation.
    this.defer(async (db) => {
      const candidates = await db.from('candidates').select('*')

      for (const candidate of candidates) {
        const orgRows = await db.rawQuery(
          `SELECT DISTINCT j.organization_id AS organization_id
             FROM applications a
             INNER JOIN jobs j ON j.id = a.job_id
            WHERE a.candidate_id = ?
            UNION
           SELECT organization_id
             FROM talent_pool_entries
            WHERE candidate_id = ?`,
          [candidate.id, candidate.id]
        )
        const organizationIds: string[] = orgRows.rows.map(
          (row: { organization_id: string }) => row.organization_id
        )

        // Aucun lien avec une organisation : artefact de test ou fiche
        // orpheline. Le dossier n'a plus de propriétaire.
        if (organizationIds.length === 0) {
          await db.from('candidates').where('id', candidate.id).delete()
          continue
        }

        const replacements = new Map<string, string>()

        for (const organizationId of organizationIds) {
          const hasApplication = await db.rawQuery(
            `SELECT 1
               FROM applications a
               INNER JOIN jobs j ON j.id = a.job_id
              WHERE a.candidate_id = ? AND j.organization_id = ?
              LIMIT 1`,
            [candidate.id, organizationId]
          )
          const inTalentPool = await db.rawQuery(
            `SELECT 1 FROM talent_pool_entries
              WHERE candidate_id = ? AND organization_id = ?
              LIMIT 1`,
            [candidate.id, organizationId]
          )

          const inserted = await db
            .insertQuery()
            .table('candidates')
            .insert({
              email: candidate.email,
              first_name: candidate.first_name,
              last_name: candidate.last_name,
              phone: candidate.phone,
              avatar_url: candidate.avatar_url,
              date_of_birth: candidate.date_of_birth,
              location: candidate.location,
              city: candidate.city,
              country: candidate.country,
              bio: candidate.bio,
              linkedin_url: candidate.linkedin_url,
              github_url: candidate.github_url,
              portfolio_url: candidate.portfolio_url,
              website_url: candidate.website_url,
              organization_id: organizationId,
              job_seeker_id: null,
              source: hasApplication.rows.length > 0
                ? 'career_page'
                : inTalentPool.rows.length > 0
                  ? 'manual'
                  : 'career_page',
              profile_snapshot: null,
              created_at: candidate.created_at,
              updated_at: candidate.updated_at,
            })
            .returning('id')

          const row = inserted[0] as { id: string } | string | undefined
          const newId = typeof row === 'string' ? row : row?.id
          if (!newId) throw new Error('Candidate backfill failed to return an id')

          replacements.set(organizationId, newId)
        }

        // Candidatures : chaque candidature rejoint le dossier de SON
        // organisation. La contrainte (job_id, candidate_id) reste valide.
        const applications = await db.rawQuery(
          `SELECT a.id AS id, j.organization_id AS organization_id
             FROM applications a
             INNER JOIN jobs j ON j.id = a.job_id
            WHERE a.candidate_id = ?`,
          [candidate.id]
        )
        for (const application of applications.rows) {
          await db
            .from('applications')
            .where('id', application.id)
            .update({ candidate_id: replacements.get(application.organization_id) })
        }

        // Candidatures en attente de vérification OTP.
        const pending = await db.rawQuery(
          `SELECT p.id AS id, j.organization_id AS organization_id
             FROM pending_applications p
             INNER JOIN jobs j ON j.id = p.job_id
            WHERE p.candidate_id = ?`,
          [candidate.id]
        )
        for (const row of pending.rows) {
          await db
            .from('pending_applications')
            .where('id', row.id)
            .update({ candidate_id: replacements.get(row.organization_id) ?? null })
        }

        // Historique : le candidat acteur est rattaché à l'organisation de la
        // candidature concernée.
        const history = await db.rawQuery(
          `SELECT h.id AS id, j.organization_id AS organization_id
             FROM application_status_history h
             INNER JOIN applications a ON a.id = h.application_id
             INNER JOIN jobs j ON j.id = a.job_id
            WHERE h.changed_by_candidate_id = ?`,
          [candidate.id]
        )
        for (const row of history.rows) {
          await db
            .from('application_status_history')
            .where('id', row.id)
            .update({ changed_by_candidate_id: replacements.get(row.organization_id) })
        }

        // Emails : on conserve le lien quand l'organisation est identifiable.
        const emails = await db.rawQuery(
          `SELECT e.id AS id, j.organization_id AS organization_id
             FROM emails e
             INNER JOIN applications a ON a.id = e.application_id
             INNER JOIN jobs j ON j.id = a.job_id
            WHERE e.candidate_id = ?`,
          [candidate.id]
        )
        for (const row of emails.rows) {
          await db
            .from('emails')
            .where('id', row.id)
            .update({ candidate_id: replacements.get(row.organization_id) })
        }

        // Vivier : l'entrée pointe vers le dossier de son organisation.
        const poolEntries = await db
          .from('talent_pool_entries')
          .where('candidate_id', candidate.id)
          .select('id', 'organization_id')
        for (const entry of poolEntries) {
          await db
            .from('talent_pool_entries')
            .where('id', entry.id)
            .update({ candidate_id: replacements.get(entry.organization_id) })
        }

        // Documents, expériences et formations.
        await this.reassignChildRows(db, candidate.id, replacements, 'candidate_documents')
        await this.reassignChildRows(db, candidate.id, replacements, 'candidate_experiences')
        await this.reassignChildRows(db, candidate.id, replacements, 'candidate_educations')

        // Compétences : duplication par organisation (pas de application_id).
        const skills = await db
          .from('candidate_skills')
          .where('candidate_id', candidate.id)
          .select('*')
        const organizationIdsWithSkillRow = [...replacements.keys()]
        for (let index = 0; index < organizationIdsWithSkillRow.length; index++) {
          const newCandidateId = replacements.get(organizationIdsWithSkillRow[index])!
          if (index === 0) {
            await db
              .from('candidate_skills')
              .where('candidate_id', candidate.id)
              .update({ candidate_id: newCandidateId })
            continue
          }
          for (const skill of skills) {
            await db.insertQuery().table('candidate_skills').insert({
              candidate_id: newCandidateId,
              skill_id: skill.skill_id,
              level: skill.level,
              years_of_experience: skill.years_of_experience,
              created_at: skill.created_at,
              updated_at: skill.updated_at,
            })
          }
        }

        // Tous les enfants ont été re-pointés : la fiche globale peut partir.
        await db.from('candidates').where('id', candidate.id).delete()
      }
    })

    // 3. Contraintes finales.
    this.defer(async (db) => {
      await db.rawQuery('ALTER TABLE candidates ALTER COLUMN organization_id SET NOT NULL')
      await db.rawQuery(
        'ALTER TABLE candidates ADD CONSTRAINT candidates_organization_id_foreign FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE'
      )
      await db.rawQuery(
        'ALTER TABLE candidates ADD CONSTRAINT candidates_job_seeker_id_foreign FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id) ON DELETE SET NULL'
      )
      await db.rawQuery(
        'CREATE UNIQUE INDEX candidates_organization_id_email_unique ON candidates (organization_id, lower(email))'
      )
      await db.rawQuery(
        'CREATE INDEX candidates_organization_id_index ON candidates (organization_id)'
      )

      // Le portail candidat est une source de candidature distincte.
      await db.rawQuery('ALTER TABLE applications DROP CONSTRAINT applications_source_check')
      await db.rawQuery(
        `ALTER TABLE applications ADD CONSTRAINT applications_source_check
           CHECK (source = ANY (ARRAY['career_page','portal','linkedin','indeed','referral','direct','other']::text[]))`
      )
    })
  }

  /**
   * Repointe les lignes rattachées à une candidature vers le dossier de
   * l'organisation de cette candidature. Les lignes sans `application_id`
   * (profil partagé) sont dupliquées pour chaque organisation.
   */
  private async reassignChildRows(
    db: any,
    candidateId: string,
    replacements: Map<string, string>,
    table: 'candidate_documents' | 'candidate_experiences' | 'candidate_educations'
  ) {
    const rows = await db.from(table).where('candidate_id', candidateId).select('*')
    const organizationIds = [...replacements.keys()]

    for (const row of rows) {
      if (row.application_id) {
        const application = await db.rawQuery(
          `SELECT j.organization_id AS organization_id
             FROM applications a
             INNER JOIN jobs j ON j.id = a.job_id
            WHERE a.id = ?`,
          [row.application_id]
        )
        const organizationId: string | undefined = application.rows[0]?.organization_id
        const target = organizationId ? replacements.get(organizationId) : undefined
        await db
          .from(table)
          .where('id', row.id)
          .update({ candidate_id: target ?? replacements.get(organizationIds[0]) })
        continue
      }

      for (let index = 0; index < organizationIds.length; index++) {
        const newCandidateId = replacements.get(organizationIds[index])!
        if (index === 0) {
          await db.from(table).where('id', row.id).update({ candidate_id: newCandidateId })
          continue
        }

        const copy: Record<string, unknown> = { ...row, candidate_id: newCandidateId }
        delete copy.id
        await db.insertQuery().table(table).insert(copy)
      }
    }
  }

  async down() {
    /**
     * Fusion inverse : on conserve la fiche la plus ancienne par email et on
     * rattache les doublons. Les candidatures en conflit (même offre) sont
     * supprimées, cas qui n'existe qu'en développement.
     */
    this.defer(async (db) => {
      const groups = await db.rawQuery(
        `SELECT lower(email) AS email, array_agg(id ORDER BY created_at) AS ids
           FROM candidates
          GROUP BY lower(email)
         HAVING count(*) > 1`
      )

      for (const group of groups.rows) {
        const ids: string[] = group.ids
        const [keep, ...duplicates] = ids

        for (const duplicate of duplicates) {
          await db.rawQuery(
            `UPDATE applications a SET candidate_id = ?
              WHERE a.candidate_id = ?
                AND NOT EXISTS (
                  SELECT 1 FROM applications b
                   WHERE b.job_id = a.job_id AND b.candidate_id = ?
                )`,
            [keep, duplicate, keep]
          )
          await db.from('applications').where('candidate_id', duplicate).delete()

          for (const table of ['candidate_documents', 'candidate_experiences', 'candidate_educations', 'candidate_skills']) {
            await db.from(table).where('candidate_id', duplicate).update({ candidate_id: keep })
          }
          await db
            .from('talent_pool_entries')
            .where('candidate_id', duplicate)
            .update({ candidate_id: keep })
          await db.from('candidates').where('id', duplicate).delete()
        }
      }

      await db.rawQuery('DROP INDEX IF EXISTS candidates_organization_id_email_unique')
      await db.rawQuery('DROP INDEX IF EXISTS candidates_organization_id_index')
      await db.rawQuery(
        'ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_job_seeker_id_foreign'
      )
      await db.rawQuery(
        'ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_organization_id_foreign'
      )
      await db.rawQuery('ALTER TABLE applications DROP CONSTRAINT applications_source_check')
      await db.rawQuery(
        `ALTER TABLE applications ADD CONSTRAINT applications_source_check
           CHECK (source = ANY (ARRAY['career_page','linkedin','indeed','referral','direct','other']::text[]))`
      )
    })

    this.schema.alterTable('candidates', (table) => {
      table.dropColumn('organization_id')
      table.dropColumn('job_seeker_id')
      table.dropColumn('source')
      table.dropColumn('profile_snapshot')
      table.unique(['email'])
    })
  }
}

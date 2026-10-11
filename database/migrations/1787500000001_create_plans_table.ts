import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Les plans sont des données, pas du code : un commercial doit pouvoir les
 * modifier sans redéploiement. Les quotas restent en colonnes (ils sont lus à
 * chaque création de poste ou d'invitation), les capacités incidentelles en
 * jsonb — beaucoup sont encore « à définir » et le resteront un moment.
 */
export default class extends BaseSchema {
  protected tableName = 'plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable().defaultTo(this.raw('gen_random_uuid()'))
      table.string('slug', 40).notNullable().unique()
      table.string('name').notNullable()
      table.text('description').nullable()

      // null = illimité ou non applicable (enterprise est sur devis)
      table.integer('price_xaf').nullable()
      table.integer('duration_days').notNullable().defaultTo(30)
      table.integer('max_active_jobs').nullable()
      table.integer('max_members').nullable()

      table.jsonb('features').notNullable().defaultTo('{}')
      table.boolean('is_public').notNullable().defaultTo(true)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.string('contact_email').nullable()
      table.integer('sort_order').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['is_active', 'sort_order'])
    })

    /**
     * Contenu aligné sur la grille commerciale validée.
     *
     * `defined: false` = la capacité n'existe pas encore dans le produit.
     * Le frontend affiche « à définir » plutôt que d'annoncer une
     * fonctionnalité absente.
     *
     * Le seed passe par `defer` : la migration tourne dans une transaction,
     * et `this.db` ouvrirait une connexion séparée qui ne voit pas la table
     * encore non commitée (« relation "plans" does not exist »).
     */
    this.defer(async () => {
      await this.db.table(this.tableName).insert([
      {
        created_at: new Date(),
        slug: 'plus',
        name: 'Plus',
        description: 'Pour les PME qui recrutent activement.',
        price_xaf: 8000,
        duration_days: 30,
        max_active_jobs: 5,
        max_members: 3,
        is_public: true,
        sort_order: 1,
        features: JSON.stringify({
          endToEndRecruitment: { label: 'Recrutement de bout en bout', defined: true },
          customForms: { label: 'Formulaires personnalisés', defined: true },
          interviews: { label: 'Gestion standard', defined: true },
          interviewTools: { label: 'Outils avancés', defined: false },
          candidateHistory: { label: 'Candidats et historique', defined: true },
          reports: { label: 'Essentiels', defined: true },
          cvParsing: { label: 'Parsing des CV', defined: false },
          permissions: { label: 'Standard', defined: true },
          audit: { label: 'Permissions et audit', defined: true },
          api: { label: 'API et intégrations', defined: false },
          support: { label: 'Standard', defined: true },
          prioritySupport: { label: 'Support prioritaire', defined: false },
          contractSupport: { label: 'Support contractuel', defined: false },
          sla: { label: 'SLA', defined: false },
        }),
      },
      {
        created_at: new Date(),
        slug: 'pro',
        name: 'Pro',
        description: 'Pour les équipes qui recrutent toute l’année.',
        price_xaf: 20000,
        duration_days: 30,
        max_active_jobs: 20,
        max_members: 10,
        is_public: true,
        sort_order: 2,
        features: JSON.stringify({
          endToEndRecruitment: { label: 'Recrutement de bout en bout', defined: true },
          customForms: { label: 'Formulaires personnalisés', defined: true },
          interviews: { label: 'Gestion standard', defined: true },
          interviewTools: { label: 'Outils avancés', defined: true },
          candidateHistory: { label: 'Candidats et historique', defined: true },
          reports: { label: 'Avancés', defined: true },
          cvParsing: { label: 'Parsing des CV', defined: false },
          permissions: { label: 'Renforcés si disponibles', defined: false },
          audit: { label: 'Permissions et audit', defined: true },
          api: { label: 'API et intégrations', defined: false },
          support: { label: 'Prioritaire', defined: true },
          prioritySupport: { label: 'Support prioritaire', defined: true },
          contractSupport: { label: 'Support contractuel', defined: false },
          sla: { label: 'SLA', defined: false },
        }),
      },
      {
        created_at: new Date(),
        slug: 'enterprise',
        name: 'Enterprise',
        description: 'Pour les organisations multi-entités. Tarification sur devis.',
        price_xaf: null,
        duration_days: 30,
        max_active_jobs: null,
        max_members: null,
        is_public: false,
        contact_email: 'contact@korahire.com',
        sort_order: 3,
        features: JSON.stringify({
          endToEndRecruitment: { label: 'Recrutement de bout en bout', defined: true },
          customForms: { label: 'Formulaires personnalisés', defined: true },
          interviews: { label: 'Gestion standard', defined: true },
          interviewTools: { label: 'Outils avancés', defined: true },
          candidateHistory: { label: 'Candidats et historique', defined: true },
          reports: { label: 'Personnalisés', defined: true },
          cvParsing: { label: 'Parsing des CV', defined: true },
          permissions: { label: 'Renforcés si disponibles', defined: true },
          audit: { label: 'Permissions et audit', defined: true },
          api: { label: 'API et intégrations', defined: true },
          support: { label: 'Contractuel', defined: true },
          prioritySupport: { label: 'Support contractuel', defined: true },
          sla: { label: 'SLA', defined: true },
        }),
      },
      ])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}